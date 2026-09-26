import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env';
import { durationMs } from './crypto';

export const ACCESS_COOKIE = 'ss_access';
export const REFRESH_COOKIE = 'ss_refresh';

/** Refresh cookie is only ever sent to the auth endpoints. */
const REFRESH_PATH = '/api/v1/auth';

const base = (): CookieOptions => {
  const sameSite = isProd ? 'none' : 'lax';

  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // In production the client and API are normally on different domains
    // (e.g. a Vercel frontend + a Render API), so cross-site cookies require
    // SameSite=None and Secure.
    // Locally, the Vite proxy keeps requests same-origin, so Lax is sufficient.
    sameSite,
  };
};

const accessCookieOptions = (): CookieOptions => ({
  ...base(),
  path: '/',
  maxAge: durationMs(env.ACCESS_TOKEN_TTL),
});

const refreshCookieOptions = (): CookieOptions => ({
  ...base(),
  path: REFRESH_PATH,
  maxAge: durationMs(env.REFRESH_TOKEN_TTL),
});

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, {
    ...base(),
    path: '/',
  });

  res.clearCookie(REFRESH_COOKIE, {
    ...base(),
    path: REFRESH_PATH,
  });
}
