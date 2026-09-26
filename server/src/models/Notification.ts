import { Schema, model, type InferSchemaType } from 'mongoose';

export const NOTIFICATION_TYPES = ['low_stock', 'out_of_stock', 'waiting', 'late'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: null },
    /** Same key within 24h is suppressed (e.g. "low_stock:<product>:<warehouse>"). */
    dedupeKey: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1, createdAt: -1 });

export type NotificationAttrs = InferSchemaType<typeof notificationSchema>;
export const Notification = model('Notification', notificationSchema);
