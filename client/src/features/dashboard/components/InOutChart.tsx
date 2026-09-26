import { format, parseISO } from 'date-fns';
import { Activity, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompact, formatNumber, formatSigned } from '@/lib/format';
import type { DashboardCharts } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Panel, PanelIcon } from './primitives';

type Point = DashboardCharts['inOut'][number];

const IN_COLOR = 'hsl(var(--success))';
const OUT_COLOR = 'hsl(var(--destructive))';

function ChartTooltip({ active, payload }: Partial<TooltipProps<number, string>>) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  const net = point.in - point.out;
  return (
    <div className="min-w-[168px] rounded-xl border bg-popover/95 p-3 text-popover-foreground shadow-lift backdrop-blur">
      <div className="caption-label mb-2">{format(parseISO(point.date), 'dd/MM · EEE')}</div>
      <div className="space-y-1.5 text-[13px]">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            In
          </span>
          <span className="tabular font-mono font-semibold text-success">+{formatNumber(point.in)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full bg-destructive" aria-hidden />
            Out
          </span>
          <span className="tabular font-mono font-semibold text-destructive">−{formatNumber(point.out)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t pt-1.5">
          <span className="text-muted-foreground">Net</span>
          <span className="tabular font-mono font-semibold">{formatSigned(net)}</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ label, value, sign, dot, icon: Icon }: { label: string; value: number; sign: '+' | '−'; dot: string; icon: typeof ArrowDownToLine }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background/50 px-2.5 py-1.5">
      <span className={cn('size-2 rounded-full', dot)} aria-hidden />
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="tabular font-mono text-[12.5px] font-semibold">
        {sign}
        {formatNumber(value)}
      </span>
    </div>
  );
}

interface InOutChartProps {
  data?: DashboardCharts['inOut'];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  days: number;
  className?: string;
}

export function InOutChart({ data, loading, error, onRetry, retrying, days, className }: InOutChartProps) {
  const uid = useId().replace(/:/g, '');
  const totals = useMemo(() => (data ?? []).reduce((acc, d) => ({ in: acc.in + d.in, out: acc.out + d.out }), { in: 0, out: 0 }), [data]);
  const empty = !!data && totals.in === 0 && totals.out === 0;

  return (
    <Panel
      id="inout"
      className={className}
      icon={
        <PanelIcon>
          <Activity />
        </PanelIcon>
      }
      title="Inventory movement"
      description={`Stock in vs out · last ${days} days`}
      actions={
        data && !empty ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Legend">
            <LegendItem label="In" value={totals.in} sign="+" dot="bg-success" icon={ArrowDownToLine} />
            <LegendItem label="Out" value={totals.out} sign="−" dot="bg-destructive" icon={ArrowUpFromLine} />
          </div>
        ) : undefined
      }
    >
      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} retrying={retrying} className="border-0 py-10" />
      ) : loading || !data ? (
        <div role="status" className="relative h-[280px]">
          <span className="sr-only">Loading chart…</span>
          <div className="absolute inset-0 flex flex-col justify-between py-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-px w-full" />
            ))}
          </div>
          <Skeleton className="absolute inset-x-0 bottom-0 h-2/3 rounded-xl opacity-60" />
        </div>
      ) : empty ? (
        <EmptyState icon={Activity} title="No stock movement yet" description={`Validated receipts and deliveries from the last ${days} days will chart here.`} className="py-12" />
      ) : (
        <div className="h-[280px] w-full" role="img" aria-label={`Area chart: ${formatNumber(totals.in)} units in and ${formatNumber(totals.out)} units out over ${days} days`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id={`${uid}-in`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={IN_COLOR} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={IN_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${uid}-out`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={OUT_COLOR} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={OUT_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => format(parseISO(d), 'dd MMM')}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.35, strokeDasharray: '3 3' }} wrapperStyle={{ outline: 'none' }} />
              <Area
                type="monotone"
                dataKey="in"
                name="In"
                stroke={IN_COLOR}
                strokeWidth={2}
                fill={`url(#${uid}-in)`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: IN_COLOR }}
                animationDuration={700}
              />
              <Area
                type="monotone"
                dataKey="out"
                name="Out"
                stroke={OUT_COLOR}
                strokeWidth={2}
                fill={`url(#${uid}-out)`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: OUT_COLOR }}
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
