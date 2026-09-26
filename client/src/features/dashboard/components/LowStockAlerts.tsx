import { motion } from 'framer-motion';
import { BellRing, PackageCheck, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { StockStatusBadge } from '@/components/common/StatusBadge';
import { MiniProgress, Sku } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import type { DashboardSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EASE, ListSkeleton, Panel, PanelIcon } from './primitives';

type Alert = DashboardSummary['alerts'][number];

function AlertRow({ alert, index }: { alert: Alert; index: number }) {
  const out = alert.status === 'out';
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.04, ease: EASE }}
      className={cn('rounded-xl border p-3 transition-colors duration-micro', out ? 'border-destructive/20 bg-destructive/[0.04]' : 'border-warning/20 bg-warning/[0.04]')}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px]">
            <Sku className="mr-1.5">[{alert.sku}]</Sku>
            <span className="font-medium">{alert.name}</span>
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            <span className={cn('tabular font-mono font-semibold', out ? 'text-destructive' : 'text-warning')}>{formatNumber(alert.freeToUse)}</span> free · min{' '}
            <span className="tabular font-mono">{formatNumber(alert.minQty)}</span>
            {alert.uom && <span> {alert.uom}</span>}
          </div>
        </div>
        <StockStatusBadge status={alert.status} className="shrink-0" />
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <MiniProgress
          value={alert.freeToUse}
          max={alert.minQty}
          tone={out ? 'destructive' : 'warning'}
          className="flex-1"
          label={`${alert.name}: ${alert.freeToUse} of minimum ${alert.minQty}`}
        />
        <Button asChild size="sm" variant="outline" className="h-7 shrink-0 gap-1 rounded-lg px-2.5 text-[12px]">
          <Link to={`/operations/receipts/new?product=${alert._id}`} aria-label={`Create receipt for ${alert.name}`}>
            <Plus aria-hidden />
            Create Receipt
          </Link>
        </Button>
      </div>
    </motion.li>
  );
}

interface LowStockAlertsProps {
  alerts?: Alert[];
  lowCount?: number;
  outCount?: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  className?: string;
}

export function LowStockAlerts({ alerts, lowCount = 0, outCount = 0, loading, error, onRetry, retrying, className }: LowStockAlertsProps) {
  const total = lowCount + outCount;
  return (
    <Panel
      id="low-stock"
      className={className}
      icon={
        <PanelIcon tone="warning">
          <BellRing />
        </PanelIcon>
      }
      title="Low-stock alerts"
      description="Below the reorder minimum"
      actions={
        total > 0 ? (
          <Link to="/stock?stockStatus=low" className="rounded-md text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">
            View all <span className="tabular">({formatNumber(total)})</span>
          </Link>
        ) : undefined
      }
    >
      {error && !alerts ? (
        <ErrorState error={error} onRetry={onRetry} retrying={retrying} className="border-0 py-8" />
      ) : loading || !alerts ? (
        <ListSkeleton rows={4} />
      ) : alerts.length === 0 ? (
        <EmptyState icon={PackageCheck} title="All stocked up" description="Every product with a reorder rule is above its minimum." className="py-10" />
      ) : (
        <ul className="space-y-2.5">
          {alerts.map((a, i) => (
            <AlertRow key={a._id} alert={a} index={i} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
