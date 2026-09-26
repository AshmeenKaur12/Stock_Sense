
import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full resize-y rounded-lg",
        "border border-input bg-background px-3 py-2.5",
        "text-sm leading-relaxed shadow-sm",
        "placeholder:text-muted-foreground/70",
        "transition-all duration-200",
        "focus-visible:border-ring/70",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:bg-input/30",
        className
      )}
      {...rest}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };

