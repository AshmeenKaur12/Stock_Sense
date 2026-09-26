import { z } from 'zod';

export const PASSWORD_RULES = [
  { id: 'length', label: 'More than 8 characters', test: (v: string) => v.length > 8 },
  { id: 'lower', label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'upper', label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'special', label: 'A special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

/** Strength 0–5: one point per rule met, plus one for 12+ characters once all rules pass. */
export function passwordStrength(v: string): number {
  if (!v) return 0;
  const met = PASSWORD_RULES.filter((r) => r.test(v)).length;
  return met === PASSWORD_RULES.length && v.length >= 12 ? met + 1 : met;
}

export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .refine((v) => v.length > 8, 'Password must be more than 8 characters')
  .refine((v) => /[a-z]/.test(v), 'Password must contain a lowercase letter')
  .refine((v) => /[A-Z]/.test(v), 'Password must contain an uppercase letter')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Password must contain a special character');

export const loginIdSchema = z
  .string()
  .trim()
  .min(6, 'Login ID must be 6–12 characters')
  .max(12, 'Login ID must be 6–12 characters')
  .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore');

export const loginSchema = z.object({
  loginId: z.string().trim().min(1, 'Login Id is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    loginId: loginIdSchema,
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Re-enter your password'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotSchema = z.object({ email: z.string().trim().min(1, 'Email is required').email('Enter a valid email') });
export type ForgotInput = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Re-enter your password') })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export type ResetInput = z.infer<typeof resetSchema>;
