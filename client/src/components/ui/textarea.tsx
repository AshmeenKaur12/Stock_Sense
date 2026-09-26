import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[76px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow] duration-micro placeholder:text-muted-foreground/80 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
