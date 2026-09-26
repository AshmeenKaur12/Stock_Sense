import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthHeader, ErrorBanner, FieldError, PasswordInput } from '../components/FormBits';
import { useLogin } from '../queries';
import { loginSchema, type LoginInput } from '../schema';
import { loginErrorMessage } from '../types';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const login = useLogin();

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { loginId: '', password: '' } });
  const { errors } = form.formState;

  const onSubmit = (values: LoginInput) => {
    setError(null);
    login.mutate(values, {
      onSuccess: ({ user }) => {
        toast.success(`Welcome back, ${user.name?.split(' ')[0] || user.loginId}`);
        navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
      },
      onError: (err) => {
        setError(loginErrorMessage(err));
        setAttempt((n) => n + 1);
      },
    });
  };

  return (
    <div className="space-y-6">
      <AuthHeader title="Sign in to StockSense" subtitle="Inventory, in real time." />
      <ErrorBanner message={error} attempt={attempt} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="loginId">Login Id</Label>
          <Input id="loginId" autoComplete="username" autoFocus placeholder="e.g. admin01" aria-invalid={!!errors.loginId} {...form.register('loginId')} />
          <FieldError message={errors.loginId?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} {...form.register('password')} />
          <FieldError message={errors.password?.message} />
        </div>

        <Button type="submit" variant="gradient" size="lg" className="w-full tracking-wide" loading={login.isPending}>
          SIGN IN
        </Button>
      </form>

      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Link to="/forgot-password" className="font-medium text-primary hover:underline">
          Forget Password ?
        </Link>
        <span aria-hidden className="text-border">
          |
        </span>
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
