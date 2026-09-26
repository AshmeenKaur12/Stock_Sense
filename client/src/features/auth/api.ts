import { getData, postData } from '@/lib/api';
import type { PublicUser } from '@/lib/types';
import type { LoginInput } from './schema';

export const authApi = {
  me: () => getData<{ user: PublicUser }>('/auth/me'),
  login: (body: LoginInput) => postData<{ user: PublicUser }>('/auth/login', body).then((r) => r.data),
  logout: () => postData<null>('/auth/logout'),
  signup: (body: { loginId: string; email: string; password: string; confirmPassword: string }) => postData<{ user: PublicUser }>('/auth/signup', body),
  checkLoginId: (loginId: string) => getData<{ valid: boolean; available: boolean }>('/auth/check-login-id', { loginId }),
  checkEmail: (email: string) => getData<{ valid: boolean; available: boolean }>('/auth/check-email', { email }),
  forgotPassword: (email: string) => postData<{ cooldownSeconds: number }>('/auth/forgot-password', { email }),
  verifyOtp: (email: string, code: string) => postData<{ resetToken: string }>('/auth/verify-otp', { email, code }).then((r) => r.data),
  resetPassword: (body: { email: string; resetToken: string; password: string; confirmPassword: string }) => postData<null>('/auth/reset-password', body),
};
