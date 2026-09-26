import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { SignedQty } from '@/components/common/bits';
import type { MoveDirection, MoveRow } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface DirectionStyle {
  label: string;
  plural: string;
  /** Filter chip / kanban column label */
  chip: string;
  short: string;
  icon: LucideIcon;
  /** Icon tile */
  badge: string;
  /** Text accent */
  text: string;
  /** Row accent: left rule + faint tint (table rows and mobile cards). */
  row: string;
  /** Kanban header dot / bar */
  bar: string;
}

export const DIRECTIONS: MoveDirection[] = ['in', 'out', 'internal', 'adjust'];

export const DIRECTION_STYLE: Record<MoveDirection, DirectionStyle> = {
  in: {
    label: 'In',
    plural: 'Incoming',
    chip: 'In',
    short: 'IN',
    icon: ArrowDownToLine,
    badge: 'border-success/25 bg-success/10 text-success',
    text: 'text-success',
    row: '[background-image:linear-gradient(hsl(var(--success)/0.035),hsl(var(--success)/0.035))] [&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--success)/0.75)] border-l-[3px] border-l-success/75',
    bar: 'bg-success',
  },
  out: {
    label: 'Out',
    plural: 'Outgoing',
    chip: 'Out',
    short: 'OUT',
    icon: ArrowUpFromLine,
    badge: 'border-destructive/25 bg-destructive/10 text-destructive',
    text: 'text-destructive',
    row: '[background-image:linear-gradient(hsl(var(--destructive)/0.035),hsl(var(--destructive)/0.035))] [&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--destructive)/0.75)] border-l-[3px] border-l-destructive/75',
    bar: 'bg-destructive',
  },
  internal: {
    label: 'Internal',
    plural: 'Internal',
    chip: 'Internal',
    short: 'INT',
    icon: ArrowLeftRight,
    badge: 'border-border bg-muted text-foreground/80',
    text: 'text-foreground/80',
    row: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--border))] border-l-[3px] border-l-border',
    bar: 'bg-muted-foreground/60',
  },
  adjust: {
    label: 'Adjustment',
    plural: 'Adjustments',
    chip: 'Adjustments',
    short: 'ADJ',
    icon: SlidersHorizontal,
    badge: 'border-warning/25 bg-warning/10 text-warning',
    text: 'text-warning',
    row: '[background-image:linear-gradient(hsl(var(--warning)/0.03),hsl(var(--warning)/0.03))] [&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--warning)/0.7)] border-l-[3px] border-l-warning/70',
    bar: 'bg-warning',
  },
};

export function DirectionBadge({ direction, size = 'md', className }: { direction: MoveDirection; size?: 'sm' | 'md'; className?: string }) {
  const s = DIRECTION_STYLE[direction];
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-lg border', size === 'md' ? 'size-8' : 'size-6 rounded-md', s.badge, className)}
      title={s.label}
    >
      <s.icon className={size === 'md' ? 'size-4' : 'size-3.5'} aria-hidden />
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

/** Ledger quantity: +50 IN, −20 OUT, adjustments signed by effect, internal neutral. */
export function MoveQty({ move, className }: { move: MoveRow; className?: string }) {
  return <SignedQty value={move.direction === 'internal' ? move.quantity : move.signedQty} neutral={move.direction === 'internal'} unit={move.product?.uom} className={className} />;
}
