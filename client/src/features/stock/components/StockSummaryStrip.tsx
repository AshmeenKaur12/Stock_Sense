import { motion } from 'framer-motion';
import { AlertTriangle, Boxes, IndianRupee, PackageX, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompact, formatCurrency, formatNumber } from '@/lib/format';
import type { StockStatus, StockSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StockSummaryStripProps {
  summary: StockSummary | undefined;
  isLoading: boolean;
  activeStatus: string;
  onStatusToggle: (status: StockStatus | '') => void;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  title?: string;
  icon: LucideIcon;
  iconClass: string;
  status?: StockStatus;
  hint: string;
}

/** Compact KPI strip above the stock table; Low / Out tiles double as quick filters. */
export function StockSummaryStrip({ summary, isLoading, activeStatus, onStatusToggle }: StockSummaryStripProps) {
  const tiles: Tile[] = [
    {
      key: 'units',
      label: 'Units on hand',
      value: formatNumber(summary?.onHand),
      icon: Boxes,
      iconClass: 'text-primary bg-primary/10 border-primary/20',
      hint: 'Across matching products',
    },
    {
      key: 'value',
      label: 'Stock value',
      value: (summary?.value ?? 0) >= 10_000_000 ? `₹${formatCompact(summary?.value)}` : formatCurrency(summary?.value),
      title: formatCurrency(summary?.value),
      icon: IndianRupee,
      iconClass: 'text-info bg-info/10 border-info/20',
      hint: 'On hand × unit cost',
    },
    {
      key: 'low',
      label: 'Low stock',
      value: formatNumber(summary?.low),
      icon: AlertTriangle,
      iconClass: 'text-warning bg-warning/10 border-warning/20',
      status: 'low',
      hint: 'Below reorder minimum',
    },
    {
      key: 'out',
      label: 'Out of stock',
      value: formatNumber(summary?.out),
      icon: PackageX,
      iconClass: 'text-destructive bg-destructive/10 border-destructive/20',
      status: 'out',
      hint: 'Nothing free to use',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card shadow-card lg:grid-cols-4"
    >
      {tiles.map((t, i) => {
        const active = !!t.status && activeStatus === t.status;
        const body = (
          <>
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border', t.iconClass)}>
              <t.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="caption-label block truncate">{t.label}</span>
              {isLoading && !summary ? (
                <Skeleton className="mt-1.5 h-5 w-16" />
              ) : (
                <span className="tabular mt-0.5 block truncate font-mono text-lg font-semibold leading-6" title={t.title}>
                  {t.value}
                </span>
              )}
              <span className="hidden truncate text-caption text-muted-foreground sm:block">{active ? 'Filter applied · click to clear' : t.hint}</span>
            </span>
          </>
        );
        const cell = cn(
          'relative flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5',
          i % 2 === 1 && 'border-l',
          i >= 2 && 'border-t lg:border-t-0',
          i === 2 && 'lg:border-l',
        );
        if (!t.status) {
          return (
            <div key={t.key} className={cell}>
              {body}
            </div>
          );
        }
        const status = t.status;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onStatusToggle(active ? '' : status)}
            className={cn(
              cell,
              'transition-colors duration-micro hover:bg-accent/40 focus-visible:z-10 focus-visible:ring-inset focus-visible:ring-offset-0',
              active && 'bg-primary/[0.06]',
            )}
          >
            {body}
            {active && <motion.span layoutId="stock-summary-active" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-gradient" />}
          </button>
        );
      })}
    </motion.div>
  );
}
