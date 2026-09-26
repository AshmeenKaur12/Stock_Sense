import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type VisibilityState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

export interface DataTableProps<T> {
  data: T[] | undefined;
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  /** Mobile (< 768px) card renderer. Tables become cards on small screens. */
  renderCard?: (row: T) => ReactNode;
  /** Extra classes per row (e.g. IN/OUT tint). */
  rowClassName?: (row: T) => string | undefined;
  /** Rendered below a row when it is expanded. */
  renderExpanded?: (row: T) => ReactNode;
  isExpanded?: (row: T) => boolean;
  columnVisibility?: VisibilityState;
  empty?: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode };
  footer?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

/**
 * Premium data table: rounded container, sticky header, 52px rows, hover state,
 * skeleton/empty/error states and a card layout on mobile.
 * Columns can declare `meta: { className, headerClassName }` (e.g. `hidden lg:table-cell`).
 */
export function DataTable<T>({
  data,
  columns,
  isLoading,
  error,
  onRetry,
  onRowClick,
  getRowId,
  renderCard,
  rowClassName,
  renderExpanded,
  isExpanded,
  columnVisibility,
  empty,
  footer,
  className,
  'aria-label': ariaLabel,
}: DataTableProps<T>) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: { columnVisibility },
  });

  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isLoading && !data) return <LoadingState variant="table" rows={7} />;

  const rows = table.getRowModel().rows;
  if (!rows.length && empty) {
    return (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
      </div>
    );
  }

  const clickable = (row: Row<T>) =>
    onRowClick
      ? {
          role: 'link' as const,
          tabIndex: 0,
          onClick: () => onRowClick(row.original),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(row.original);
            }
          },
        }
      : {};

  return (
    <div className={cn('relative', className)}>
      {/* Desktop / tablet table */}
      <div className={cn('overflow-hidden rounded-2xl border bg-card shadow-card', renderCard && 'hidden md:block', isLoading && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm" aria-label={ariaLabel}>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      scope="col"
                      className={cn(
                        'h-10 whitespace-nowrap border-b bg-muted/60 px-4 text-left align-middle text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground backdrop-blur first:pl-5 last:pr-5',
                        (h.column.columnDef.meta as { headerClassName?: string } | undefined)?.headerClassName,
                        (h.column.columnDef.meta as { className?: string } | undefined)?.className,
                      )}
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <Fragment key={row.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.015 }}
                    {...clickable(row)}
                    className={cn(
                      'group h-[52px] transition-colors duration-micro [&>td]:border-b [&>td]:border-border/60 last:[&>td]:border-b-0',
                      onRowClick && 'cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none',
                      !onRowClick && 'hover:bg-accent/30',
                      rowClassName?.(row.original),
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn('px-4 align-middle first:pl-5 last:pr-5', (cell.column.columnDef.meta as { className?: string } | undefined)?.className)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                  {renderExpanded && isExpanded?.(row.original) && (
                    <tr>
                      <td colSpan={row.getVisibleCells().length} className="border-b border-border/60 bg-muted/20 p-0">
                        {renderExpanded(row.original)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {footer && <div className="border-t px-5 py-3">{footer}</div>}
      </div>

      {/* Mobile cards */}
      {renderCard && (
        <div className="space-y-3 md:hidden">
          {rows.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.02 }}
              {...clickable(row)}
              className={cn('rounded-2xl border bg-card p-4 shadow-card', onRowClick && 'cursor-pointer active:scale-[0.99]', rowClassName?.(row.original))}
            >
              {renderCard(row.original)}
              {renderExpanded && isExpanded?.(row.original) && <div className="-mx-4 -mb-4 mt-3 border-t">{renderExpanded(row.original)}</div>}
            </motion.div>
          ))}
          {footer && <div className="pt-1">{footer}</div>}
        </div>
      )}
    </div>
  );
}
