import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { LogoMark } from '@/components/common/Logo';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function AuthHeader({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <LogoMark className="size-11" />
      <div className="space-y-1">
        <h1 className="text-h1">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

/** Error banner that shakes each time `attempt` changes. */
export function ErrorBanner({ message, attempt }: { message: string | null; attempt: number }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={attempt}
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex animate-shake items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
            <CircleAlert className="size-4 shrink-0" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-caption text-destructive">
      {message}
    </p>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

/** "✓ Login ID available" / "✗ Login ID already exists" live hint. */
export function AvailabilityHint({ state, available, taken }: { state: 'idle' | 'checking' | 'available' | 'taken'; available: string; taken: string }) {
  if (state === 'idle') return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-1.5 text-caption font-medium',
        state === 'available' && 'text-success',
        state === 'taken' && 'text-destructive',
        state === 'checking' && 'text-muted-foreground',
      )}
      aria-live="polite"
    >
      {state === 'checking' && <Loader2 className="size-3.5 animate-spin" />}
      {state === 'available' && <CheckCircle2 className="size-3.5" />}
      {state === 'taken' && <XCircle className="size-3.5" />}
      {state === 'checking' ? 'Checking availability…' : state === 'available' ? available : taken}
    </motion.p>
  );
}
