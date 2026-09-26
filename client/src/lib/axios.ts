import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: { total: number; page: number; limit: number; [k: string]: unknown };
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

/** Endpoints that must never trigger a refresh attempt (would loop or leak). */
const NO_REFRESH = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/verify-otp', '/auth/reset-password'];

let refreshPromise: Promise<void> | null = null;
let onAuthFailure: () => void = () => {};

/** Registered by the auth store so a failed refresh logs the user out. */
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url ?? '';

    if (error.response?.status !== 401 || !original || original._retry || NO_REFRESH.some((p) => url.includes(p))) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      // Coalesce concurrent 401s into a single refresh call.
      refreshPromise ??= api.post('/auth/refresh').then(() => undefined);
      await refreshPromise;
      return api(original);
    } catch (refreshError) {
      onAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

/** Extracts a user-facing message from an API error. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
    if (data?.message) return data.message;
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the API running?';
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
