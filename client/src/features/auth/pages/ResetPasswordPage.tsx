import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/axios';
import { authApi } from '../api';
import { AuthHeader, ErrorBanner, FieldError, PasswordInput } from '../components/FormBits';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { useResetFlow } from '../resetFlow';
import { resetSchema, type ResetInput } from '../schema';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { email, resetToken, clear } = useResetFlow();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const form = useForm<ResetInput>({ resolver: zodResolver(resetSchema), mode: 'onTouched', defaultValues: { password: '', confirmPassword: '' } });
  const password = form.watch('password');

  const reset = useMutation({
    mutationFn: (v: ResetInput) => authApi.resetPassword({ email, resetToken, ...v }),
    onSuccess: () => {
      clear();
      toast.success('Password updated', { description: 'Sign in with your new password.' });
      navigate('/login', { replace: true });
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Could not reset your password'));
      setAttempt((n) => n + 1);
    },
  });

  if (!email || !resetToken) return <Navigate to="/forgot-password" replace />;

  return (
    <div className="space-y-6">
      <AuthHeader title="Set a new password" subtitle="Choose a strong password you haven't used before." />
      <ErrorBanner message={error} attempt={attempt} />
      <form onSubmit={form.handleSubmit((v) => reset.mutate(v))} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" autoFocus autoComplete="new-password" aria-invalid={!!form.formState.errors.password} {...form.register('password')} />
          <PasswordChecklist value={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!form.formState.errors.confirmPassword} {...form.register('confirmPassword')} />
          <FieldError message={form.formState.errors.confirmPassword?.message} />
        </div>
        <Button type="submit" variant="gradient" size="lg" className="w-full" loading={reset.isPending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
