import { format, isValid, parseISO } from 'date-fns';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, History, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LateBadge, StatusBadge } from '@/components/common/StatusBadge';
import { ContactName, LocationFlow, Reference } from '@/components/common/bits';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import type { OperationRow, OperationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Panel, PanelIcon } from './primitives';

const TYPE_META: Record<OperationType, { label: string; segment: string; icon: LucideIcon; tile: string }> = {
  receipt: { label: 'Receipt', segment: 'receipts', icon: ArrowDownToLine, tile: 'bg-success/10 text-success ring-success/20' },
  delivery: { label: 'Delivery', segment: 'deliveries', icon: ArrowUpFromLine, tile: 'bg-info/10 text-info ring-info/20' },
  internal: { label: 'Internal transfer', segment: 'transfers', icon: ArrowLeftRight, tile: 'bg-primary/10 text-primary ring-primary/20' },
  adjustment: { label: 'Adjustment', segment: 'adjustments', icon: SlidersHorizontal, tile: 'bg-warning/10 text-warning ring-warning/20' },
};

const GRID = 'md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.5fr)_96px_92px] md:items-center md:gap-4';

const shortDate = (iso: string) => {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd/MM') : '—';
};

function Row({ op }: { op: OperationRow }) {
  const meta = TYPE_META[op.type];
  const Icon = meta.icon;
  const done = op.status === 'done' || op.status === 'canceled';
  const late = op.isLate && !done;

  return (
    <li>
      <Link
        to={`/operations/${meta.segment}/${op._id}`}
        className={cn(
          'flex flex-col gap-2.5 px-5 py-3.5 transition-colors duration-micro hover:bg-accent/50 focus-visible:relative focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-[56px] md:py-2.5',
          GRID,
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', meta.tile)} title={meta.label}>
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{meta.label}</span>
          </span>
          <div className="min-w-0">
            <Reference className="block truncate">{op.reference}</Reference>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {formatNumber(op.totalQty)} units{op.products.length > 0 ? ` · ${op.products.slice(0, 2).join(', ')}${op.products.length > 2 ? ` +${op.products.length - 2}` : ''}` : ''}
            </span>
          </div>
          <StatusBadge status={op.status} className="ml-auto md:hidden" />
        </div>
        <div className="min-w-0 text-[13px]">
          <ContactName name={op.contact} />
        </div>
        <div className="min-w-0">
          <LocationFlow from={op.from} fromType={op.fromType} to={op.to} toType={op.toType} />
        </div>
        <div className={cn('flex items-center gap-1.5 text-[13px] md:flex-col md:items-start md:gap-0.5', late ? 'text-destructive' : 'text-muted-foreground')}>
          <span className="tabular font-mono text-[12.5px]">
            <span className="sr-only">Scheduled </span>
            {shortDate(op.scheduleDate)}
          </span>
          {late && <LateBadge />}
        </div>
        <div className="hidden md:block">
          <StatusBadge status={op.status} />
        </div>
      </Link>
    </li>
  );
}

interface RecentOperationsProps {
  data?: OperationRow[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  filtered: boolean;
  className?: string;
}

export function RecentOperations({ data, loading, error, onRetry, retrying, filtered, className }: RecentOperationsProps) {
  return (
    <Panel
      id="recent-ops"
      className={className}
      bodyClassName="px-0 pb-2"
      icon={
        <PanelIcon>
          <History />
        </PanelIcon>
      }
      title="Recent operations"
      description="Latest receipts, deliveries, transfers and adjustments"
      actions={
        <Link to="/move-history" className="rounded-md text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          Move history
        </Link>
      }
    >
      {error && !data ? (
        <div className="px-5 pb-3">
          <ErrorState error={error} onRetry={onRetry} retrying={retrying} className="border-0 py-10" />
        </div>
      ) : loading || !data ? (
        <div role="status" className="divide-y border-t">
          <span className="sr-only">Loading…</span>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-14 items-center gap-4 px-5">
              <Skeleton className="size-7 shrink-0 rounded-lg" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="hidden h-3.5 w-24 md:block" />
              <Skeleton className="hidden h-5 w-40 rounded-md md:block" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={History}
          title={filtered ? 'No operations match these filters' : 'No operations yet'}
          description={filtered ? 'Try clearing a filter to widen the view.' : 'Create a receipt or delivery and it will show up here.'}
          className="py-12"
        />
      ) : (
        <>
          <div className={cn('caption-label hidden border-y bg-muted/30 px-5 py-2', GRID)} aria-hidden>
            <span>Reference</span>
            <span>Contact</span>
            <span>From → To</span>
            <span>Scheduled</span>
            <span>Status</span>
          </div>
          <ul className="divide-y border-t md:border-t-0">
            {data.map((op) => (
              <Row key={op._id} op={op} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
