import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, GripVertical, Package } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ContactName, LocationFlow, Reference } from '@/components/common/bits';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { LateBadge, OPERATION_STATUS_LABEL, STATUS_DOT, ShortBadge } from '@/components/common/StatusBadge';
import { getErrorMessage } from '@/lib/axios';
import { celebrate } from '@/lib/confetti';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import type { KanbanColumn, OperationRow, OperationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { allowedTargets, operationPath, type OperationConfig } from '../config';
import { useOperationKanban, useSetStatus, type ListParams } from '../queries';

function Card({ op, dragging, overlay }: { op: OperationRow; dragging?: boolean; overlay?: boolean }) {
  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-3 shadow-card transition-[box-shadow,transform,opacity] duration-micro',
        overlay && 'rotate-2 scale-[1.02] shadow-lift ring-1 ring-primary/30',
        dragging && 'opacity-40',
        op.hasShortage && 'border-destructive/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Reference>{op.reference}</Reference>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" aria-hidden />
      </div>
      <div className="mt-2 space-y-1.5 text-[13px]">
        <ContactName name={op.contact} />
        <LocationFlow from={op.from} fromType={op.fromType} to={op.to} toType={op.toType} />
        {op.products[0] && (
          <p className="flex items-center gap-1.5 truncate text-caption text-muted-foreground">
            <Package className="size-3.5 shrink-0" />
            <span className="truncate">{op.products[0]}</span>
            {op.lineCount > 1 && <span className="shrink-0">+{op.lineCount - 1}</span>}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 text-caption', op.isLate ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          <CalendarDays className="size-3.5" />
          {formatDate(op.scheduleDate)}
        </span>
        <span className="flex items-center gap-1">
          {op.hasShortage && <ShortBadge />}
          {op.isLate && <LateBadge />}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ op, onOpen }: { op: OperationRow; onOpen: () => void }) {
  const draggable = op.status !== 'done' && op.status !== 'canceled';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: op._id, data: { op }, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
        listeners?.onKeyDown?.(e);
      }}
      aria-label={`${op.reference}, ${OPERATION_STATUS_LABEL[op.status]}${draggable ? '. Press space to pick up and move with arrow keys' : ''}`}
      className={cn('cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring', draggable && 'touch-none')}
    >
      <Card op={op} dragging={isDragging} />
    </div>
  );
}

function Column({ col, activeOp, onOpen }: { col: KanbanColumn; activeOp: OperationRow | null; onOpen: (op: OperationRow) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });
  const valid = activeOp ? allowedTargets(activeOp.type, activeOp.status).includes(col.status) : false;
  const invalid = activeOp && activeOp.status !== col.status && !valid;
  return (
    <section
      ref={setNodeRef}
      aria-label={`${OPERATION_STATUS_LABEL[col.status]} column, ${col.total} operations`}
      className={cn(
        'flex w-[280px] shrink-0 flex-col rounded-2xl border bg-muted/30 transition-[box-shadow,background-color,opacity] duration-micro sm:w-[300px]',
        valid && 'border-primary/40 bg-primary/[0.04]',
        valid && isOver && 'shadow-glow',
        invalid && 'opacity-50',
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', STATUS_DOT[col.status])} aria-hidden />
          <h3 className="text-[13px] font-semibold">{OPERATION_STATUS_LABEL[col.status]}</h3>
        </div>
        <span className="tabular rounded-full bg-background px-2 py-0.5 text-caption font-medium text-muted-foreground ring-1 ring-border">{col.total}</span>
      </header>
      <div className="flex max-h-[calc(100dvh-20rem)] min-h-[160px] flex-col gap-2.5 overflow-y-auto p-2.5">
        {col.items.map((op) => (
          <DraggableCard key={op._id} op={op} onOpen={() => onOpen(op)} />
        ))}
        {col.items.length === 0 && <p className="py-8 text-center text-caption text-muted-foreground">{valid ? 'Drop here' : 'Nothing here'}</p>}
        {col.total > col.items.length && <p className="pb-1 text-center text-caption text-muted-foreground">+{col.total - col.items.length} more in list view</p>}
      </div>
    </section>
  );
}

export function KanbanBoard({ config, params }: { config: OperationConfig; params: Omit<ListParams, 'status' | 'page' | 'limit'> }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useOperationKanban(params, true);
  const setStatus = useSetStatus();
  const [active, setActive] = useState<OperationRow | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const key = queryKeys.operations.kanban(params as unknown as Record<string, unknown>);

  const onDragStart = (e: DragStartEvent) => setActive((e.active.data.current as { op: OperationRow }).op);

  const onDragEnd = (e: DragEndEvent) => {
    const op = active;
    setActive(null);
    const target = e.over?.id as OperationStatus | undefined;
    if (!op || !target || target === op.status) return;
    if (!allowedTargets(op.type, op.status).includes(target)) {
      toast.error(`Can't move ${op.reference} from ${OPERATION_STATUS_LABEL[op.status]} to ${OPERATION_STATUS_LABEL[target]}`);
      return;
    }
    // Optimistic move; rolled back if the server rejects it (e.g. 409 pick/pack required).
    const previous = qc.getQueryData<KanbanColumn[]>(key);
    qc.setQueryData<KanbanColumn[]>(key, (cols) =>
      cols?.map((c) => {
        if (c.status === op.status) return { ...c, total: c.total - 1, items: c.items.filter((i) => i._id !== op._id) };
        if (c.status === target) return { ...c, total: c.total + 1, items: [{ ...op, status: target }, ...c.items] };
        return c;
      }),
    );
    setStatus.mutate(
      { id: op._id, status: target },
      {
        onSuccess: ({ data: updated }) => {
          if (updated.status !== target) toast.warning(`${op.reference} is ${OPERATION_STATUS_LABEL[updated.status]}`, { description: 'Some products are short — waiting for stock.' });
          else if (target === 'done') {
            celebrate();
            toast.success(`${op.reference} validated`);
          } else toast.success(`${op.reference} → ${OPERATION_STATUS_LABEL[target]}`);
        },
        onError: (err) => {
          qc.setQueryData(key, previous);
          toast.error(`Couldn't move ${op.reference}`, { description: getErrorMessage(err) });
        },
      },
    );
  };

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <LoadingState variant="kanban" />;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex gap-3.5">
          {data
            .filter((c) => config.statuses.includes(c.status))
            .map((col) => (
              <Column key={col.status} col={col} activeOp={active} onOpen={(op) => navigate(operationPath(op.type, op._id))} />
            ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>{active ? <Card op={active} overlay /> : null}</DragOverlay>
      <span className="sr-only" aria-live="polite">
        {active ? `Picked up ${active.reference}. Valid targets: ${allowedTargets(active.type, active.status).map((s) => OPERATION_STATUS_LABEL[s]).join(', ')}` : ''}
      </span>
    </DndContext>
  );
}
