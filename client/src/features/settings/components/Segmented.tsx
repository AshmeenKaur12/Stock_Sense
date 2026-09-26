import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface SegmentedProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: SegmentOption<V>[];
  'aria-label': string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Pill segmented control with an animated active thumb (filters, type pickers). */
export function Segmented<V extends string>({ value, onChange, options, size = 'sm', className, 'aria-label': ariaLabel }: SegmentedProps<V>) {
  const layoutId = useId();
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border bg-muted/40 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3 font-medium outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-7 text-[12.5px]' : 'h-9 flex-1 text-[13px]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && <motion.span layoutId={layoutId} transition={{ type: 'spring', stiffness: 520, damping: 40 }} className="absolute inset-0 rounded-[10px] border bg-card shadow-card" aria-hidden />}
            {o.icon && <o.icon className={cn('relative size-3.5', active && 'text-primary')} aria-hidden />}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && <span className="tabular relative text-[11px] text-muted-foreground">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
