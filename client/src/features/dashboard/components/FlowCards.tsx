import { motion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock3,
  Info,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sparkline } from '@/components/common/Sparkline';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AnimatedNumber, EASE, Spotlight, fadeUp, useSpotlight } from './primitives';

type Kind = 'receipt' | 'delivery';

interface Stat {
  key: string;
  label: string;
  value: number;
  to: string;
  icon: LucideIcon;
  dot: string;
  text: string;
  hint: string;
}

interface FlowConfig {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** HSL token for spotlight / accent. */
  accent: 'success' | 'info';
  iconTile: string;
  topLine: string;
  pill: string;
  ctaCount: number;
  ctaLabel: string;
  ctaTo: string;
  today: number;
  stats: Stat[];
  trendLabel: string;
  trendClass: string;
}

const LEGEND: { term: string; text: string }[] = [
  { term: 'To receive / To deliver', text: 'status is Ready' },
  { term: 'Late', text: "schedule date is before today's date (not done or canceled)" },
  { term: 'Operations', text: "schedule date is after today's date (upcoming)" },
  { term: 'Waiting', text: 'waiting for the stock to arrive' },
];

function buildConfig(kind: Kind, s: DashboardSummary): FlowConfig {
  const late = (value: number, to: string): Stat => ({
    key: 'late',
    label: 'Late',
    value,
    to,
    icon: Timer,
    dot: 'bg-destructive',
    text: value > 0 ? 'text-destructive' : 'text-foreground',
    hint: 'Scheduled before today',
  });
  const upcoming = (value: number, to: string): Stat => ({
    key: 'operations',
    label: 'Operations',
    value,
    to,
    icon: CalendarClock,
    dot: 'bg-muted-foreground/60',
    text: 'text-foreground',
    hint: 'Scheduled after today',
  });

  if (kind === 'receipt') {
    return {
      title: 'Receipts',
      subtitle: 'Incoming from vendors',
      icon: ArrowDownToLine,
      accent: 'success',
      iconTile: 'bg-success/10 text-success ring-success/25',
      topLine: 'via-success/60',
      pill: 'from-emerald-600 via-emerald-600 to-teal-600 shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_10px_30px_-10px_rgb(16_185_129/0.6)]',
      ctaCount: s.receipt.toReceive,
      ctaLabel: 'to receive',
      ctaTo: '/operations/receipts?status=ready',
      today: s.receipt.today,
      stats: [late(s.receipt.late, '/operations/receipts?late=true'), upcoming(s.receipt.operations, '/operations/receipts?upcoming=true')],
      trendLabel: 'Units received · 14 days',
      trendClass: 'text-success',
    };
  }
  return {
    title: 'Deliveries',
    subtitle: 'Outgoing to customers',
    icon: ArrowUpFromLine,
    accent: 'info',
    iconTile: 'bg-info/10 text-info ring-info/25',
    topLine: 'via-info/60',
    pill: 'from-indigo-600 via-indigo-600 to-sky-600 shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_10px_30px_-10px_rgb(99_102_241/0.65)]',
    ctaCount: s.delivery.toDeliver,
    ctaLabel: 'to Deliver',
    ctaTo: '/operations/deliveries?status=ready',
    today: s.delivery.today,
    stats: [
      late(s.delivery.late, '/operations/deliveries?late=true'),
      {
        key: 'waiting',
        label: 'Waiting',
        value: s.delivery.waiting,
        to: '/operations/deliveries?status=waiting',
        icon: Clock3,
        dot: 'bg-warning',
        text: s.delivery.waiting > 0 ? 'text-warning' : 'text-foreground',
        hint: 'Waiting for stock',
      },
      upcoming(s.delivery.operations, '/operations/deliveries?upcoming=true'),
    ],
    trendLabel: 'Units shipped · 14 days',
    trendClass: 'text-info',
  };
}

