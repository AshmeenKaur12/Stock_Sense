import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CornerDownLeft, Moon, Package, SlidersHorizontal, Sun, type LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_PAGES, canSee } from '@/app/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { operationPath } from '@/features/operations/config';
import { getPaged } from '@/lib/api';
import type { OperationRow, Product } from '@/lib/types';
import { hasRole, useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import { StatusBadge } from './StatusBadge';

const Tile = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="flex size-7 items-center justify-center rounded-md border bg-muted/50">
    <Icon className="text-muted-foreground" />
  </span>
);

/** ⌘K palette: Pages, Actions, Products and Operations (server search). */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());

  const products = useQuery({
    queryKey: ['palette', 'products', q],
    queryFn: () => getPaged<Product>('/products', { search: q, limit: 6, active: true }),
    enabled: open && q.length >= 2,
  });
  const operations = useQuery({
    queryKey: ['palette', 'operations', q],
    queryFn: () => getPaged<OperationRow>('/operations', { search: q, limit: 6 }),
    enabled: open && q.length >= 2,
  });

  const run = (fn: () => void) => {
    setOpen(false);
    setSearch('');
    fn();
  };

  const actions = [
    { label: 'New Receipt', to: '/operations/receipts/new', icon: ArrowDownToLine },
    { label: 'New Delivery', to: '/operations/deliveries/new', icon: ArrowUpFromLine },
    { label: 'New Transfer', to: '/operations/transfers/new', icon: ArrowLeftRight },
    ...(hasRole(role, 'manager') ? [{ label: 'New Adjustment', to: '/operations/adjustments/new', icon: SlidersHorizontal }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <DialogContent hideClose className="glass top-[16%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 shadow-lift">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search pages, products and operations, or run an action</DialogDescription>
        <Command loop>
          <CommandInput placeholder="Search StockSense…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              {actions.map((a) => (
                <CommandItem key={a.to} value={`action ${a.label}`} onSelect={() => run(() => navigate(a.to))}>
                  <Tile icon={a.icon} /> <span className="flex-1">{a.label}</span>
                  <Kbd>N</Kbd>
                </CommandItem>
              ))}
              <CommandItem value="toggle theme dark light" onSelect={() => run(() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light'))}>
                <Tile icon={resolvedTheme === 'light' ? Moon : Sun} /> Switch to {resolvedTheme === 'light' ? 'dark' : 'light'} theme
              </CommandItem>
            </CommandGroup>
            {!!products.data?.items.length && (
              <CommandGroup heading="Products">
                {products.data.items.map((p) => (
                  <CommandItem key={p._id} value={`product ${p.sku} ${p.name} ${q}`} onSelect={() => run(() => navigate(`/stock?search=${encodeURIComponent(p.sku)}`))}>
                    <Tile icon={Package} />
                    <span className="font-mono text-[11.5px] text-primary">[{p.sku}]</span>
                    <span className="flex-1 truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!!operations.data?.items.length && (
              <CommandGroup heading="Operations">
                {operations.data.items.map((o) => (
                  <CommandItem key={o._id} value={`operation ${o.reference} ${o.contact} ${q}`} onSelect={() => run(() => navigate(operationPath(o.type, o._id)))}>
                    <Tile icon={o.type === 'receipt' ? ArrowDownToLine : o.type === 'delivery' ? ArrowUpFromLine : o.type === 'internal' ? ArrowLeftRight : SlidersHorizontal} />
                    <span className="font-mono text-[12px] text-primary">{o.reference}</span>
                    <span className="flex-1 truncate text-muted-foreground">{o.contact}</span>
                    <StatusBadge status={o.status} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup heading="Pages">
              {ALL_PAGES.filter((p) => canSee(p, role)).map((p) => (
                <CommandItem key={p.to} value={`${p.group ?? ''} ${p.label} ${p.keywords?.join(' ') ?? ''}`} onSelect={() => run(() => navigate(p.to))}>
                  <Tile icon={p.icon} />
                  <span className="flex-1">
                    {p.group && <span className="text-muted-foreground">{p.group} / </span>}
                    {p.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-end gap-3 border-t px-4 py-2 text-caption text-muted-foreground">
            <span className="flex items-center gap-1.5"><Kbd>G</Kbd><Kbd>D</Kbd> dashboard</span>
            <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft className="size-3" /></Kbd> select</span>
            <span className="flex items-center gap-1.5"><Kbd>esc</Kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
