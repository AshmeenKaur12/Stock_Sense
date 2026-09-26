import { Check, ChevronDown, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
  group?: string;
}

interface FilterSelectProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  className?: string;
}

/**
 * Filter chip: shows "Label" when empty and "Label: Value ×" when set.
 * Opens a searchable popover list. Designed for URL-synced filter bars.
 */
export function FilterSelect({ label, icon: Icon, value, options, onChange, searchable = options.length > 7, className }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const groups = [...new Set(options.map((o) => o.group ?? ''))];

  return (
    <div className={cn('relative inline-flex', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
            selected
              ? 'border-primary/30 bg-primary/10 pr-8 text-foreground'
              : 'border-dashed border-border bg-transparent text-muted-foreground hover:border-solid hover:bg-accent hover:text-foreground',
          )}
          aria-label={selected ? `${label}: ${selected.label}` : `Filter by ${label}`}
        >
          {Icon && <Icon className="size-3.5" />}
          <span>{label}</span>
          {selected ? (
            <>
              <span className="h-3.5 w-px bg-border" aria-hidden />
              <span className="max-w-[10rem] truncate text-primary">{selected.label}</span>
            </>
          ) : (
            <ChevronDown className="size-3.5 opacity-60" />
          )}
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <Command>
            {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />}
            <CommandList className="max-h-72">
              <CommandEmpty>No matches.</CommandEmpty>
              {groups.map((g) => (
                <CommandGroup key={g || 'all'} heading={g || undefined}>
                  {options
                    .filter((o) => (o.group ?? '') === g)
                    .map((o) => (
                      <CommandItem
                        key={o.value}
                        value={`${o.label} ${o.hint ?? ''} ${o.value}`}
                        onSelect={() => {
                          onChange(o.value === value ? '' : o.value);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn('!size-3.5 text-primary', o.value === value ? 'opacity-100' : 'opacity-0')} />
                        <span className="flex-1 truncate">{o.label}</span>
                        {o.hint && <span className="text-caption text-muted-foreground">{o.hint}</span>}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={`Clear ${label} filter`}
          className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
