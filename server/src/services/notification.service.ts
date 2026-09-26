import type { Types } from 'mongoose';
import { Notification, type NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { emitToUser, SocketEvents } from '../sockets';
import { ApiError } from '../utils/ApiError';

const DEDUPE_WINDOW_MS = 24 * 60 * 60_000;

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  dedupeKey: string;
  /** Defaults to every active user. */
  userIds?: (string | Types.ObjectId)[];
}

/**
 * Creates one notification per recipient and pushes it over Socket.IO.
 * Suppressed entirely when the same `dedupeKey` fired within the last 24 hours.
 * Returns the number of notifications created.
 */
export async function notify(input: NotifyInput): Promise<number> {
  const recent = await Notification.exists({ dedupeKey: input.dedupeKey, createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) } });
  if (recent) return 0;

  const recipients = input.userIds?.length
    ? input.userIds.map(String)
    : (await User.find({ isActive: true }).select('_id').lean()).map((u) => String(u._id));
  if (!recipients.length) return 0;

  const docs = await Notification.insertMany(
    recipients.map((user) => ({
      user,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      dedupeKey: input.dedupeKey,
    })),
  );
  for (const doc of docs) emitToUser(String(doc.user), SocketEvents.NotificationNew, doc.toJSON());
  return docs.length;
}

export async function listForUser(userId: string, { page, limit, unreadOnly }: { page: number; limit: number; unreadOnly?: boolean }) {
  const filter = { user: userId, ...(unreadOnly ? { readAt: null } : {}) };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);
  return { items, total, unread };
}

export async function markRead(userId: string, id: string) {
  const doc = await Notification.findOneAndUpdate({ _id: id, user: userId }, { $set: { readAt: new Date() } }, { new: true }).lean();
  if (!doc) throw ApiError.notFound('Notification not found');
  return doc;
}

export async function markAllRead(userId: string) {
  const res = await Notification.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } });
  return { updated: res.modifiedCount };
}
