import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    label?: string;
  }
>(({ className, label, id, ...props }, ref) => {
  const checkboxId = id ?? React.useId();

  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          'peer size-[18px] shrink-0 rounded-[6px] border border-input bg-background shadow-xs transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-transparent data-[state=checked]:bg-brand-gradient data-[state=checked]:text-white',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className="size-3.5" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label && (
        <label
          htmlFor={checkboxId}
          className="cursor-pointer select-none text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          {label}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
