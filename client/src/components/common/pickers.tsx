import { Command as CommandPrimitive } from 'cmdk';
import { Check, ChevronsUpDown, Package, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useContacts, useLocations, useProductSearch } from '@/features/master/queries';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ContactAvatar } from './bits';

const triggerClass =
  'flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-micro hover:bg-accent/40 focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive/70 dark:bg-input/30';

// ── Product combobox ────────────────────────────────────────────────────────

export interface ProductOption {
  _id: string;
  sku: string;
  name: string;
  uom: string;
  perUnitCost: number;
}

interface ProductComboboxProps {
  value: ProductOption | null;
  onChange: (p: ProductOption) => void;
  excludeIds?: string[];
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

/** Searchable product picker showing `[SKU] Name` and ₹ unit cost (server-side search). */
export function ProductCombobox({ value, onChange, excludeIds = [], disabled, invalid, autoFocus, placeholder = 'Search product…', className }: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);
  const { data, isFetching } = useProductSearch(deferred, open);
  const items = (data?.items ?? []).filter((p: Product) => !excludeIds.includes(p._id) || p._id === value?._id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger disabled={disabled} aria-invalid={invalid || undefined} autoFocus={autoFocus} className={cn(triggerClass, className)} aria-label={value ? `Product: ${value.name}` : 'Choose product'}>
        {value ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-[11.5px] text-primary">[{value.sku}]</span>
            <span className="truncate">{value.name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground/80">
            <Search className="size-3.5" />
            {placeholder}
          </span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU or name…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search products"
            />
          </div>
          <CommandList className="max-h-72">
            {isFetching && !data && (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            )}
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p._id}
                  value={p._id}
                  onSelect={() => {
                    onChange({ _id: p._id, sku: p.sku, name: p.name, uom: p.uom, perUnitCost: p.perUnitCost });
                    setOpen(false);
                    setSearch('');
                  }}
                  className="py-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                    <Package className="text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11.5px] text-primary">[{p.sku}]</span>
                      <span className="truncate font-medium">{p.name}</span>
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      {formatCurrency(p.perUnitCost)} / {p.uom}
                      {p.category ? ` · ${p.category.name}` : ''}
                    </span>
                  </span>
                  {value?._id === p._id && <Check className="text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Contact combobox ────────────────────────────────────────────────────────

interface ContactComboboxProps {
  type: 'vendor' | 'customer';
  value: string | null;
  valueLabel?: string;
  onChange: (id: string | null, contact?: { name: string; address: string }) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  autoFocus?: boolean;
}

export function ContactCombobox({ type, value, valueLabel, onChange, disabled, invalid, id, autoFocus }: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data } = useContacts({ type });
  const contacts = data?.items ?? [];
  const selected = contacts.find((c) => c._id === value);
  const label = selected?.name ?? valueLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger id={id} disabled={disabled} autoFocus={autoFocus} aria-invalid={invalid || undefined} className={triggerClass}>
        {label ? (
          <span className="flex min-w-0 items-center gap-2">
            <ContactAvatar name={label} size="xs" />
            <span className="truncate">{label}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/80">Choose a {type}…</span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(340px,calc(100vw-2rem))] p-0">
        <Command>
          <div className="border-b">
            <CommandInputBare placeholder={`Search ${type}s…`} />
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>No {type}s found.</CommandEmpty>
            <CommandGroup>
              {contacts.map((c) => (
                <CommandItem
                  key={c._id}
                  value={`${c.name} ${c.email}`}
                  onSelect={() => {
                    onChange(c._id, { name: c.name, address: c.address });
                    setOpen(false);
                  }}
                >
                  <ContactAvatar name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    {c.email && <span className="block truncate text-caption text-muted-foreground">{c.email}</span>}
                  </span>
                  {value === c._id && <Check className="text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// cmdk's input without the wrapper icon duplication
function CommandInputBare({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center gap-2 px-3">
      <Search className="size-4 text-muted-foreground" />
      <CommandPrimitive.Input placeholder={placeholder} className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

// ── Location select (grouped by warehouse) ──────────────────────────────────

interface LocationSelectProps {
  value: string;
  onChange: (id: string) => void;
  warehouse?: string;
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  allowAll?: boolean;
  className?: string;
}

export function LocationSelect({ value, onChange, warehouse, excludeId, placeholder = 'Choose location', disabled, invalid, id, allowAll, className }: LocationSelectProps) {
  const { data: locations = [], isLoading } = useLocations(warehouse ? { warehouse } : {});
  const groups = new Map<string, typeof locations>();
  for (const l of locations) {
    if (l._id === excludeId) continue;
    const key = `${l.warehouse.shortCode} · ${l.warehouse.name}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return (
    <Select value={value || (allowAll ? '__all' : undefined)} onValueChange={(v) => onChange(v === '__all' ? '' : v)} disabled={disabled || isLoading}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className={cn('font-mono text-[13px]', className)}>
        <SelectValue placeholder={isLoading ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all">All locations</SelectItem>}
        {[...groups.entries()].map(([label, locs]) => (
          <SelectGroup key={label}>
            <SelectLabel>{label}</SelectLabel>
            {locs.map((l) => (
              <SelectItem key={l._id} value={l._id} className="font-mono">
                {l.fullName}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
