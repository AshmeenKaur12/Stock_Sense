import type { AuthUser } from '@/store/auth';

export interface AuthResponse {
  user: AuthUser;
}

/** Exact message required by the spec for any failed login. */
export const INVALID_LOGIN_MESSAGE = 'Invalid Login Id or Password';

/** Message shown under the login form for a failed sign-in. */
export function loginErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string };
  if (e?.response?.status === 401) return INVALID_LOGIN_MESSAGE;
  if (e?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the API running?';
  return e?.response?.data?.message ?? INVALID_LOGIN_MESSAGE;
}
