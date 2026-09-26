import { Schema, model, type InferSchemaType } from 'mongoose';

/** One active password-reset OTP per email. Codes and reset tokens are stored hashed. */
const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Documents disappear an hour after the code expires (reset token lives within that window).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export type OtpAttrs = InferSchemaType<typeof otpSchema>;
export const Otp = model('Otp', otpSchema);
