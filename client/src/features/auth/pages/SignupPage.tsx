import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldErrors } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import { authApi } from '../api';
import { AuthHeader, AvailabilityHint, ErrorBanner, FieldError, PasswordInput } from '../components/FormBits';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { useAvailability } from '../queries';
import { loginIdSchema, signupSchema, type SignupInput } from '../schema';

export default function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: { loginId: '', email: '', password: '', confirmPassword: '' },
  });
  const { errors } = form.formState;
  const [loginId, email, password] = form.watch(['loginId', 'email', 'password']);

  const loginIdValid = loginIdSchema.safeParse(loginId).success;
  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const loginCheck = useAvailability('loginId', loginId, loginIdValid);
  const emailCheck = useAvailability('email', email, emailValid);

  const state = (valid: boolean, q: typeof loginCheck) =>
    !valid ? 'idle' : q.isFetching || !q.data ? 'checking' : q.data.available ? 'available' : 'taken';
  const loginState = state(loginIdValid, loginCheck);
  const emailState = state(emailValid, emailCheck);

  const signup = useMutation({
    mutationFn: authApi.signup,
    onSuccess: () => {
      toast.success('Account created', { description: 'Sign in with your new Login ID.' });
      navigate('/login', { replace: true });
    },
    onError: (err) => {
      const fields = fieldErrors(err);
      for (const [name, message] of Object.entries(fields)) {
        if (name in form.getValues()) form.setError(name as keyof SignupInput, { message });
      }
      setError(getErrorMessage(err, 'Could not create your account'));
      setAttempt((n) => n + 1);
    },
  });

  const onSubmit = (values: SignupInput) => {
    if (loginState === 'taken') return form.setError('loginId', { message: 'Login ID already exists' });
    if (emailState === 'taken') return form.setError('email', { message: 'Email is already registered' });
    setError(null);
    signup.mutate(values);
  };

  return (
    <div className="space-y-6">
      <AuthHeader title="Create your account" subtitle="Start tracking inventory in minutes." />
      <ErrorBanner message={error} attempt={attempt} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="loginId">Enter Login Id</Label>
          <Input id="loginId" autoFocus autoComplete="username" placeholder="6–12 characters" aria-invalid={!!errors.loginId || loginState === 'taken'} {...form.register('loginId')} />
          {errors.loginId ? <FieldError message={errors.loginId.message} /> : <AvailabilityHint state={loginState} available="Login ID available" taken="Login ID already exists" />}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Enter Email Id</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email || emailState === 'taken'} {...form.register('email')} />
          {errors.email ? <FieldError message={errors.email.message} /> : <AvailabilityHint state={emailState} available="Email available" taken="Email is already registered" />}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Enter Password</Label>
          <PasswordInput id="password" autoComplete="new-password" placeholder="Create a strong password" aria-invalid={!!errors.password} {...form.register('password')} />
          <PasswordChecklist value={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Re-Enter Password</Label>
          <PasswordInput id="confirmPassword" autoComplete="new-password" placeholder="Repeat your password" aria-invalid={!!errors.confirmPassword} {...form.register('confirmPassword')} />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        <Button type="submit" variant="gradient" size="lg" className="w-full tracking-wide" loading={signup.isPending}>
          SIGN UP
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
