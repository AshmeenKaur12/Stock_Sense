import crypto from 'node:crypto';
import { env } from '../config/env';

/** Keyed hash for secrets we must look up but never store in clear (refresh tokens, OTPs). */
export const hashSecret = (value: string) => crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(value).digest('hex');

export const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');

export const randomOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Constant-time comparison of two hex digests. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Parses "15m" / "7d" / "3600s" into milliseconds. */
export function durationMs(value: string): number {
  const m = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!m) throw new Error(`Invalid duration: ${value}`);
  const n = Number(m[1]);
  const unit = m[2] as 'ms' | 's' | 'm' | 'h' | 'd';
  return n * { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}
