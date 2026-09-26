import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Operation } from '../models/Operation';
import { StockMove } from '../models/StockMove';
import { User, toPublicUser, type Role } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../validators/common';
import { hashPassword, isEmailAvailable, isLoginIdAvailable, revokeAllSessions } from './auth.service';

export async function listUsers(q: { search?: string; role?: Role; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.role) filter.role = q.role;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ loginId: rx }, { email: rx }, { name: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: 1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);
  return { items: items.map(toPublicUser), total };
}

export async function createUser(input: { loginId: string; email: string; name?: string; password: string; role: Role }) {
  const errors = [
    ...((await isLoginIdAvailable(input.loginId)) ? [] : [{ field: 'loginId', message: 'Login ID already exists' }]),
    ...((await isEmailAvailable(input.email)) ? [] : [{ field: 'email', message: 'Email is already registered' }]),
  ];
  if (errors.length) throw ApiError.conflict(errors.map((e) => e.message).join('. '), errors);
  const user = await User.create({
    loginId: input.loginId,
    email: input.email,
    name: input.name || input.loginId,
    role: input.role,
    passwordHash: await hashPassword(input.password),
  });
  return toPublicUser(user);
}

export async function updateUser(actorId: string, id: string, input: { name?: string; email?: string; role?: Role; isActive?: boolean }) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  if (id === actorId && (input.role && input.role !== user.role)) throw ApiError.conflict('You cannot change your own role');
  if (id === actorId && input.isActive === false) throw ApiError.conflict('You cannot deactivate your own account');
  if (input.email && input.email !== user.email) {
    if (!(await isEmailAvailable(input.email))) throw ApiError.conflict('Email is already registered', [{ field: 'email', message: 'Already registered' }]);
    user.email = input.email;
  }
  if (input.name !== undefined) user.name = input.name;
  if (input.role) user.role = input.role;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  await user.save();
  if (input.isActive === false) await revokeAllSessions(user._id);
  return toPublicUser(user);
}

/** Users are never hard-deleted (they own ledger history) — deletion deactivates. */
export async function deactivateUser(actorId: string, id: string) {
  return updateUser(actorId, id, { isActive: false });
}

// ── Profile (/users/me) ────────────────────────────────────────────────────

export async function updateProfile(userId: string, input: { name?: string; email?: string }) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (input.email && input.email !== user.email) {
    if (!(await isEmailAvailable(input.email))) throw ApiError.conflict('Email is already registered', [{ field: 'email', message: 'Already registered' }]);
    user.email = input.email;
  }
  if (input.name !== undefined) user.name = input.name;
  await user.save();
  return toPublicUser(user);
}

export async function changePassword(userId: string, current: string, next: string, keepFamily?: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    throw ApiError.unprocessable('Current password is incorrect', [{ field: 'currentPassword', message: 'Incorrect password' }]);
  }
  user.passwordHash = await hashPassword(next);
  await user.save();
  // Sign out every other device; keep the current session alive.
  await revokeAllSessions(user._id, keepFamily);
}

export async function setAvatar(userId: string, publicUrl: string, uploadsDir: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  const previous = user.avatarUrl;
  user.avatarUrl = publicUrl;
  await user.save();
  if (previous?.startsWith('/uploads/avatars/')) {
    await fs.rm(path.join(uploadsDir, 'avatars', path.basename(previous)), { force: true });
  }
  return toPublicUser(user);
}

/** Recent actions by the user: operations created/validated and ledger moves. */
export async function recentActivity(userId: string, limit = 12) {
  const [ops, moves] = await Promise.all([
    Operation.find({ $or: [{ createdBy: userId }, { responsible: userId }] })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('reference type status updatedAt doneDate')
      .lean(),
    StockMove.find({ user: userId })
      .sort({ date: -1 })
      .limit(limit)
      .populate('product', 'sku name')
      .select('reference direction effect quantity date product')
      .lean(),
  ]);
  const items = [
    ...ops.map((o) => ({
      kind: 'operation' as const,
      id: String(o._id),
      reference: o.reference,
      type: o.type,
      status: o.status,
      at: o.updatedAt,
    })),
    ...moves.map((m) => ({
      kind: 'move' as const,
      id: String(m._id),
      reference: m.reference,
      direction: m.direction,
      effect: m.effect,
      quantity: m.quantity,
      product: m.product as unknown as { sku: string; name: string } | null,
      at: m.date,
    })),
  ];
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
