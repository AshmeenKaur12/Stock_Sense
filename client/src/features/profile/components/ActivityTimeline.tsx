import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, History, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SignedQty, Sku } from '@/components/common/bits';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { ActivityItem, MoveDirection, OperationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useMyActivity } from '../queries';

const OP_SEGMENT: Record<OperationType, string> = { receipt: 'receipts', delivery: 'deliveries', internal: 'transfers', adjustment: 'adjustments' };
const OP_LABEL: Record<OperationType, string> = { receipt: 'Receipt', delivery: 'Delivery', internal: 'Internal transfer', adjustment: 'Adjustment' };
const OP_ICON: Record<OperationType, LucideIcon> = { receipt: ArrowDownToLine, delivery: ArrowUpFromLine, internal: ArrowLeftRight, adjustment: SlidersHorizontal };
const OP_TONE: Record<OperationType, string> = {
  receipt: 'text-success bg-success/10 border-success/25',
  delivery: 'text-destructive bg-destructive/10 border-destructive/25',
  internal: 'text-info bg-info/10 border-info/25',
  adjustment: 'text-warning bg-warning/10 border-warning/25',
};
const MOVE_ICON: Record<MoveDirection, LucideIcon> = { in: ArrowDownToLine, out: ArrowUpFromLine, internal: ArrowLeftRight, adjust: SlidersHorizontal };
const MOVE_TONE: Record<MoveDirection, string> = { in: OP_TONE.receipt, out: OP_TONE.delivery, internal: OP_TONE.internal, adjust: OP_TONE.adjustment };
const MOVE_LABEL: Record<MoveDirection, string> = { in: 'Stock in', out: 'Stock out', internal: 'Moved', adjust: 'Adjusted' };

const refLink = 'rounded font-mono text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring';

function Row({ item, last, index }: { item: ActivityItem; last: boolean; index: number }) {
  const Icon = item.kind === 'operation' ? OP_ICON[item.type] : MOVE_ICON[item.direction];
  const tone = item.kind === 'operation' ? OP_TONE[item.type] : MOVE_TONE[item.direction];
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 10) * 0.03 }}
      className="relative flex gap-3 pb-5 last:pb-0"
    >
      {!last && <span aria-hidden className="absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-px bg-border" />}
      <span className={cn('relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border', tone)} aria-hidden>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {item.kind === 'operation' ? (
            <>
              <span className="text-[13px] text-muted-foreground">{OP_LABEL[item.type]}</span>
              <Link to={`/operations/${OP_SEGMENT[item.type]}/${item.id}`} className={refLink}>
                {item.reference}
              </Link>
              <StatusBadge status={item.status} />
            </>
          ) : (
            <>
              <span className="text-[13px] text-muted-foreground">{MOVE_LABEL[item.direction]}</span>
              <SignedQty value={item.effect * item.quantity} neutral={item.effect === 0} className="text-[13px]" />
              <Link to={`/move-history?search=${encodeURIComponent(item.reference)}`} className={refLink}>
                {item.reference}
              </Link>
            </>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
          {item.kind === 'move' && item.product && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Sku>{item.product.sku}</Sku>
              <span className="truncate">{item.product.name}</span>
              <span aria-hidden>·</span>
            </span>
          )}
          <time dateTime={item.at} title={formatDateTime(item.at)} className="shrink-0">
            {formatRelative(item.at)}
          </time>
        </div>
      </div>
    </motion.li>
  );
}

export function ActivityTimeline() {
  const { data, isLoading, error, refetch, isRefetching } = useMyActivity();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} className="border-0 py-10" />;
  if (isLoading)
    return (
      <div role="status" className="space-y-5">
        <span className="sr-only">Loading activity…</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  if (!data?.length)
    return <EmptyState icon={History} title="No activity yet" description="Operations you create or handle, and the stock moves you validate, will show up here." className="py-10" />;

  return (
    <ol aria-label="Recent activity">
      {data.map((item, i) => (
        <Row key={`${item.kind}-${item.id}`} item={item} index={i} last={i === data.length - 1} />
      ))}
    </ol>
  );
}
