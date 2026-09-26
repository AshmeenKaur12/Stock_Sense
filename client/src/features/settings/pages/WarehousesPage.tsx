import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin, MapPinned, Plus, Warehouse as WarehouseIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { useWarehouses } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { formatNumber } from '@/lib/format';
import type { Warehouse } from '@/lib/types';
import { useHasRole } from '@/store/auth';
import { warehousesApi } from '../api';
import { DeleteDialog } from '../components/DeleteDialog';
import { ReferencePreview } from '../components/ReferencePreview';
import { RowActions } from '../components/RowActions';
import { EASE, SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { WarehouseSheet } from '../components/WarehouseSheet';
import { INVALIDATES, useSettingsMutation } from '../queries';

function WarehouseCard({ warehouse, index, canEdit, onEdit, onDelete }: { warehouse: Warehouse; index: number; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const count = warehouse.locationCount ?? 0;
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -2 }}
      className="group relative flex min-w-0 flex-col rounded-2xl border bg-card shadow-card transition-shadow duration-panel hover:shadow-lift"
    >
      <div className="flex items-start gap-3 p-5 pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-primary ring-1 ring-inset ring-primary/15">
          <WarehouseIcon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold" title={warehouse.name}>
              {warehouse.name}
            </h3>
            <span className="shrink-0 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-primary">{warehouse.shortCode}</span>
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2 break-words">{warehouse.address || 'No address on file'}</span>
          </p>
        </div>
        {canEdit && <RowActions label={warehouse.name} onEdit={onEdit} onDelete={onDelete} className="-mr-1.5 -mt-1" />}
      </div>

      <div className="px-5 pb-4">
        <ReferencePreview code={warehouse.shortCode} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <MapPinned className="size-3.5" aria-hidden />
          <span className="tabular font-medium text-foreground">{formatNumber(count)}</span> {count === 1 ? 'location' : 'locations'}
        </span>
        <Link
          to={`/settings/locations?warehouse=${warehouse._id}`}
          className="inline-flex items-center gap-1 rounded-md text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          View locations
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </motion.article>
  );
}

export default function WarehousesPage() {
  const canEdit = useHasRole('admin');
  const [state, setState] = useUrlState({ q: '' });
  const { data, isLoading, error, refetch, isRefetching } = useWarehouses();
  const editor = useEditor<Warehouse>();
  const remove = useSettingsMutation((id: string) => warehousesApi.remove(id), INVALIDATES.warehouses);

  const filtered = useMemo(() => {
    const q = state.q.toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((w) => `${w.name} ${w.shortCode} ${w.address}`.toLowerCase().includes(q));
  }, [data, state.q]);

  const newButton = (
    <Button variant="gradient" onClick={editor.create}>
      <Plus />
      New warehouse
    </Button>
  );

  let content: ReactNode;
  if (error) content = <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
  else if (isLoading) content = <LoadingState variant="cards" rows={3} />;
  else if (!data?.length)
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState
          icon={WarehouseIcon}
          title="No warehouses yet"
          description="Create your first site. Its short code becomes the prefix for every receipt, delivery and transfer."
          action={canEdit ? newButton : undefined}
        />
      </div>
    );
  else if (!filtered.length)
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState
          icon={WarehouseIcon}
          title="No matching warehouses"
          description={`Nothing matches “${state.q}”.`}
          action={
            <Button variant="outline" onClick={() => setState({ q: '' })}>
              Clear search
            </Button>
          }
        />
      </div>
    );
  else
    content = (
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((w, i) => (
          <WarehouseCard key={w._id} warehouse={w} index={i} canEdit={canEdit} onEdit={() => editor.edit(w)} onDelete={() => editor.askRemove(w)} />
        ))}
      </div>
    );

  return (
    <SettingsPage
      icon={WarehouseIcon}
      title="Warehouses"
      description="The physical sites that hold your stock. Each warehouse's short code prefixes its references, e.g. WH/IN/0001."
      writeRole="admin"
      action={newButton}
      toolbar={(data?.length ?? 0) > 3 ? <SearchInput value={state.q} onChange={(q) => setState({ q })} placeholder="Search warehouses…" /> : undefined}
    >
      {content}

      <WarehouseSheet open={editor.open} onOpenChange={editor.setOpen} warehouse={editor.editing} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title={`Delete ${editor.removing?.name ?? 'warehouse'}?`}
        description="Its locations are removed too. Warehouses that hold stock or have open operations can't be deleted."
        successTitle="Warehouse deleted"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
