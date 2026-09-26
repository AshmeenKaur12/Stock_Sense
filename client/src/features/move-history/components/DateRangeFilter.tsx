import { format, parseISO, startOfMonth, subDays } from 'date-fns';
import { CalendarRange, Check, ChevronDown, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: string;
  to: string;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

interface Preset {
  key: string;
  label: string;
  range: () => DateRange;
}

const PRESETS: Preset[] = [
  { key: 'today', label: 'Today', range: () => ({ from: iso(new Date()), to: iso(new Date()) }) },
  { key: '7d', label: 'Last 7 days', range: () => ({ from: iso(subDays(new Date(), 6)), to: iso(new Date()) }) },
  { key: '30d', label: 'Last 30 days', range: () => ({ from: iso(subDays(new Date(), 29)), to: iso(new Date()) }) },
  { key: 'month', label: 'This month', range: () => ({ from: iso(startOfMonth(new Date())), to: iso(new Date()) }) },
];

function short(d: string) {
  try {
    return format(parseISO(d), 'dd MMM');
  } catch {
    return d;
  }
}

function describe({ from, to }: DateRange): string {
  const preset = PRESETS.find((p) => {
    const r = p.range();
    return r.from === from && r.to === to;
  });
  if (preset) return preset.label;
  if (from && to) return from === to ? short(from) : `${short(from)} – ${short(to)}`;
  if (from) return `From ${short(from)}`;
  if (to) return `Until ${short(to)}`;
  return '';
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** Filter chip with quick presets plus a custom from/to range (inclusive, YYYY-MM-DD). */
export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const active = !!(value.from || value.to);
  const label = describe(value);
  const invalid = !!(draft.from && draft.to && draft.from > draft.to);

  const apply = (range: DateRange) => {
    onChange(range);
    setOpen(false);
  };

  return (
    <div className="relative inline-flex">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setDraft(value);
        }}
      >
        <PopoverTrigger
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
            active
              ? 'border-primary/30 bg-primary/10 pr-8 text-foreground'
              : 'border-dashed border-border bg-transparent text-muted-foreground hover:border-solid hover:bg-accent hover:text-foreground',
          )}
          aria-label={active ? `Date: ${label}` : 'Filter by date'}
        >
          <CalendarRange className="size-3.5" aria-hidden />
          <span>Date</span>
          {active ? (
            <>
              <span className="h-3.5 w-px bg-border" aria-hidden />
              <span className="max-w-[10rem] truncate text-primary">{label}</span>
            </>
          ) : (
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0">
          <div className="p-1.5" role="group" aria-label="Date presets">
            {PRESETS.map((p) => {
              const r = p.range();
              const selected = r.from === value.from && r.to === value.to;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => apply(r)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <Check className={cn('size-3.5 text-primary', selected ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <span className="flex-1">{p.label}</span>
                  <span className="tabular font-mono text-[11px] text-muted-foreground">
                    {short(r.from)}
                    {r.from !== r.to && ` – ${short(r.to)}`}
                  </span>
                </button>
              );
            })}
          </div>
          <form
            className="space-y-3 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!invalid) apply(draft);
            }}
          >
            <div className="caption-label">Custom range</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`${uid}-from`} className="text-caption text-muted-foreground">
                  From
                </Label>
                <Input
                  id={`${uid}-from`}
                  type="date"
                  value={draft.from}
                  max={draft.to || undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                  className="h-8 px-2 font-mono text-[12px] [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${uid}-to`} className="text-caption text-muted-foreground">
                  To
                </Label>
                <Input
                  id={`${uid}-to`}
                  type="date"
                  value={draft.to}
                  min={draft.from || undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                  aria-invalid={invalid || undefined}
                  className="h-8 px-2 font-mono text-[12px] [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>
            {invalid && (
              <p role="alert" className="text-caption text-destructive">
                “From” must be on or before “To”.
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => apply({ from: '', to: '' })} disabled={!active && !draft.from && !draft.to}>
                Reset
              </Button>
              <Button type="submit" size="sm" disabled={invalid}>
                Apply
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
      {active && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          aria-label="Clear date filter"
          className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
