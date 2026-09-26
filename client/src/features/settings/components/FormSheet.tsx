import type { LucideIcon } from 'lucide-react';
import type { FormEventHandler, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
}

/** Right-side sheet with a scrollable single-column form and a sticky Cancel / Save footer. */
export function FormSheet({ open, onOpenChange, title, description, icon: Icon, onSubmit, submitting, submitLabel = 'Save', children }: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <SheetContent className="gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="flex-row items-start gap-3 space-y-0 pr-12">
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-primary ring-1 ring-inset ring-primary/20">
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
          </div>
        </SheetHeader>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">{children}</div>
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={submitting} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" variant="gradient" loading={submitting} className="flex-1 sm:flex-none">
              {submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export const errorId = (id: string) => `${id}-error`;
export const hintId = (id: string) => `${id}-hint`;

/** a11y props for a control rendered inside `FormRow`. */
export function fieldA11y(id: string, error?: string, hint?: ReactNode) {
  const describedBy = error ? errorId(id) : hint ? hintId(id) : undefined;
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
}

interface FormRowProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label, control, hint and error — tightly spaced. */
export function FormRow({ id, label, error, hint, required, optional, children, className }: FormRowProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
        {optional && <span className="text-[11.5px] text-muted-foreground">Optional</span>}
      </div>
      {children}
      {error ? (
        <p id={errorId(id)} role="alert" className="text-caption font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId(id)} className="text-caption text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
