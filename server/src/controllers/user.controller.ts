import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import { familyOf } from '../services/auth.service';
import * as notifications from '../services/notification.service';
import * as users from '../services/user.service';
import { UPLOADS_DIR } from '../config/paths';
import { ApiError } from '../utils/ApiError';
import { REFRESH_COOKIE } from '../utils/cookies';
import { sendSuccess } from '../utils/response';

type Paged = { page: number; limit: number; search?: string };

// ── Admin: users ───────────────────────────────────────────────────────────

export async function list(req: Request, res: Response) {
  const q = req.query as unknown as Paged & { role?: 'staff' | 'manager' | 'admin' };
  const { items, total } = await users.listUsers(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total } });
}
export async function create(req: Request, res: Response) {
  sendSuccess(res, await users.createUser(req.body), { status: 201, message: 'User created' });
}
export async function update(req: Request, res: Response) {
  sendSuccess(res, await users.updateUser(currentUser(req).id, req.params.id!, req.body), { message: 'User saved' });
}
export async function remove(req: Request, res: Response) {
  sendSuccess(res, await users.deactivateUser(currentUser(req).id, req.params.id!), { message: 'User deactivated' });
}

// ── Me ─────────────────────────────────────────────────────────────────────

export async function updateMe(req: Request, res: Response) {
  sendSuccess(res, { user: await users.updateProfile(currentUser(req).id, req.body) }, { message: 'Profile saved' });
}

export async function changePassword(req: Request, res: Response) {
  const family = await familyOf(req.cookies?.[REFRESH_COOKIE] as string | undefined);
  await users.changePassword(currentUser(req).id, req.body.currentPassword, req.body.password, family);
  sendSuccess(res, null, { message: 'Password changed. Other devices were signed out.' });
}

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) throw ApiError.unprocessable('Choose an image to upload', [{ field: 'avatar', message: 'Required' }]);
  const user = await users.setAvatar(currentUser(req).id, `/uploads/avatars/${req.file.filename}`, UPLOADS_DIR);
  sendSuccess(res, { user }, { message: 'Avatar updated' });
}

export async function activity(req: Request, res: Response) {
  sendSuccess(res, await users.recentActivity(currentUser(req).id));
}

// ── Notifications ──────────────────────────────────────────────────────────

export async function listNotifications(req: Request, res: Response) {
  const q = req.query as unknown as Paged & { unread?: boolean };
  const { items, total, unread } = await notifications.listForUser(currentUser(req).id, { page: q.page, limit: q.limit, unreadOnly: q.unread });
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total, unread } });
}
export async function readNotification(req: Request, res: Response) {
  sendSuccess(res, await notifications.markRead(currentUser(req).id, req.params.id!));
}
export async function readAllNotifications(req: Request, res: Response) {
  sendSuccess(res, await notifications.markAllRead(currentUser(req).id));
}
