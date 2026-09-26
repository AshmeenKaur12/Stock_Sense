import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const ROLES = ['staff', 'manager', 'admin'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    loginId: { type: String, required: true, trim: true, lowercase: true, minlength: 6, maxlength: 12 },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, default: 'staff' },
    avatarUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ loginId: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model('User', userSchema);

/** Public projection returned by the API — never includes secrets. */
export function toPublicUser(u: UserDoc | (UserAttrs & { _id: unknown })) {
  return {
    _id: String(u._id),
    loginId: u.loginId,
    email: u.email,
    name: u.name || u.loginId,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ?? null,
  };
}
