import axios from 'axios';
import { Lock, RefreshCw, ShieldAlert, WifiOff, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/axios';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

interface Resolved {
  icon: LucideIcon;
  title: string;
  message: string;
  retryable: boolean;
}

function resolve(error: unknown): Resolved {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (!error.response) {
      return { icon: WifiOff, title: 'Network error', message: 'Cannot reach the server. Check your connection and try again.', retryable: true };
    }
    if (status === 401) return { icon: Lock, title: 'Unauthorized', message: 'Your session has expired. Please sign in again.', retryable: false };
    if (status === 403) return { icon: ShieldAlert, title: 'Forbidden', message: "You don't have permission to view this.", retryable: false };
    if (status === 404) return { icon: TriangleAlert, title: 'Not found', message: getErrorMessage(error, 'This record does not exist.'), retryable: false };
  }
  return { icon: TriangleAlert, title: 'Something went wrong', message: getErrorMessage(error, 'An unexpected error occurred.'), retryable: true };
}

/** Error panel for any API-backed screen, with a Retry action where retrying can help. */
export function ErrorState({ error, title, onRetry, retrying, className }: ErrorStateProps) {
  const r = resolve(error);
  const Icon = r.icon;
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-2xl border bg-card px-6 py-14 text-center', className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
        <Icon className="size-5 text-destructive" />
      </span>
      <h3 className="text-[15px] font-semibold">{title ?? r.title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{r.message}</p>
      {onRetry && r.retryable && (
        <Button variant="outline" className="mt-5" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw />}
          Retry
        </Button>
      )}
    </div>
  );
}
