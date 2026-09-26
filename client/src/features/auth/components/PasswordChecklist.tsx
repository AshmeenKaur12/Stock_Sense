import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PASSWORD_RULES, passwordStrength } from '../schema';

const LEVELS = [
  { label: 'Too weak', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Weak', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Fair', bar: 'bg-warning', text: 'text-warning' },
  { label: 'Good', bar: 'bg-info', text: 'text-info' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success' },
  { label: 'Excellent', bar: 'bg-success', text: 'text-success' },
];

/** Live password rules with animated ticks and a 5-segment strength meter. */
export function PasswordChecklist({ value }: { value: string }) {
  const score = passwordStrength(value);
  const level = LEVELS[score]!;
  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-5 gap-1" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn('h-full rounded-full', level.bar)}
                initial={false}
                animate={{ width: i < score ? '100%' : '0%' }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          ))}
        </div>
        <span className={cn('w-16 text-right text-caption font-medium', value ? level.text : 'text-muted-foreground')}>{value ? level.label : 'Strength'}</span>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 xs:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.id} className={cn('flex items-center gap-2 text-caption transition-colors duration-micro', ok ? 'text-success' : 'text-muted-foreground')}>
              <span className={cn('relative flex size-4 items-center justify-center rounded-full border transition-colors duration-micro', ok ? 'border-success/40 bg-success/15' : 'border-border')}>
                <AnimatePresence initial={false} mode="wait">
                  {ok ? (
                    <motion.span key="ok" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 26 }}>
                      <Check className="size-2.5" strokeWidth={3.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="no" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}>
                      <X className="size-2.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {rule.label}
              <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
