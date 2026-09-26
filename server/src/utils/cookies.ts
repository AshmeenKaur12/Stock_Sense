import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env';
import { durationMs } from './crypto';

export const ACCESS_COOKIE = 'ss_access';
export const REFRESH_COOKIE = 'ss_refresh';
/** Refresh cookie is only ever sent to the auth endpoints. */
const REFRESH_PATH = '/api/v1/auth';

const base = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  // In production the client and API are normally on different domains (e.g. a
  // Vercel frontend + a Render API), so the cookie must be sent cross-site —
  // that requires SameSite=None, which browsers only honour when Secure is set.
  // Locally (same-origin, via the Vite proxy) Lax is safer and works either way.
  sameSite: isProd ? 'none' : 'lax',
});

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base(), path: '/', maxAge: durationMs(env.ACCESS_TOKEN_TTL) });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base(), path: REFRESH_PATH, maxAge: durationMs(env.REFRESH_TOKEN_TTL) });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: REFRESH_PATH });
}
