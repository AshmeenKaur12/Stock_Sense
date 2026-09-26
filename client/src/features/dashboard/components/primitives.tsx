import { motion, type Variants } from 'framer-motion';
import { useCallback, useRef, type MouseEvent, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountUp } from '@/hooks/useCountUp';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Page-level stagger: each direct `motion` child using `fadeUp` enters in sequence. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const inrCompactFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

/** ₹16.1L / ₹2.4Cr / ₹950 — Indian compact notation. */
export const formatInrCompact = (n: number) => inrCompactFmt.format(n);

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** Counts up to `value`, rendering with `format` each frame. */
export function AnimatedNumber({ value, format = formatNumber, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const animated = useCountUp(value);
  const shown = Math.abs(animated - value) < 0.5 ? value : Number.isInteger(value) ? Math.round(animated) : animated;
  return <span className={cn('tabular', className)}>{format(shown)}</span>;
}

/**
 * Cursor spotlight: writes the pointer position into CSS variables on the host
 * element (no React re-render). Pair with <Spotlight /> inside a `group relative` element.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  }, []);
  return { ref, onMouseMove };
}

/** Radial glow that follows the cursor (see `useSpotlight`). `color` is an HSL var name, e.g. `success`. */
export function Spotlight({ color, size = 420 }: { color: string; size?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-panel ease-brand group-hover:opacity-100"
      style={{
        background: `radial-gradient(${size}px circle at var(--spot-x, 50%) var(--spot-y, 0px), hsl(var(--${color}) / 0.10), transparent 65%)`,
      }}
    />
  );
}

interface PanelProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** id prefix for aria-labelledby. */
  id: string;
}

/** Card section with a heading row — the base for charts and lists. */
export function Panel({ title, description, icon, actions, children, className, bodyClassName, id }: PanelProps) {
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby={`${id}-title`}
      className={cn('flex min-w-0 flex-col rounded-2xl border bg-card shadow-card', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          {icon}
          <div className="min-w-0 space-y-0.5">
            <h2 id={`${id}-title`} className="text-[15px] font-semibold leading-6 tracking-tight">
              {title}
            </h2>
            {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={cn('min-w-0 flex-1 px-5 pb-5', bodyClassName)}>{children}</div>
    </motion.section>
  );
}

/** Small tinted icon tile used in panel headers. */
export function PanelIcon({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary ring-primary/20',
    success: 'bg-success/10 text-success ring-success/20',
    warning: 'bg-warning/10 text-warning ring-warning/20',
    destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
    info: 'bg-info/10 text-info ring-info/20',
  }[tone];
  return <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset [&_svg]:size-4', tones)}>{children}</span>;
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn('space-y-3', className)}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
