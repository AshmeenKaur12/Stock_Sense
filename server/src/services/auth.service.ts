import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { sendMail } from '../config/mailer';
import { logger } from '../config/logger';
import { Otp } from '../models/Otp';
import { RefreshToken } from '../models/RefreshToken';
import { User, toPublicUser, type Role } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { durationMs, hashSecret, randomOtp, randomToken, safeEqual } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';

export const BCRYPT_ROUNDS = 12;
export const INVALID_LOGIN = 'Invalid Login Id or Password';

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_RESEND_COOLDOWN_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 15 * 60_000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= bcrypt.hash(randomToken(12), BCRYPT_ROUNDS));

// ── Availability checks ────────────────────────────────────────────────────

export async function isLoginIdAvailable(loginId: string) {
  return !(await User.exists({ loginId: loginId.toLowerCase() }));
}

export async function isEmailAvailable(email: string) {
  return !(await User.exists({ email: email.toLowerCase() }));
}

// ── Sign up / login ────────────────────────────────────────────────────────

export async function signup(input: { loginId: string; email: string; password: string; name?: string }, role: Role = 'staff') {
  const [loginFree, emailFree] = await Promise.all([isLoginIdAvailable(input.loginId), isEmailAvailable(input.email)]);
  const errors = [
    ...(loginFree ? [] : [{ field: 'loginId', message: 'Login ID already exists' }]),
    ...(emailFree ? [] : [{ field: 'email', message: 'Email is already registered' }]),
  ];
  if (errors.length) throw ApiError.conflict(errors.map((e) => e.message).join('. '), errors);

  const user = await User.create({
    loginId: input.loginId,
    email: input.email,
    name: input.name?.trim() || input.loginId,
    passwordHash: await hashPassword(input.password),
    role,
  });
  return toPublicUser(user);
}

async function issueTokens(userId: string, role: Role, family = randomToken(16)): Promise<SessionTokens> {
  const refreshToken = randomToken();
  await RefreshToken.create({
    user: userId,
    tokenHash: hashSecret(refreshToken),
    family,
    expiresAt: new Date(Date.now() + durationMs(env.REFRESH_TOKEN_TTL)),
  });
  return { accessToken: signAccessToken({ sub: userId, role }), refreshToken };
}

export async function login(loginId: string, password: string) {
  const user = await User.findOne({ loginId: loginId.toLowerCase() }).select('+passwordHash');
  // Always run bcrypt so response time doesn't reveal whether the login id exists.
  const hash = user?.passwordHash ?? (await dummyHash());
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok || !user.isActive) throw ApiError.unauthorized(INVALID_LOGIN);

  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueTokens(String(user._id), user.role);
  return { user: toPublicUser(user), tokens };
}

/**
 * Rotates a refresh token. A token that was already rotated or revoked is treated
 * as stolen: every token in its family is revoked and the caller must log in again.
 */
export async function refresh(presented: string | undefined) {
  if (!presented) throw ApiError.unauthorized('Session expired. Please sign in again.');
  const tokenHash = hashSecret(presented);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record) throw ApiError.unauthorized('Session expired. Please sign in again.');

  if (record.revokedAt) {
    await RefreshToken.updateMany({ family: record.family, revokedAt: null }, { $set: { revokedAt: new Date() } });
    logger.warn({ user: String(record.user) }, 'Refresh token reuse detected — family revoked');
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
  if (record.expiresAt.getTime() <= Date.now()) throw ApiError.unauthorized('Session expired. Please sign in again.');

  const user = await User.findById(record.user);
  if (!user || !user.isActive) throw ApiError.unauthorized('Session expired. Please sign in again.');

  const tokens = await issueTokens(String(user._id), user.role, record.family);
  // Conditional update: if two refreshes race, only one wins; the loser looks like reuse.
  const rotated = await RefreshToken.updateOne(
    { _id: record._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedByHash: hashSecret(tokens.refreshToken) } },
  );
  if (rotated.modifiedCount === 0) {
    await RefreshToken.updateMany({ family: record.family, revokedAt: null }, { $set: { revokedAt: new Date() } });
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
  return { user: toPublicUser(user), tokens };
}

export async function logout(presented: string | undefined) {
  if (!presented) return;
  const record = await RefreshToken.findOne({ tokenHash: hashSecret(presented) });
  if (record) await RefreshToken.updateMany({ family: record.family, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string | Types.ObjectId, exceptFamily?: string) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null, ...(exceptFamily ? { family: { $ne: exceptFamily } } : {}) },
    { $set: { revokedAt: new Date() } },
  );
}

export async function familyOf(presented: string | undefined) {
  if (!presented) return undefined;
  return (await RefreshToken.findOne({ tokenHash: hashSecret(presented) }).select('family').lean())?.family;
}

// ── Forgot password (OTP) ──────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP. Responds identically whether or not the email exists
 * (no account enumeration), but the 60 s cooldown applies either way.
 */
export async function forgotPassword(email: string): Promise<{ cooldownSeconds: number }> {
  const existing = await Otp.findOne({ email });
  if (existing) {
    const wait = existing.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now();
    if (wait > 0) {
      throw new ApiError(429, `Please wait ${Math.ceil(wait / 1000)}s before requesting a new code`, [
        { field: 'cooldown', message: String(Math.ceil(wait / 1000)) },
      ]);
    }
  }

  const user = await User.findOne({ email, isActive: true }).lean();
  const code = randomOtp();
  const now = new Date();
  await Otp.findOneAndUpdate(
    { email },
    {
      $set: {
        codeHash: hashSecret(code),
        attempts: 0,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        lastSentAt: now,
        verifiedAt: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    },
    { upsert: true },
  );

  if (user) {
    await sendMail({
      to: email,
      subject: 'Your StockSense password reset code',
      text: `Your StockSense verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    });
  }
  return { cooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000 };
}

export async function verifyOtp(email: string, code: string): Promise<{ resetToken: string }> {
  const otp = await Otp.findOne({ email });
  if (!otp || otp.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest('This code has expired. Request a new one.', [{ field: 'code', message: 'Code expired' }]);
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.tooMany('Too many incorrect attempts. Request a new code.');
  }
  if (!safeEqual(otp.codeHash, hashSecret(code))) {
    otp.attempts += 1;
    await otp.save();
    const left = OTP_MAX_ATTEMPTS - otp.attempts;
    if (left <= 0) throw ApiError.tooMany('Too many incorrect attempts. Request a new code.');
    throw ApiError.badRequest(`Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`, [{ field: 'code', message: 'Incorrect code' }]);
  }

  const resetToken = randomToken(32);
  otp.verifiedAt = new Date();
  otp.resetTokenHash = hashSecret(resetToken);
  otp.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await otp.save();
  return { resetToken };
}

export async function resetPassword(email: string, resetToken: string, password: string) {
  const otp = await Otp.findOne({ email });
  const valid =
    otp?.resetTokenHash &&
    otp.resetTokenExpiresAt &&
    otp.resetTokenExpiresAt.getTime() > Date.now() &&
    safeEqual(otp.resetTokenHash, hashSecret(resetToken));
  if (!valid) throw ApiError.badRequest('Your reset session has expired. Start again.');

  const user = await User.findOne({ email, isActive: true });
  if (!user) throw ApiError.badRequest('Your reset session has expired. Start again.');

  user.passwordHash = await hashPassword(password);
  await user.save();
  await Otp.deleteOne({ _id: otp._id });
  await revokeAllSessions(user._id);
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw ApiError.unauthorized();
  return toPublicUser(user);
}
