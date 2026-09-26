import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Boxes, ChevronRight, IndianRupee, PackageX, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KpiCard, KpiCardSkeleton } from '@/components/common/KpiCard';
import { MiniProgress } from '@/components/common/bits';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AnimatedNumber, EASE, Spotlight, fadeUp, formatInrCompact, percent, useSpotlight } from './primitives';

type Kpis = DashboardSummary['kpis'];

function StockValueTile({ kpis }: { kpis: Kpis }) {
  const { ref, onMouseMove } = useSpotlight<HTMLAnchorElement>();
  const healthy = Math.max(0, kpis.totalProducts - kpis.lowStock - kpis.outOfStock);
  const segments = [
    { key: 'in', label: 'Healthy', value: healthy, bar: 'bg-success', dot: 'bg-success' },
    { key: 'low', label: 'Low', value: kpis.lowStock, bar: 'bg-warning', dot: 'bg-warning' },
    { key: 'out', label: 'Out', value: kpis.outOfStock, bar: 'bg-destructive', dot: 'bg-destructive' },
  ];

  return (
    <Link
      ref={ref}
      onMouseMove={onMouseMove}
      to="/stock"
      aria-label={`Stock value ${formatCurrency(kpis.stockValue)} — open stock`}
      className="group relative isolate flex h-full min-h-[240px] flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-[box-shadow,transform] duration-panel ease-brand hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
    >
      <Spotlight color="primary" size={520} />
      <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-64 rounded-full bg-brand-gradient opacity-[0.14] blur-3xl" aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <IndianRupee className="size-[18px]" strokeWidth={1.9} aria-hidden />
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          View stock
          <ChevronRight className="size-3.5 transition-transform duration-micro group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>

      <div className="caption-label mt-5">Stock value</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <AnimatedNumber value={kpis.stockValue} format={formatInrCompact} className="text-gradient text-[40px] font-semibold leading-none tracking-tight" />
        <span className="tabular font-mono text-[13px] text-muted-foreground">{formatCurrency(kpis.stockValue)}</span>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">
        <span className="tabular font-medium text-foreground">{formatNumber(kpis.totalUnits)}</span> units on hand across{' '}
        <span className="tabular font-medium text-foreground">{formatNumber(kpis.totalProducts)}</span> products
      </p>

      <div className="mt-auto pt-6">
        <div className="mb-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
          <span className="font-medium">Stock health</span>
          <span className="tabular">{percent(healthy, kpis.totalProducts)}% healthy</span>
        </div>
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(', ')}>
          {kpis.totalProducts > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <motion.span
                  key={s.key}
                  className={cn('h-full first:rounded-l-full last:rounded-r-full', s.bar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.value / kpis.totalProducts) * 100}%` }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
                />
              ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          {segments.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
              {s.label}
              <span className="tabular font-medium text-foreground">{formatNumber(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}

function ThresholdTile({
  label,
  value,
  total,
  to,
  icon: Icon,
  tone,
  index,
}: {
  label: string;
  value: number;
  total: number;
  to: string;
  icon: LucideIcon;
  tone: 'warning' | 'destructive';
  index: number;
}) {
  const t = {
    warning: { tile: 'border-warning/25 bg-warning/[0.05] hover:border-warning/40', icon: 'bg-warning/15 text-warning ring-warning/25', value: 'text-warning' },
    destructive: {
      tile: 'border-destructive/25 bg-destructive/[0.05] hover:border-destructive/40',
      icon: 'bg-destructive/15 text-destructive ring-destructive/25',
      value: 'text-destructive',
    },
  }[tone];
  const active = value > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: EASE }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Link
        to={to}
        aria-label={`${label}: ${value} of ${total} products`}
        className={cn(
          'flex h-full flex-col rounded-2xl border p-4 shadow-card transition-[box-shadow,border-color] duration-panel ease-brand hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring',
          active ? t.tile : 'bg-card',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={cn('flex size-9 items-center justify-center rounded-lg ring-1 ring-inset', active ? t.icon : 'bg-muted text-muted-foreground ring-border')}>
            <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
          </span>
          <span className="tabular text-[11.5px] font-medium text-muted-foreground">{percent(value, total)}%</span>
        </div>
        <div className="caption-label mt-4">{label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <AnimatedNumber value={value} className={cn('text-2xl font-semibold tracking-tight', active && t.value)} />
          <span className="text-caption text-muted-foreground">of {formatNumber(total)}</span>
        </div>
        <MiniProgress value={value} max={total} tone={tone} className="mt-3" label={`${label} share of products`} />
      </Link>
    </motion.div>
  );
}

interface KpiBentoProps {
  summary?: DashboardSummary;
  loading: boolean;
  trendIn: number[];
  trendOut: number[];
}

export function KpiBento({ summary, loading, trendIn, trendOut }: KpiBentoProps) {
  return (
    <motion.section variants={fadeUp} aria-labelledby="kpi-title" className="space-y-3">
      <h2 id="kpi-title" className="sr-only">
        Key metrics
      </h2>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          {loading || !summary ? (
            <div role="status" className="flex h-full min-h-[240px] flex-col rounded-2xl border bg-card p-6 shadow-card">
              <span className="sr-only">Loading…</span>
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="mt-5 h-3 w-24" />
              <Skeleton className="mt-2 h-10 w-40" />
              <Skeleton className="mt-3 h-3 w-56" />
              <Skeleton className="mt-auto h-2 w-full rounded-full" />
            </div>
          ) : (
            <StockValueTile kpis={summary.kpis} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3 xl:col-span-8">
          {loading || !summary ? (
            Array.from({ length: 6 }, (_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                index={0}
                label="Products in stock"
                value={summary.kpis.totalProductsInStock}
                icon={Boxes}
                tone="success"
                hint={`of ${formatNumber(summary.kpis.totalProducts)} products`}
                to="/stock?stockStatus=in"
              />
              <ThresholdTile index={1} label="Low stock" value={summary.kpis.lowStock} total={summary.kpis.totalProducts} to="/stock?stockStatus=low" icon={AlertTriangle} tone="warning" />
              <ThresholdTile index={2} label="Out of stock" value={summary.kpis.outOfStock} total={summary.kpis.totalProducts} to="/stock?stockStatus=out" icon={PackageX} tone="destructive" />
              <KpiCard
                index={3}
                label="Pending receipts"
                value={summary.kpis.pendingReceipts}
                icon={ArrowDownToLine}
                tone="success"
                sparkline={trendIn}
                hint="Open receipts · 14-day inflow"
                to="/operations/receipts"
              />
              <KpiCard
                index={4}
                label="Pending deliveries"
                value={summary.kpis.pendingDeliveries}
                icon={ArrowUpFromLine}
                tone="info"
                sparkline={trendOut}
                hint="Open deliveries · 14-day outflow"
                to="/operations/deliveries"
              />
              <KpiCard
                index={5}
                label="Internal transfers"
                value={summary.kpis.internalTransfersScheduled}
                icon={ArrowLeftRight}
                tone="primary"
                hint="Scheduled between locations"
                to="/operations/transfers"
              />
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
