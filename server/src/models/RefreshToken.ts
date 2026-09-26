import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Refresh tokens are stored only as SHA-256 hashes. Every rotation keeps the same
 * `family`; presenting an already-rotated token revokes the whole family (reuse detection).
 */
const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenAttrs = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshToken = model('RefreshToken', refreshTokenSchema);
