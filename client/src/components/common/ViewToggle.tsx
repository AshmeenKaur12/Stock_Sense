import { motion } from 'framer-motion';
import { KanbanSquare, List } from 'lucide-react';
import { useId } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useHotkeys } from '@/hooks/useHotkeys';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'kanban';

const OPTIONS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: 'List view', icon: List },
  { value: 'kanban', label: 'Kanban view', icon: KanbanSquare },
];

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** Bind the `V` shortcut to flip views. */
  shortcut?: boolean;
  className?: string;
}

const TOGGLE_BUTTON_CLASS =
  'relative flex h-full w-9 items-center justify-center rounded-[10px] transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring';

const toggleView = (value: ViewMode, onChange: (mode: ViewMode) => void) => {
  onChange(value === 'list' ? 'kanban' : 'list');
};

/** Segmented List | Kanban toggle with a sliding pill (radio-group semantics). */
export function ViewToggle({ value, onChange, shortcut = true, className }: ViewToggleProps) {
  const pillId = useId();

  useHotkeys(
    shortcut
      ? [{ combo: 'v', handler: () => toggleView(value, onChange) }]
      : [],
  );

  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className={cn(
        'inline-flex h-9 items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;

        return (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={opt.label}
                onClick={() => onChange(opt.value)}
                className={cn(
                  TOGGLE_BUTTON_CLASS,
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={pillId}
                    className="absolute inset-0 rounded-[10px] border bg-background shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <opt.icon className="relative z-10 size-4" />
              </button>
            </TooltipTrigger>

            <TooltipContent>
              {opt.label}{' '}
              <span className="ml-1 text-muted-foreground">V</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
