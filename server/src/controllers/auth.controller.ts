import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import * as auth from '../services/auth.service';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../utils/cookies';
import { sendSuccess } from '../utils/response';

const refreshCookie = (req: Request) => req.cookies?.[REFRESH_COOKIE] as string | undefined;

export async function signup(req: Request, res: Response) {
  const user = await auth.signup(req.body);
  sendSuccess(res, { user }, { status: 201, message: 'Account created. You can now sign in.' });
}

export async function login(req: Request, res: Response) {
  const { user, tokens } = await auth.login(req.body.loginId, req.body.password);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  sendSuccess(res, { user }, { message: 'Signed in' });
}

export async function refresh(req: Request, res: Response) {
  try {
    const { user, tokens } = await auth.refresh(refreshCookie(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    sendSuccess(res, { user });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await auth.logout(refreshCookie(req));
  clearAuthCookies(res);
  sendSuccess(res, null, { message: 'Signed out' });
}

export async function me(req: Request, res: Response) {
  sendSuccess(res, { user: await auth.getMe(currentUser(req).id) });
}

export async function checkLoginId(req: Request, res: Response) {
  const loginId = String(req.query.loginId ?? '');
  const valid = /^[a-z0-9._-]{6,12}$/.test(loginId);
  sendSuccess(res, { loginId, valid, available: valid ? await auth.isLoginIdAvailable(loginId) : false });
}

export async function checkEmail(req: Request, res: Response) {
  const email = String(req.query.email ?? '');
  const valid = /^\S+@\S+\.\S+$/.test(email);
  sendSuccess(res, { email, valid, available: valid ? await auth.isEmailAvailable(email) : false });
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await auth.forgotPassword(req.body.email);
  sendSuccess(res, result, { message: 'If an account exists for this email, a 6-digit code has been sent.' });
}

export async function verifyOtp(req: Request, res: Response) {
  const result = await auth.verifyOtp(req.body.email, req.body.code);
  sendSuccess(res, result, { message: 'Code verified' });
}

export async function resetPassword(req: Request, res: Response) {
  await auth.resetPassword(req.body.email, req.body.resetToken, req.body.password);
  clearAuthCookies(res);
  sendSuccess(res, null, { message: 'Password updated. Sign in with your new password.' });
}
