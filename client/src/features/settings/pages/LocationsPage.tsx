import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronRight, MapPin, Plus, SlidersHorizontal, Truck, Warehouse as WarehouseIcon, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterSelect } from '@/components/common/FilterSelect';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useLocations, useWarehouses } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import type { Location, LocationType, Warehouse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/store/auth';
import { locationsApi } from '../api';
import { DeleteDialog } from '../components/DeleteDialog';
import { LocationSheet } from '../components/LocationSheet';
import { RowActions } from '../components/RowActions';
import { EASE, SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { INVALIDATES, useSettingsMutation } from '../queries';

const VIRTUAL_ICON: Record<Exclude<LocationType, 'internal'>, LucideIcon> = { vendor: Building2, customer: Truck, adjustment: SlidersHorizontal };

interface Group {
  warehouse: Warehouse;
  internal: Location[];
  virtual: Location[];
}

function TreeRow({ depthLast, children }: { depthLast: boolean; children: ReactNode }) {
  return (
    <li className="relative pl-9">
      {/* Tree connector: vertical rail + elbow into the row. */}
      <span aria-hidden className={cn('absolute left-[27px] top-0 w-px bg-border', depthLast ? 'h-1/2' : 'h-full')} />
      <span aria-hidden className="absolute left-[27px] top-1/2 h-px w-3 bg-border" />
      {children}
    </li>
  );
}

function LocationRow({ location, last, canEdit, onEdit, onDelete }: { location: Location; last: boolean; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <TreeRow depthLast={last}>
      <div className="group ml-2 flex min-h-[48px] items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-accent/40">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="truncate text-sm font-medium">{location.name}</span>
          <span className="w-fit max-w-full truncate rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[11.5px] text-foreground/85" title={location.fullName}>
            {location.fullName}
          </span>
        </div>
        {canEdit && <RowActions label={location.fullName} onEdit={onEdit} onDelete={onDelete} className="opacity-100 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100 sm:data-[state=open]:opacity-100" />}
      </div>
    </TreeRow>
  );
}

function VirtualRow({ location, last }: { location: Location; last: boolean }) {
  const Icon = location.type === 'internal' ? MapPin : VIRTUAL_ICON[location.type];
  return (
    <TreeRow depthLast={last}>
      <div className="ml-2 flex min-h-[40px] items-center gap-3 px-2.5 py-1 text-muted-foreground">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-dashed">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="min-w-0 truncate font-mono text-[12px]">{location.fullName}</span>
        <span className="shrink-0 rounded-full border border-dashed px-1.5 py-px text-[10.5px] font-medium uppercase tracking-wide">virtual</span>
      </div>
    </TreeRow>
  );
}

function WarehouseNode({
  group,
  index,
  canEdit,
  expanded,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  showVirtual,
}: {
  group: Group;
  index: number;
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onEdit: (l: Location) => void;
  onDelete: (l: Location) => void;
  showVirtual: boolean;
}) {
  const { warehouse, internal, virtual } = group;
  const panelId = `wh-tree-${warehouse._id}`;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE, delay: Math.min(index, 6) * 0.05 }}
      className="overflow-hidden rounded-2xl border bg-card shadow-card"
    >
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-panel ease-brand', expanded && 'rotate-90')} aria-hidden />
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-primary ring-1 ring-inset ring-primary/15">
            <WarehouseIcon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[15px] font-semibold">{warehouse.name}</span>
              <span className="shrink-0 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-px font-mono text-[11px] font-semibold tracking-wider text-primary">{warehouse.shortCode}</span>
            </span>
            <span className="block text-[12.5px] text-muted-foreground">
              <span className="tabular">{internal.length}</span> internal {internal.length === 1 ? 'location' : 'locations'}
            </span>
          </span>
        </button>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onAdd} aria-label={`Add location to ${warehouse.name}`}>
            <Plus />
            <span className="hidden xs:inline">Add</span>
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t bg-muted/15 px-2 py-2 sm:px-3">
              {internal.length ? (
                <ul aria-label={`${warehouse.name} locations`}>
                  {internal.map((l, i) => (
                    <LocationRow
                      key={l._id}
                      location={l}
                      last={i === internal.length - 1 && !(showVirtual && virtual.length)}
                      canEdit={canEdit}
                      onEdit={() => onEdit(l)}
                      onDelete={() => onDelete(l)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">No internal locations match.</p>
              )}
              {showVirtual && virtual.length > 0 && (
                <ul aria-label={`${warehouse.name} virtual locations`} className="mt-1 border-t border-dashed pt-1">
                  {virtual.map((l, i) => (
                    <VirtualRow key={l._id} location={l} last={i === virtual.length - 1} />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function TreeSkeleton() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">Loading…</span>
      {[0, 1].map((g) => (
        <div key={g} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2.5 pl-12">
            {[0, 1, 2].map((r) => (
              <Skeleton key={r} className="h-8 w-full max-w-md rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LocationsPage() {
  const canEdit = useHasRole('admin');
  const [state, setState] = useUrlState({ q: '', warehouse: '', virtual: 'show' });
  const warehousesQ = useWarehouses();
  const locationsQ = useLocations({ type: 'all' });
  const editor = useEditor<Location>();
  const [addTo, setAddTo] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const remove = useSettingsMutation((id: string) => locationsApi.remove(id), INVALIDATES.locations);
  const showVirtual = state.virtual !== 'hide';

  const groups = useMemo<Group[]>(() => {
    const q = state.q.toLowerCase();
    const all = locationsQ.data ?? [];
    return (warehousesQ.data ?? [])
      .filter((w) => !state.warehouse || w._id === state.warehouse)
      .map((w) => {
        const mine = all.filter((l) => l.warehouse?._id === w._id && (!q || `${l.name} ${l.shortCode} ${l.fullName}`.toLowerCase().includes(q)));
        return {
          warehouse: w,
          internal: mine.filter((l) => l.type === 'internal').sort((a, b) => a.fullName.localeCompare(b.fullName)),
          virtual: mine.filter((l) => l.type !== 'internal'),
        };
      })
      .filter((g) => !q || g.internal.length || (showVirtual && g.virtual.length));
  }, [warehousesQ.data, locationsQ.data, state.q, state.warehouse, showVirtual]);

  const openAdd = (warehouseId?: string) => {
    setAddTo(warehouseId);
    editor.create();
  };
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const error = warehousesQ.error ?? locationsQ.error;
  const loading = warehousesQ.isLoading || locationsQ.isLoading;
  const hasWarehouses = (warehousesQ.data?.length ?? 0) > 0;
  const filtering = Boolean(state.q || state.warehouse);

  const newButton = (
    <Button variant="gradient" onClick={() => openAdd(state.warehouse || undefined)} disabled={!hasWarehouses}>
      <Plus />
      New location
    </Button>
  );

  let content: ReactNode;
  if (error)
    content = (
      <ErrorState
        error={error}
        onRetry={() => {
          void warehousesQ.refetch();
          void locationsQ.refetch();
        }}
      />
    );
  else if (loading) content = <TreeSkeleton />;
  else if (!hasWarehouses)
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState icon={MapPin} title="Create a warehouse first" description="Locations live inside a warehouse. Add a warehouse and a Stock1 location is created for you." />
      </div>
    );
  else if (!groups.length)
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState
          icon={MapPin}
          title="No matching locations"
          description="Try a different search or warehouse."
          action={
            filtering ? (
              <Button variant="outline" onClick={() => setState({ q: '', warehouse: '' })}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  else
    content = (
      <ul className="space-y-3" aria-label="Locations by warehouse">
        {groups.map((g, i) => (
          <WarehouseNode
            key={g.warehouse._id}
            group={g}
            index={i}
            canEdit={canEdit}
            expanded={!collapsed.has(g.warehouse._id)}
            onToggle={() => toggle(g.warehouse._id)}
            onAdd={() => openAdd(g.warehouse._id)}
            onEdit={editor.edit}
            onDelete={editor.askRemove}
            showVirtual={showVirtual}
          />
        ))}
      </ul>
    );

  return (
    <SettingsPage
      icon={MapPin}
      title="Locations"
      description="Holds the multiple locations of a warehouse — rooms, racks, shelves or floors. Virtual partner locations are managed automatically."
      writeRole="admin"
      action={newButton}
      toolbar={
        <>
          <SearchInput value={state.q} onChange={(q) => setState({ q })} placeholder="Search locations…" />
          <FilterSelect
            label="Warehouse"
            icon={WarehouseIcon}
            value={state.warehouse}
            onChange={(warehouse) => setState({ warehouse })}
            options={(warehousesQ.data ?? []).map((w) => ({ value: w._id, label: w.name, hint: w.shortCode }))}
          />
          <label className="ml-auto inline-flex h-8 cursor-pointer items-center gap-2 rounded-full px-1 text-[13px] text-muted-foreground">
            <Switch checked={showVirtual} onCheckedChange={(on) => setState({ virtual: on ? 'show' : 'hide' })} aria-label="Show virtual locations" />
            Show virtual
          </label>
        </>
      }
    >
      {content}

      <LocationSheet open={editor.open} onOpenChange={editor.setOpen} location={editor.editing} defaultWarehouse={addTo} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title={`Delete ${editor.removing?.fullName ?? 'location'}?`}
        description="Locations that hold stock, are used by operations, or are the warehouse's last internal location can't be deleted."
        successTitle="Location deleted"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
