import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { durationMs } from './crypto';

export const ACCESS_COOKIE = 'ss_access';
export const REFRESH_COOKIE = 'ss_refresh';
/** Refresh cookie is only ever sent to the auth endpoints. */
const REFRESH_PATH = '/api/v1/auth';

const base = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
});

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base(), path: '/', maxAge: durationMs(env.ACCESS_TOKEN_TTL) });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base(), path: REFRESH_PATH, maxAge: durationMs(env.REFRESH_TOKEN_TTL) });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: REFRESH_PATH });
}
