import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Sku } from '@/components/common/bits';
import { formatNumber } from '@/lib/format';
import type { DashboardCharts } from '@/lib/types';
import { EASE, ListSkeleton, Panel, PanelIcon } from './primitives';

interface TopMoversProps {
  data?: DashboardCharts['topMovers'];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  days: number;
  className?: string;
}

export function TopMovers({ data, loading, error, onRetry, retrying, days, className }: TopMoversProps) {
  const max = Math.max(1, ...(data ?? []).map((d) => d.quantity));

  return (
    <Panel
      id="top-movers"
      className={className}
      icon={
        <PanelIcon tone="success">
          <TrendingUp />
        </PanelIcon>
      }
      title="Top moving products"
      description={`By units moved in and out · ${days} days`}
    >
      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} retrying={retrying} className="border-0 py-8" />
      ) : loading || !data ? (
        <ListSkeleton rows={5} />
      ) : data.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nothing moving yet" description="Products appear here once receipts or deliveries are validated." className="py-10" />
      ) : (
        <ol className="space-y-3.5">
          {data.map((m, i) => (
            <li key={m.productId} className="min-w-0">
              <div className="mb-1.5 flex items-baseline gap-2 text-[13px]">
                <span className="tabular w-4 shrink-0 text-[11.5px] font-semibold text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  {m.sku && <Sku className="mr-1.5">[{m.sku}]</Sku>}
                  <span className="font-medium">{m.name}</span>
                </span>
                <span className="tabular shrink-0 font-mono text-[12.5px] font-semibold">
                  {formatNumber(m.quantity)}
                  {m.uom && <span className="ml-1 font-sans text-[11px] font-normal text-muted-foreground">{m.uom}</span>}
                </span>
              </div>
              <div className="ml-6 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${(m.quantity / max) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: EASE }}
                  />
                </div>
                <span className="tabular w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                  {m.moves} move{m.moves === 1 ? '' : 's'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
