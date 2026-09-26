import { PieChart as PieIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { DashboardCharts } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Panel, PanelIcon, formatInrCompact, percent } from './primitives';

const PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  '#8B5CF6',
  '#EC4899',
  'hsl(var(--destructive))',
];
const OTHER_COLOR = 'hsl(var(--muted-foreground) / 0.55)';
const MAX_SLICES = 6;

interface Slice {
  name: string;
  value: number;
  onHand: number;
  color: string;
}

interface CategoryDonutProps {
  data?: DashboardCharts['valueByCategory'];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  className?: string;
}

export function CategoryDonut({ data, loading, error, onRetry, retrying, className }: CategoryDonutProps) {
  const [active, setActive] = useState<number | null>(null);

  const { slices, total } = useMemo(() => {
    const rows = [...(data ?? [])].sort((a, b) => b.value - a.value);
    const head = rows.slice(0, MAX_SLICES);
    const tail = rows.slice(MAX_SLICES);
    const out: Slice[] = head.map((r, i) => ({ name: r.category, value: r.value, onHand: r.onHand, color: PALETTE[i % PALETTE.length] }));
    if (tail.length) {
      out.push({
        name: `Other (${tail.length})`,
        value: tail.reduce((s, r) => s + r.value, 0),
        onHand: tail.reduce((s, r) => s + r.onHand, 0),
        color: OTHER_COLOR,
      });
    }
    return { slices: out, total: out.reduce((s, r) => s + r.value, 0) };
  }, [data]);

  const focus = active !== null ? slices[active] : undefined;

  return (
    <Panel
      id="value-by-category"
      className={className}
      icon={
        <PanelIcon tone="info">
          <PieIcon />
        </PanelIcon>
      }
      title="Stock value by category"
      description="Share of on-hand value (₹)"
    >
      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} retrying={retrying} className="border-0 py-10" />
      ) : loading || !data ? (
        <div role="status" className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
          <span className="sr-only">Loading chart…</span>
          <Skeleton className="size-[176px] shrink-0 rounded-full" />
          <div className="w-full space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      ) : slices.length === 0 ? (
        <EmptyState icon={PieIcon} title="No stock value yet" description="Receive products into a warehouse to see how value spreads across categories." className="py-12" />
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
          <div className="relative mx-auto size-[184px] shrink-0" role="img" aria-label={`Donut chart of stock value, total ${formatCurrency(total)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={88}
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  cornerRadius={4}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={700}
                  onMouseEnter={(_, i) => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  {slices.map((s, i) => (
                    <Cell key={s.name} fill={s.color} opacity={active === null || active === i ? 1 : 0.35} className="outline-none transition-opacity duration-micro" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-live="polite">
              <span className="max-w-[112px] truncate text-[11px] font-medium text-muted-foreground">{focus ? focus.name : 'Total value'}</span>
              <span className="tabular text-xl font-semibold tracking-tight">{formatInrCompact(focus ? focus.value : total)}</span>
              {focus && <span className="tabular text-[11px] text-muted-foreground">{percent(focus.value, total)}%</span>}
            </div>
          </div>

          <ul className="w-full min-w-0 space-y-0.5">
            {slices.map((s, i) => (
              <li
                key={s.name}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors duration-micro', active === i && 'bg-accent/70')}
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate" title={`${s.name} · ${formatNumber(s.onHand)} units`}>
                  {s.name}
                </span>
                <span className="tabular font-mono text-[12.5px] font-medium">{formatInrCompact(s.value)}</span>
                <span className="tabular w-12 text-right text-[12px] text-muted-foreground">{percent(s.value, total)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
