import { ChevronDown } from 'lucide-react';
import { StockStatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProductCell } from './ProductCell';
import { StockAdjustPopover } from './StockAdjustPopover';
import { FreeToUse } from './stockColumns';

interface StockCardProps {
  row: StockRow;
  expanded: boolean;
  canAdjust: boolean;
  warehouse: string;
}

/** Mobile (< 768px) stock card — replaces the table, no horizontal scrolling. */
export function StockCard({ row, expanded, canAdjust, warehouse }: StockCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ProductCell row={row} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {canAdjust && <StockAdjustPopover row={row} warehouse={warehouse || undefined} alwaysVisible />}
          <span className="flex size-8 items-center justify-center text-muted-foreground">
            <ChevronDown className={cn('size-4 transition-transform duration-panel ease-brand', expanded && 'rotate-180 text-primary')} aria-hidden />
            <span className="sr-only">{expanded ? 'Hide locations' : 'Show locations'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-5 gap-y-2 rounded-xl bg-muted/40 px-3 py-2.5">
        <div>
          <div className="caption-label">On hand</div>
          <div className="mt-0.5 whitespace-nowrap">
            <span className="tabular font-mono text-base font-semibold">{formatNumber(row.onHand)}</span>
            <span className="ml-1 text-caption text-muted-foreground">{row.uom}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="caption-label mb-0.5">Free to use</div>
          <FreeToUse row={row} compact />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <StockStatusBadge status={row.status} />
        <span className="tabular font-mono">
          {formatCurrency(row.perUnitCost)} / {row.uom}
          <span className="mx-1.5 text-border" aria-hidden>
            |
          </span>
          <span className="sr-only">Value </span>
          {formatCurrency(row.value)}
        </span>
      </div>
    </div>
  );
}
