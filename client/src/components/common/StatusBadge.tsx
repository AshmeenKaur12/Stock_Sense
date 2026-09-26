import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, PackageX, Timer, XCircle, Zap, type LucideIcon } from 'lucide-react';
import type { OperationStatus, StockStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export type { OperationStatus, StockStatus };

interface PillStyle {
  label: string;
  className: string;
  dot: string;
  icon?: LucideIcon;
}

const OPERATION_STYLES: Record<OperationStatus, PillStyle> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground/70', icon: CircleDashed },
  waiting: { label: 'Waiting', className: 'bg-warning/10 text-warning border-warning/25', dot: 'bg-warning', icon: Clock3 },
  ready: { label: 'Ready', className: 'bg-info/10 text-info border-info/25', dot: 'bg-info', icon: Zap },
  done: { label: 'Done', className: 'bg-success/10 text-success border-success/25', dot: 'bg-success', icon: CheckCircle2 },
  canceled: { label: 'Canceled', className: 'bg-destructive/10 text-destructive border-destructive/25', dot: 'bg-destructive', icon: XCircle },
};

const STOCK_STYLES: Record<StockStatus, PillStyle> = {
  in: { label: 'In stock', className: 'bg-success/10 text-success border-success/25', dot: 'bg-success' },
  low: { label: 'Low stock', className: 'bg-warning/10 text-warning border-warning/25', dot: 'bg-warning', icon: AlertTriangle },
  out: { label: 'Out of stock', className: 'bg-destructive/10 text-destructive border-destructive/25', dot: 'bg-destructive', icon: PackageX },
};

function Pill({ label, className, dot, pulse, strike }: PillStyle & { pulse?: boolean; strike?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-4', className)}>
      <span className="relative flex size-1.5" aria-hidden>
        {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden', dot)} />}
        <span className={cn('relative inline-flex size-1.5 rounded-full', dot)} />
      </span>
      <span className={cn(strike && 'line-through decoration-destructive/60')}>{label}</span>
    </span>
  );
}

export function StatusBadge({ status, className }: { status: OperationStatus; className?: string }) {
  const s = OPERATION_STYLES[status];
  return <Pill {...s} className={cn(s.className, className)} pulse={status === 'waiting'} strike={status === 'canceled'} />;
}

export function StockStatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const s = STOCK_STYLES[status];
  return <Pill {...s} className={cn(s.className, className)} pulse={status === 'out'} />;
}

/** Rose "Late" marker with an icon (never colour alone). */
export function LateBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-destructive', className)}>
      <Timer className="size-3" aria-hidden />
      Late
    </span>
  );
}

export function ShortBadge({ className, label = 'Short' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-destructive', className)}>
      <AlertTriangle className="size-3" aria-hidden />
      {label}
    </span>
  );
}

export const OPERATION_STATUS_LABEL = Object.fromEntries(Object.entries(OPERATION_STYLES).map(([k, v]) => [k, v.label])) as Record<OperationStatus, string>;
export const OPERATION_STATUS_ICON = Object.fromEntries(Object.entries(OPERATION_STYLES).map(([k, v]) => [k, v.icon])) as Record<OperationStatus, LucideIcon>;
export const STATUS_DOT = Object.fromEntries(Object.entries(OPERATION_STYLES).map(([k, v]) => [k, v.dot])) as Record<OperationStatus, string>;
