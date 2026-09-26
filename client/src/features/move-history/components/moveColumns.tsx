import type { ColumnDef } from '@tanstack/react-table';
import { format, isValid } from 'date-fns';
import { Link } from 'react-router-dom';
import { ContactAvatar, ContactName, LocationFlow, Sku } from '@/components/common/bits';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { REASON_LABEL, type MoveRow, type OperationStatus, type OperationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { operationPath } from '../api';
import { DirectionBadge, DIRECTION_STYLE, MoveQty } from './direction';

export interface MoveGroupInfo {
  /** First row of a run of rows sharing one reference. */
  first: boolean;
  last: boolean;
  lines: number;
}

/** One ledger row per product line; consecutive rows of the same reference form a visual group. */
export function groupMoves(rows: MoveRow[] = []): Map<string, MoveGroupInfo> {
  const out = new Map<string, MoveGroupInfo>();
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1]!.reference === rows[i]!.reference) j++;
    const lines = j - i + 1;
    for (let k = i; k <= j; k++) out.set(rows[k]!._id, { first: k === i, last: k === j, lines });
    i = j + 1;
  }
  return out;
}

const OPERATION_LABEL: Record<OperationType, string> = {
  receipt: 'Receipt',
  delivery: 'Delivery',
  internal: 'Transfer',
  adjustment: 'Adjustment',
};

const STATUSES: OperationStatus[] = ['draft', 'waiting', 'ready', 'done', 'canceled'];
const isOperationStatus = (s: string): s is OperationStatus => (STATUSES as string[]).includes(s);

export function MoveStatus({ status }: { status: string }) {
  return isOperationStatus(status) ? <StatusBadge status={status} /> : <Badge variant="muted">{status}</Badge>;
}

export function moveDate(d: string, pattern: string) {
  const date = new Date(d);
  return isValid(date) ? format(date, pattern) : '—';
}

export function operationCaption(m: MoveRow) {
  const base = OPERATION_LABEL[m.operationType];
  return m.reason ? `${base} · ${REASON_LABEL[m.reason]}` : base;
}

export function MoveReference({ move, className }: { move: MoveRow; className?: string }) {
  return (
    <Link
      to={operationPath(move)}
      className={cn('rounded font-mono text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      {move.reference}
    </Link>
  );
}

export function MoveProduct({ move }: { move: MoveRow }) {
  if (!move.product) return <span className="text-muted-foreground">Deleted product</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Sku className="shrink-0">[{move.product.sku}]</Sku>
      <span className="truncate">{move.product.name}</span>
    </span>
  );
}

/** Timeline rail: direction badge on the first line of a reference, a thin connector on the rest. */
function Rail({ move, group }: { move: MoveRow; group: MoveGroupInfo }) {
  const s = DIRECTION_STYLE[move.direction];
  return (
    <div className="relative flex h-[52px] w-8 items-center justify-center">
      {!group.first && <span aria-hidden className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-border" />}
      {!group.last && <span aria-hidden className={cn('absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-border', group.first ? 'top-[calc(50%+1rem)]' : 'top-1/2')} />}
      {group.first ? (
        <DirectionBadge direction={move.direction} className="relative" />
      ) : (
        <span aria-hidden className={cn('relative size-1.5 rounded-full ring-4 ring-card', s.bar)} />
      )}
    </div>
  );
}

export function buildMoveColumns(groups: Map<string, MoveGroupInfo>): ColumnDef<MoveRow, unknown>[] {
  const g = (m: MoveRow): MoveGroupInfo => groups.get(m._id) ?? { first: true, last: true, lines: 1 };
  return [
    {
      id: 'rail',
      header: () => <span className="sr-only">Direction</span>,
      cell: ({ row }) => <Rail move={row.original} group={g(row.original)} />,
      meta: { className: 'w-14 !pr-0 py-0' },
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: ({ row }) => {
        const m = row.original;
        const info = g(m);
        if (!info.first) {
          return (
            <span className="flex items-center gap-1.5 pl-3 text-caption text-muted-foreground">
              <span aria-hidden className="h-3 w-2.5 -translate-y-1 rounded-bl-md border-b border-l border-border" />
              <span className="sr-only">{m.reference} (continued)</span>
            </span>
          );
        }
        return (
          <div className="min-w-0">
            <MoveReference move={m} />
            <div className="truncate text-caption text-muted-foreground">
              {operationCaption(m)}
              {info.lines > 1 && ` · ${info.lines} lines`}
            </div>
          </div>
        );
      },
      meta: { className: 'min-w-[9.5rem] whitespace-nowrap' },
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) =>
        g(row.original).first ? (
          <div className="whitespace-nowrap">
            <div className="tabular font-mono text-[12.5px]">{moveDate(row.original.date, 'dd/MM/yyyy')}</div>
            <div className="tabular font-mono text-caption text-muted-foreground">{moveDate(row.original.date, 'HH:mm')}</div>
          </div>
        ) : (
          <span className="sr-only">{moveDate(row.original.date, 'dd/MM/yyyy HH:mm')}</span>
        ),
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => (g(row.original).first ? <ContactName name={row.original.contact} /> : <span className="sr-only">{row.original.contact}</span>),
      meta: { className: 'hidden lg:table-cell max-w-[11rem]' },
    },
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => <MoveProduct move={row.original} />,
      meta: { className: 'max-w-[15rem] min-w-[9rem]' },
    },
    {
      id: 'flow',
      header: 'From → To',
      cell: ({ row }) => <LocationFlow from={row.original.from} fromType={row.original.fromType} to={row.original.to} toType={row.original.toType} className="max-w-[16rem]" />,
    },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => <MoveQty move={row.original} />,
      meta: { className: 'text-right whitespace-nowrap' },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <MoveStatus status={row.original.status} />,
      meta: { className: 'hidden lg:table-cell' },
    },
    {
      id: 'user',
      header: 'By',
      cell: ({ row }) => {
        const u = row.original.user;
        if (!u) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex min-w-0 items-center gap-2" title={u.name}>
            <ContactAvatar name={u.name} src={u.avatarUrl} size="xs" />
            <span className="truncate text-[13px] text-muted-foreground">{u.name.split(' ')[0]}</span>
          </span>
        );
      },
      meta: { className: 'hidden xl:table-cell max-w-[8rem]' },
    },
  ];
}
