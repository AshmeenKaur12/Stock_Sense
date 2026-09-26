import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/axios';
import { authApi } from '../api';
import { AuthHeader, ErrorBanner, FieldError } from '../components/FormBits';
import { useResetFlow } from '../resetFlow';
import { forgotSchema, type ForgotInput } from '../schema';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { email, setEmail, markSent } = useResetFlow();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const form = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema), defaultValues: { email } });

  const send = useMutation({
    mutationFn: (v: ForgotInput) => authApi.forgotPassword(v.email),
    onSuccess: (_res, v) => {
      setEmail(v.email.trim().toLowerCase());
      markSent();
      navigate('/verify-otp');
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Could not send the code'));
      setAttempt((n) => n + 1);
    },
  });

  return (
    <div className="space-y-6">
      <AuthHeader title="Forgot your password?" subtitle="We'll email you a 6-digit code to reset it." />
      <ErrorBanner message={error} attempt={attempt} />
      <form onSubmit={form.handleSubmit((v) => send.mutate(v))} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" autoFocus autoComplete="email" placeholder="you@company.com" className="pl-9" aria-invalid={!!form.formState.errors.email} {...form.register('email')} />
          </div>
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <Button type="submit" variant="gradient" size="lg" className="w-full" loading={send.isPending}>
          Send code
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </p>
    </div>
  );
}
