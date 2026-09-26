import { motion } from 'framer-motion';
import { ArrowRight, Inbox } from 'lucide-react';
import { LocationFlow } from '@/components/common/bits';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import type { MoveDirection, MoveKanbanColumn, MoveRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DIRECTION_STYLE, DIRECTIONS, MoveQty } from './direction';
import { moveDate, MoveProduct, MoveReference } from './moveColumns';

interface MoveKanbanProps {
  columns: MoveKanbanColumn[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  onShowAll: (direction: MoveDirection) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const COLUMN_HINT: Record<MoveDirection, string> = {
  in: 'Received into stock',
  out: 'Delivered out of stock',
  internal: 'Between locations',
  adjust: 'Count corrections',
};

/** Ledger grouped by direction: In · Out · Internal · Adjustments. */
export function MoveKanban({ columns, isLoading, isFetching, error, onRetry, onShowAll }: MoveKanbanProps) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isLoading && !columns) return <LoadingState variant="kanban" />;

  const byDirection = new Map((columns ?? []).map((c) => [c.direction, c]));

  return (
    <div
      className={cn(
        '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 xl:grid xl:snap-none xl:grid-cols-4 xl:overflow-visible',
        isFetching && 'opacity-80 transition-opacity',
      )}
      role="list"
      aria-label="Moves by direction"
    >
      {DIRECTIONS.map((d, ci) => {
        const col = byDirection.get(d) ?? { direction: d, total: 0, items: [] };
        return <Column key={d} column={col} index={ci} onShowAll={() => onShowAll(d)} />;
      })}
    </div>
  );
}

function Column({ column, index, onShowAll }: { column: MoveKanbanColumn; index: number; onShowAll: () => void }) {
  const s = DIRECTION_STYLE[column.direction];
  return (
    <motion.section
      role="listitem"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: EASE }}
      aria-labelledby={`moves-col-${column.direction}`}
      className="flex w-[min(19rem,calc(100vw-3rem))] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-muted/30 xl:w-auto"
    >
      <header className="relative flex items-center justify-between gap-2 border-b bg-card/70 px-3.5 py-3">
        <span aria-hidden className={cn('absolute inset-x-0 top-0 h-0.5', s.bar)} />
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('flex size-7 items-center justify-center rounded-lg border', s.badge)}>
            <s.icon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`moves-col-${column.direction}`} className="truncate text-[13.5px] font-semibold">
              {s.chip}
            </h2>
            <p className="tabular truncate text-caption text-muted-foreground">
              {COLUMN_HINT[column.direction]}
            </p>
          </div>
        </div>
        <span className={cn('tabular rounded-full border px-2 py-0.5 font-mono text-[11.5px] font-semibold', s.badge)} aria-label={`${column.total} moves`}>
          {formatNumber(column.total)}
        </span>
      </header>

      <div className="flex max-h-[calc(100dvh-19rem)] min-h-[10rem] flex-col gap-2 overflow-y-auto p-2.5">
        {column.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-caption text-muted-foreground">
            <Inbox className="size-5 opacity-70" aria-hidden />
            Nothing here for these filters.
          </div>
        ) : (
          column.items.map((m, i) => <KanbanCard key={m._id} move={m} index={i} />)
        )}
      </div>

      {column.total > column.items.length && (
        <footer className="border-t bg-card/50 px-2.5 py-2">
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground" onClick={onShowAll}>
            <span className="tabular">
              Showing {formatNumber(column.items.length)} of {formatNumber(column.total)}
            </span>
            <span className="inline-flex items-center gap-1 text-foreground">
              View all <ArrowRight />
            </span>
          </Button>
        </footer>
      )}
    </motion.section>
  );
}

function KanbanCard({ move, index }: { move: MoveRow; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.02, ease: EASE }}
      className="group space-y-2 rounded-xl border bg-card p-3 shadow-card transition-[box-shadow,transform] duration-micro ease-brand hover:-translate-y-px hover:shadow-lift motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center justify-between gap-2">
        <MoveReference move={move} className="text-[12.5px]" />
        <MoveQty move={move} />
      </div>
      <div className="text-[13px]">
        <MoveProduct move={move} />
      </div>
      <LocationFlow from={move.from} fromType={move.fromType} to={move.to} toType={move.toType} />
      <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
        <span className="truncate">{move.contact || '—'}</span>
        <span className="tabular shrink-0 font-mono">{moveDate(move.date, 'dd/MM/yyyy HH:mm')}</span>
      </div>
    </motion.article>
  );
}
