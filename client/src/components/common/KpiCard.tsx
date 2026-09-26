import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountUp } from '@/hooks/useCountUp';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';

export type KpiTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info';

const TONES: Record<KpiTone, { icon: string; spark: string }> = {
  primary: { icon: 'bg-primary/10 text-primary ring-primary/20', spark: 'text-primary' },
  success: { icon: 'bg-success/10 text-success ring-success/20', spark: 'text-success' },
  warning: { icon: 'bg-warning/10 text-warning ring-warning/20', spark: 'text-warning' },
  destructive: { icon: 'bg-destructive/10 text-destructive ring-destructive/20', spark: 'text-destructive' },
  info: { icon: 'bg-info/10 text-info ring-info/20', spark: 'text-info' },
};

interface KpiCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: KpiTone;
  /** Percentage change vs. previous period. */
  delta?: number;
  /** When true, a negative delta is good (e.g. fewer low-stock items). */
  invertDelta?: boolean;
  sparkline?: number[];
  to?: string;
  hint?: string;
  index?: number;
}

export function KpiCard({ label, value, icon: Icon, tone = 'primary', delta, invertDelta, sparkline, to, hint, index = 0 }: KpiCardProps) {
  const animated = useCountUp(value);
  const t = TONES[tone];
  const positive = delta !== undefined && (invertDelta ? delta <= 0 : delta >= 0);

  const body = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="group relative h-full overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex size-9 items-center justify-center rounded-lg ring-1 ring-inset', t.icon)}>
          <Icon className="size-[18px]" strokeWidth={1.9} />
        </span>
        {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} colorClassName={t.spark} className="opacity-90" />}
      </div>
      <div className="caption-label mt-4">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="tabular text-2xl font-semibold tracking-tight">{formatNumber(Math.round(animated))}</span>
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 text-caption font-medium tabular', positive ? 'text-success' : 'text-destructive')}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-caption text-muted-foreground">{hint}</div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-brand-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </motion.div>
  );

  return to ? (
    <Link to={to} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${label}: ${value}`}>
      {body}
    </Link>
  ) : (
    body
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="mt-4 h-3 w-28" />
      <Skeleton className="mt-2 h-7 w-20" />
    </div>
  );
}
