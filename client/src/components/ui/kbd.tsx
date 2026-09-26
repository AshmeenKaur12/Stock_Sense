import { cn } from '@/lib/utils';

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-0.5 rounded border border-border bg-muted px-1 font-sans text-[10.5px] font-medium text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]',
        className,
      )}
      {...props}
    />
  );
}
