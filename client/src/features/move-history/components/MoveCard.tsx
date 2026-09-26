import { ContactName, LocationFlow } from '@/components/common/bits';
import type { MoveRow } from '@/lib/types';
import { DirectionBadge, MoveQty } from './direction';
import { moveDate, MoveProduct, MoveReference, MoveStatus, operationCaption, type MoveGroupInfo } from './moveColumns';

/** Mobile (< 768px) ledger card. Continuation lines of a reference render as a slim indented card. */
export function MoveCard({ move, group }: { move: MoveRow; group: MoveGroupInfo }) {
  if (!group.first) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <span className="sr-only">{move.reference} (continued)</span>
          <MoveProduct move={move} />
          <LocationFlow from={move.from} fromType={move.fromType} to={move.to} toType={move.toType} />
        </div>
        <MoveQty move={move} className="shrink-0 text-base" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <DirectionBadge direction={move.direction} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <MoveReference move={move} />
            <span className="tabular shrink-0 font-mono text-caption text-muted-foreground">{moveDate(move.date, 'dd/MM/yyyy HH:mm')}</span>
          </div>
          <div className="truncate text-caption text-muted-foreground">
            {operationCaption(move)}
            {group.lines > 1 && ` · ${group.lines} lines`}
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <MoveProduct move={move} />
          <LocationFlow from={move.from} fromType={move.fromType} to={move.to} toType={move.toType} />
        </div>
        <MoveQty move={move} className="shrink-0 text-base" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t pt-2.5 text-[13px]">
        <ContactName name={move.contact} />
        <MoveStatus status={move.status} />
      </div>
    </div>
  );
}
