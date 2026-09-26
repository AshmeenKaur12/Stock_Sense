import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/axios';
import { authApi } from '../api';
import { AuthHeader, ErrorBanner } from '../components/FormBits';
import { OtpInput } from '../components/OtpInput';
import { useResetFlow } from '../resetFlow';

const COOLDOWN = 60;

function useCountdown(since: number) {
  const calc = () => Math.max(0, COOLDOWN - Math.floor((Date.now() - since) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const t = setInterval(() => setLeft(calc()), 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since]);
  return left;
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const { email, sentAt, markSent, setResetToken } = useResetFlow();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [success, setSuccess] = useState(false);
  const left = useCountdown(sentAt);

  const verify = useMutation({
    mutationFn: (c: string) => authApi.verifyOtp(email, c),
    onSuccess: ({ resetToken }) => {
      setSuccess(true);
      setResetToken(resetToken);
      setTimeout(() => navigate('/reset-password'), 450);
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Invalid code'));
      setAttempt((n) => n + 1);
      setCode('');
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => {
      markSent();
      setError(null);
      toast.success('A new code is on its way');
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Could not resend the code'));
      setAttempt((n) => n + 1);
    },
  });

  if (!email) return <Navigate to="/forgot-password" replace />;

  return (
    <div className="space-y-6">
      <AuthHeader
        title="Check your email"
        subtitle={
          <>
            Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
          </>
        }
      />
      <ErrorBanner message={error} attempt={attempt} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) verify.mutate(code);
        }}
        className="space-y-5"
      >
        <OtpInput value={code} onChange={setCode} onComplete={(c) => verify.mutate(c)} disabled={verify.isPending || success} invalid={attempt > 0 && !!error && !code} success={success} />
        <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={code.length !== 6} loading={verify.isPending}>
          Verify code
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Change email
        </Link>
        <Button type="button" variant="ghost" size="sm" disabled={left > 0} loading={resend.isPending} onClick={() => resend.mutate()}>
          {!resend.isPending && <RotateCw />}
          {left > 0 ? <span className="tabular">Resend in {left}s</span> : 'Resend code'}
        </Button>
      </div>
      <p className="text-center text-caption text-muted-foreground">The code expires in 10 minutes. You have 5 attempts.</p>
    </div>
  );
}
