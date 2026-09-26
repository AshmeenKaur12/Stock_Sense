import { cn } from '@/lib/utils';

/** Shimmering placeholder. Prefer skeletons over spinners for any content area. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent',
        className,
      )}
      {...props}
    />
  );
}
