import { z } from 'zod';

export const loginIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(6, 'Login ID must be 6–12 characters')
  .max(12, 'Login ID must be 6–12 characters')
  .regex(/^[a-z0-9._-]+$/, 'Login ID may contain letters, numbers, dot, dash and underscore');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email').max(120);

/** "More than 8 characters", with lowercase, uppercase and a special character. */
export const passwordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const signupBody = z
  .object({
    loginId: loginIdSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const loginBody = z.object({
  loginId: z.string().trim().toLowerCase().min(1, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export const checkLoginIdQuery = z.object({ loginId: z.string().trim().toLowerCase() });
export const checkEmailQuery = z.object({ email: z.string().trim().toLowerCase() });

export const forgotPasswordBody = z.object({ email: emailSchema });

export const verifyOtpBody = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const resetPasswordBody = z
  .object({
    email: emailSchema,
    resetToken: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