function Legend({ title }: { title: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`How ${title.toLowerCase()} are counted`}
          className="relative z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-micro hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="max-w-[280px] p-3">
        <div className="caption-label mb-2">Legend</div>
        <dl className="space-y-1.5 text-[12px] font-normal leading-4">
          {LEGEND.map((l) => (
            <div key={l.term}>
              <dt className="inline font-semibold text-foreground">{l.term}: </dt>
              <dd className="inline text-muted-foreground">{l.text}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}

function FlowCard({ kind, summary, trend }: { kind: Kind; summary: DashboardSummary; trend: number[] }) {
  const c = buildConfig(kind, summary);
  const { ref, onMouseMove } = useSpotlight<HTMLElement>();
  const Icon = c.icon;
  const trendTotal = trend.reduce((a, b) => a + b, 0);

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMouseMove}
      variants={fadeUp}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: EASE } }}
      aria-labelledby={`flow-${kind}-title`}
      className="group relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-shadow duration-panel ease-brand hover:shadow-lift sm:p-6"
    >
      <Spotlight color={c.accent} />
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', c.topLine)} aria-hidden />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', c.iconTile)}>
            <Icon className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`flow-${kind}-title`} className="text-h2">
              {c.title}
            </h2>
            <p className="truncate text-[13px] text-muted-foreground">{c.subtitle}</p>
          </div>
        </div>
        <Legend title={c.title} />
      </header>

      <div className="relative mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:items-stretch">
        <div className="flex min-w-0 flex-col gap-3">
          <Link
            to={c.ctaTo}
            className={cn(
              'group/cta relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-br px-5 py-4 text-white transition-[filter,transform] duration-micro ease-brand hover:brightness-110 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              c.pill,
            )}
            aria-label={`${formatNumber(c.ctaCount)} ${c.ctaLabel} — open ready ${c.title.toLowerCase()}`}
          >
            <span className="pointer-events-none absolute -right-6 -top-10 size-28 rounded-full bg-white/15 blur-2xl" aria-hidden />
            <span className="relative flex items-baseline gap-2">
              <AnimatedNumber value={c.ctaCount} className="text-[34px] font-semibold leading-none tracking-tight" />
              <span className="text-[15px] font-medium text-white/90">{c.ctaLabel}</span>
            </span>
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 transition-transform duration-micro ease-brand group-hover/cta:translate-x-0.5">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              <span>
                <span className="tabular font-medium text-foreground">{formatNumber(c.today)}</span> scheduled today
              </span>
            </span>
          </div>
          {trend.length > 1 && (
            <div className="mt-auto flex items-end justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium text-muted-foreground">{c.trendLabel}</div>
                <div className="tabular font-mono text-[13px] font-semibold">
                  {kind === 'receipt' ? '+' : '−'}
                  {formatNumber(trendTotal)}
                </div>
              </div>
              <Sparkline data={trend} colorClassName={c.trendClass} width={88} height={28} />
            </div>
          )}
        </div>

        <ul className="flex min-w-0 flex-col divide-y rounded-xl border bg-background/40 dark:bg-background/30">
          {c.stats.map((s) => {
            const StatIcon = s.icon;
            return (
              <li key={s.key} className="flex-1">
                <Link
                  to={s.to}
                  className="group/stat flex h-full min-h-[52px] items-center gap-3 px-3.5 py-2.5 transition-colors duration-micro first:rounded-t-xl last:rounded-b-xl hover:bg-accent/60 focus-visible:relative focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${s.value} ${s.label.toLowerCase()} — ${s.hint.toLowerCase()}`}
                >
                  <span className={cn('size-2 shrink-0 rounded-full', s.dot)} aria-hidden />
                  <StatIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium">{s.label}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{s.hint}</span>
                  </span>
                  <AnimatedNumber value={s.value} className={cn('text-lg font-semibold', s.text)} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-micro group-hover/stat:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.article>
  );
}

function FlowCardSkeleton() {
  return (
    <div role="status" className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-[70px] w-full rounded-2xl" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton className="h-full min-h-[140px] w-full rounded-xl" />
      </div>
    </div>
  );
}

interface FlowCardsProps {
  summary?: DashboardSummary;
  loading: boolean;
  trendIn: number[];
  trendOut: number[];
}

export function FlowCards({ summary, loading, trendIn, trendOut }: FlowCardsProps) {
  if (loading || !summary) {
    return (
      <>
        <FlowCardSkeleton />
        <FlowCardSkeleton />
      </>
    );
  }
  return (
    <>
      <FlowCard kind="receipt" summary={summary} trend={trendIn} />
      <FlowCard kind="delivery" summary={summary} trend={trendOut} />
    </>
  );
}
