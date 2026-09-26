import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { useId, type KeyboardEvent } from 'react';
import { formatCompact } from '@/lib/format';
import type { MoveDirection } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { MoveTotals } from '../api';
import { DIRECTION_STYLE, DIRECTIONS } from './direction';

interface DirectionChipsProps {
  value: MoveDirection | '';
  onChange: (direction: MoveDirection | '') => void;
  totals: MoveTotals | undefined;
}

const OPTIONS: (MoveDirection | '')[] = ['', ...DIRECTIONS];

/** Segmented All / In / Out / Internal / Adjustments filter with live counts. */
export function DirectionChips({ value, onChange, totals }: DirectionChipsProps) {
  const pill = useId();
  const all = DIRECTIONS.reduce((s, d) => s + (totals?.[d]?.count ?? 0), 0);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = OPTIONS.indexOf(value);
    const next = OPTIONS[(i + (e.key === 'ArrowRight' ? 1 : -1) + OPTIONS.length) % OPTIONS.length] ?? '';
    onChange(next);
    requestAnimationFrame(() => e.currentTarget.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  };

  return (
    <div
      role="radiogroup"
      aria-label="Direction"
      onKeyDown={onKeyDown}
      className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {OPTIONS.map((d) => {
        const active = d === value;
        const s = d ? DIRECTION_STYLE[d] : null;
        const Icon = s?.icon ?? Layers;
        const count = d ? totals?.[d]?.count : all;
        return (
          <button
            key={d || 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(d)}
            className={cn(
              'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={pill}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-full border bg-card shadow-xs"
                aria-hidden
              />
            )}
            <Icon className={cn('relative size-3.5', s && active && s.text)} aria-hidden />
            <span className="relative">{s ? s.chip : 'All'}</span>
            {totals && (
              <span
                className={cn(
                  'tabular relative min-w-5 rounded-full px-1.5 text-center font-mono text-[11px] leading-[18px]',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {formatCompact(count ?? 0)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
