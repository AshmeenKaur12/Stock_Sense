import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../models/User';
import { durationMs } from './crypto';

export interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: Math.floor(durationMs(env.ACCESS_TOKEN_TTL) / 1000) });
}

/** Returns the payload, or null when the token is missing, malformed or expired. */
export function verifyAccessToken(token: string | undefined): AccessPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) return null;
    return { sub: String(decoded.sub), role: decoded.role as Role };
  } catch {
    return null;
  }
}
