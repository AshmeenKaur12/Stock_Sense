import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { MiniProgress } from '@/components/common/bits';
import { StockStatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProductCell } from './ProductCell';
import { StockAdjustPopover } from './StockAdjustPopover';

export type StockSort = '' | 'name' | 'sku' | 'onHand' | '-onHand' | 'status';

interface ColumnOptions {
  expandedId: string;
  warehouse: string;
  canAdjust: boolean;
  sort: StockSort;
  onSortChange: (sort: StockSort) => void;
}

export const freeTone = (row: Pick<StockRow, 'status' | 'freeToUse'>) =>
  row.status === 'out' || row.freeToUse <= 0 ? 'destructive' : row.status === 'low' ? 'warning' : 'success';

/** "Free to use" number + progress (free / on hand) + reserved caption. */
export function FreeToUse({ row, compact }: { row: StockRow; compact?: boolean }) {
  return (
    <div className={cn('min-w-0', compact ? 'w-full' : 'w-[8.5rem]')}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('tabular font-mono text-sm font-semibold', row.freeToUse <= 0 && 'text-destructive')}>{formatNumber(row.freeToUse)}</span>
        <span className="truncate text-caption text-muted-foreground">{row.reserved > 0 ? `${formatNumber(row.reserved)} reserved` : 'none reserved'}</span>
      </div>
      <MiniProgress
        value={row.freeToUse}
        max={row.onHand}
        tone={freeTone(row)}
        className="mt-1.5"
        label={`${formatNumber(row.freeToUse)} of ${formatNumber(row.onHand)} ${row.uom} free to use`}
      />
    </div>
  );
}

function SortHeader({ label, sort, asc, desc, onSortChange, align = 'left' }: { label: string; sort: StockSort; asc: StockSort; desc: StockSort; onSortChange: (s: StockSort) => void; align?: 'left' | 'right' }) {
  const state = sort === asc ? 'ascending' : sort === desc ? 'descending' : 'none';
  const next: StockSort = state === 'none' ? desc : state === 'descending' ? asc : '';
  const Icon = state === 'ascending' ? ArrowUp : state === 'descending' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSortChange(next)}
      aria-label={`Sort by ${label.toLowerCase()}${state === 'none' ? '' : `, currently ${state}`}`}
      className={cn(
        'group/sort -mx-1 inline-flex items-center gap-1 rounded px-1 uppercase tracking-[0.06em] transition-colors hover:text-foreground',
        state !== 'none' && 'text-foreground',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon className={cn('size-3', state === 'none' && 'opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60')} aria-hidden />
    </button>
  );
}

export function buildStockColumns({ expandedId, warehouse, canAdjust, sort, onSortChange }: ColumnOptions): ColumnDef<StockRow, unknown>[] {
  const columns: ColumnDef<StockRow, unknown>[] = [
    {
      id: 'expander',
      header: () => <span className="sr-only">Expand</span>,
      cell: ({ row }) => {
        const open = row.original._id === expandedId;
        return (
          <span className="flex items-center justify-center text-muted-foreground">
            <ChevronRight className={cn('size-4 transition-transform duration-panel ease-brand', open && 'rotate-90 text-primary')} aria-hidden />
            <span className="sr-only">{open ? 'Hide locations' : 'Show locations'}</span>
          </span>
        );
      },
      meta: { className: 'w-10 !pr-0' },
    },
    {
      id: 'product',
      header: () => <SortHeader label="Product" sort={sort} asc="name" desc="name" onSortChange={onSortChange} />,
      cell: ({ row }) => <ProductCell row={row.original} />,
      meta: { className: 'min-w-[14rem] max-w-[22rem] !pl-2' },
    },
    {
      id: 'cost',
      header: 'Per unit cost',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          <span className="tabular font-mono text-[13px]">{formatCurrency(row.original.perUnitCost)}</span>
          <span className="ml-1 text-caption text-muted-foreground">/ {row.original.uom}</span>
        </span>
      ),
      meta: { className: 'whitespace-nowrap' },
    },
    {
      id: 'onHand',
      header: () => <SortHeader label="On hand" sort={sort} asc="onHand" desc="-onHand" onSortChange={onSortChange} align="right" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          <span className={cn('tabular font-mono text-sm font-semibold', row.original.onHand <= 0 && 'text-muted-foreground')}>{formatNumber(row.original.onHand)}</span>
          <span className="ml-1 text-caption text-muted-foreground">{row.original.uom}</span>
        </span>
      ),
      meta: { className: 'text-right whitespace-nowrap' },
    },
    {
      id: 'free',
      header: 'Free to use',
      cell: ({ row }) => <FreeToUse row={row.original} />,
    },
    {
      id: 'status',
      header: () => <SortHeader label="Status" sort={sort} asc="status" desc="status" onSortChange={onSortChange} />,
      cell: ({ row }) => <StockStatusBadge status={row.original.status} />,
    },
    {
      id: 'value',
      header: 'Value',
      cell: ({ row }) => <span className="tabular whitespace-nowrap font-mono text-[13px] text-foreground/90">{formatCurrency(row.original.value)}</span>,
      meta: { className: 'hidden lg:table-cell text-right' },
    },
  ];

  if (canAdjust) {
    columns.push({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <StockAdjustPopover row={row.original} warehouse={warehouse || undefined} />
        </div>
      ),
      meta: { className: 'w-12 !pl-0' },
    });
  }

  return columns;
}
