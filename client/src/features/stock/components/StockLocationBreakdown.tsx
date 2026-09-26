import { motion } from 'framer-motion';
import { History, MapPinOff, Warehouse as WarehouseIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LocationChip, MiniProgress } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/axios';
import { formatNumber } from '@/lib/format';
import type { StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useStockLocations } from '../queries';

interface StockLocationBreakdownProps {
  row: StockRow;
  /** false while the panel animates closed (kept mounted for the exit). */
  open: boolean;
  warehouse?: string;
  onClosed: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Animated per-location breakdown rendered below an expanded stock row. */
export function StockLocationBreakdown({ row, open, warehouse, onClosed }: StockLocationBreakdownProps) {
  const { data, isLoading, error, refetch, isRefetching } = useStockLocations(row._id, true, warehouse);
  const locations = data?.locations ?? [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      onAnimationComplete={() => {
        if (!open) onClosed();
      }}
      className="overflow-hidden"
      id={`stock-locations-${row._id}`}
      aria-label={`Stock by location for ${row.name}`}
      role="region"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative px-4 pb-4 pt-3 md:pl-[4.25rem] md:pr-5">
        <span aria-hidden className="absolute bottom-4 left-[2.1rem] top-0 hidden w-px bg-gradient-to-b from-primary/40 to-transparent md:block" />
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="caption-label">Stock by location</span>
          <span className="flex items-center gap-3 text-caption text-muted-foreground">
            {data && locations.length > 0 && (
              <span className="hidden xs:inline">
                {locations.length} {locations.length === 1 ? 'location' : 'locations'}
              </span>
            )}
            <Link
              to={`/move-history?product=${row._id}`}
              className="inline-flex items-center gap-1 rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <History className="size-3.5" aria-hidden />
              Move history
            </Link>
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-1.5" role="status">
            <span className="sr-only">Loading locations…</span>
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-[13px]">
            <span className="text-destructive">{getErrorMessage(error, 'Could not load locations')}</span>
            <Button size="sm" variant="outline" onClick={() => void refetch()} loading={isRefetching}>
              Retry
            </Button>
          </div>
        ) : locations.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed px-3 py-3 text-[13px] text-muted-foreground">
            <MapPinOff className="size-4 shrink-0" aria-hidden />
            Not stocked in any location{warehouse ? ' of this warehouse' : ''} yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card/60">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))] gap-3 border-b bg-muted/40 px-3 py-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:grid">
              <span>Warehouse</span>
              <span>Location</span>
              <span className="text-right">On hand</span>
              <span className="text-right">Reserved</span>
              <span className="text-right">Free to use</span>
            </div>
            <ul>
              {locations.map((l, i) => (
                <motion.li
                  key={l._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 + i * 0.03, ease: EASE }}
                  className="grid grid-cols-2 items-center gap-x-3 gap-y-1.5 border-b px-3 py-2.5 text-[13px] last:border-b-0 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <WarehouseIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">
                      <span className="font-mono text-[11.5px] text-muted-foreground">{l.warehouse.shortCode}</span>
                      <span className="ml-1.5 hidden md:inline">{l.warehouse.name}</span>
                    </span>
                  </span>
                  <span className="min-w-0 justify-self-end sm:justify-self-start">
                    <LocationChip name={l.location.fullName} type={l.location.type} />
                  </span>
                  <Metric label="On hand" value={l.onHand} uom={row.uom} strong />
                  <Metric label="Reserved" value={l.reserved} muted={l.reserved === 0} />
                  <span className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:block sm:text-right">
                    <span className="text-caption text-muted-foreground sm:hidden">Free to use</span>
                    <span className="flex items-center gap-2 sm:justify-end">
                      <MiniProgress
                        value={l.freeToUse}
                        max={l.onHand}
                        tone={l.freeToUse <= 0 ? 'destructive' : 'success'}
                        className="w-12 sm:hidden lg:block"
                        label={`${formatNumber(l.freeToUse)} of ${formatNumber(l.onHand)} free`}
                      />
                      <span className={cn('tabular font-mono font-medium', l.freeToUse <= 0 && 'text-destructive')}>{formatNumber(l.freeToUse)}</span>
                    </span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Metric({ label, value, uom, strong, muted }: { label: string; value: number; uom?: string; strong?: boolean; muted?: boolean }) {
  return (
    <span className="flex items-center justify-between gap-2 sm:block sm:text-right">
      <span className="text-caption text-muted-foreground sm:hidden">{label}</span>
      <span className={cn('tabular font-mono', strong && 'font-semibold', muted && 'text-muted-foreground')}>
        {formatNumber(value)}
        {uom && <span className="ml-1 font-sans text-caption font-normal text-muted-foreground">{uom}</span>}
      </span>
    </span>
  );
}
