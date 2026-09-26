import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { OperationStatus } from './StatusBadge';

export interface StepDef {
  status: OperationStatus;
  label: string;
}

interface StatusStepperProps {
  steps: StepDef[];
  current: OperationStatus;
  className?: string;
}

/**
 * Chevron stepper (Draft > Ready > Done). Completed steps are emerald with a ✓,
 * the current step is gradient-filled, future steps are muted. A canceled
 * operation shows every step muted plus a rose "Canceled" marker.
 */
export function StatusStepper({ steps, current, className }: StatusStepperProps) {
  // Per-instance id so two steppers on one page never animate into each other.
  const pillId = useId();
  const canceled = current === 'canceled';
  const currentIndex = canceled ? -1 : steps.findIndex((s) => s.status === current);

  return (
    <ol aria-label="Status" className={cn('flex items-stretch overflow-hidden rounded-xl border bg-muted/40 text-[12.5px] font-medium', className)}>
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
        const last = i === steps.length - 1;
        return (
          <li
            key={step.status}
            aria-current={state === 'current' ? 'step' : undefined}
            data-state={state}
            className={cn(
              'relative flex h-9 flex-1 items-center justify-center gap-1.5 px-4 pl-6 first:pl-4',
              state === 'done' && 'text-success',
              state === 'current' && 'text-white',
              state === 'todo' && 'text-muted-foreground',
            )}
            style={last ? undefined : { clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)' }}
          >
            {state === 'current' && (
              <motion.span
                layoutId={pillId}
                data-testid="stepper-current-fill"
                className="absolute inset-0 -z-0 bg-brand-gradient"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            {state === 'done' && <span className="absolute inset-0 bg-success/10" />}
            <span className="relative z-10 flex items-center gap-1.5">
              {state === 'done' && <Check className="size-3.5" aria-hidden />}
              {step.label}
              <span className="sr-only">{state === 'done' ? '(completed)' : state === 'current' ? '(current)' : '(upcoming)'}</span>
            </span>
          </li>
        );
      })}
      {canceled && (
        <li aria-current="step" className="flex h-9 items-center gap-1.5 border-l bg-destructive/10 px-4 text-destructive">
          <X className="size-3.5" aria-hidden />
          <span className="line-through decoration-destructive/60">Canceled</span>
        </li>
      )}
    </ol>
  );
}

export const RECEIPT_STEPS: StepDef[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'ready', label: 'Ready' },
  { status: 'done', label: 'Done' },
];

export const DELIVERY_STEPS: StepDef[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'waiting', label: 'Waiting' },
  { status: 'ready', label: 'Ready' },
  { status: 'done', label: 'Done' },
];
