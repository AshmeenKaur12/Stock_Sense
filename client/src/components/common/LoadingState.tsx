import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'table' | 'cards' | 'form' | 'kanban';
  rows?: number;
  className?: string;
}

/** Shimmer skeletons shaped like the content they stand in for — never a bare spinner. */
export function LoadingState({ variant = 'table', rows = 6, className }: LoadingStateProps) {
  const label = <span className="sr-only">Loading…</span>;

  if (variant === 'cards') {
    return (
      <div role="status" className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {label}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border bg-card p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div role="status" className={cn('space-y-6 rounded-2xl border bg-card p-6', className)}>
        {label}
        <Skeleton className="h-9 w-full rounded-xl" />
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (variant === 'kanban') {
    return (
      <div role="status" className={cn('flex gap-4 overflow-x-auto pb-2', className)}>
        {label}
        {Array.from({ length: 4 }, (_, c) => (
          <div key={c} className="w-72 shrink-0 space-y-3 rounded-2xl border bg-muted/30 p-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div role="status" className={cn('overflow-hidden rounded-2xl border bg-card', className)}>
      {label}
      <div className="flex gap-6 border-b bg-muted/30 px-4 py-3">
        {[20, 16, 16, 24, 16, 12].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-[52px] items-center gap-6 border-b px-4 last:border-b-0">
          {[20, 16, 16, 24, 16, 12].map((w, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
