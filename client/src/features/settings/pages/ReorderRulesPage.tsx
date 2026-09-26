import type { ColumnDef } from '@tanstack/react-table';
import { Package, Plus, RefreshCcw, Warehouse as WarehouseIcon, X } from 'lucide-react';
import { useMemo } from 'react';
import { Sku } from '@/components/common/bits';
import { DataTable } from '@/components/common/DataTable';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { useWarehouses } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { formatNumber } from '@/lib/format';
import { useHasRole } from '@/store/auth';
import { reorderRulesApi, type ReorderRuleRow } from '../api';
import { DeleteDialog } from '../components/DeleteDialog';
import { ReorderRuleSheet } from '../components/ReorderRuleSheet';
import { RowActions } from '../components/RowActions';
import { SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { INVALIDATES, useProductDetail, useReorderRuleList, useSettingsMutation } from '../queries';

const LIMIT = 20;

/** Min → max band: amber zone up to min, then the healthy range up to max. */
function ThresholdBand({ min, max, uom }: { min: number; max: number; uom: string }) {
  const minPct = max > 0 ? Math.min(100, (min / max) * 100) : 100;
  return (
    <div className="w-full min-w-[120px] max-w-[220px] space-y-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-warning/70" style={{ width: `${minPct}%` }} />
        <div className="h-full flex-1 bg-success/60" />
      </div>
      <div className="tabular flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          ≤ {formatNumber(min)} {uom} alert
        </span>
        <span>{formatNumber(max)} max</span>
      </div>
    </div>
  );
}

function Qty({ value, uom }: { value: number; uom?: string }) {
  return (
    <span className="tabular font-mono text-[13px] font-medium">
      {formatNumber(value)}
      {uom && <span className="ml-1 font-sans text-caption font-normal text-muted-foreground">{uom}</span>}
    </span>
  );
}

export default function ReorderRulesPage() {
  const canEdit = useHasRole('manager');
  const [state, setState] = useUrlState({ warehouse: '', product: '', page: '1' });
  const page = Math.max(1, Number(state.page) || 1);
  const { data: warehouses = [] } = useWarehouses();
  const productFilter = useProductDetail(state.product || null);
  const list = useReorderRuleList({ warehouse: state.warehouse, product: state.product, page, limit: LIMIT });
  const editor = useEditor<ReorderRuleRow>();
  const { edit: editItem, askRemove } = editor;
  const remove = useSettingsMutation((id: string) => reorderRulesApi.remove(id), INVALIDATES.reorderRules);
  const filtering = Boolean(state.warehouse || state.product);

  const columns = useMemo<ColumnDef<ReorderRuleRow, unknown>[]>(
    () => [
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.product?.name ?? 'Deleted product'}</div>
            <Sku>{row.original.product?.sku ?? '—'}</Sku>
          </div>
        ),
      },
      {
        id: 'warehouse',
        header: 'Warehouse',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[12px]" title={row.original.warehouse?.name}>
            <span className="font-mono font-semibold text-primary">{row.original.warehouse?.shortCode ?? '—'}</span>
            <span className="hidden max-w-[140px] truncate text-muted-foreground xl:inline">{row.original.warehouse?.name}</span>
          </span>
        ),
      },
      { id: 'min', header: () => <span className="block text-right">Min</span>, cell: ({ row }) => <span className="block text-right"><Qty value={row.original.minQty} uom={row.original.product?.uom} /></span> },
      { id: 'max', header: () => <span className="block text-right">Max</span>, cell: ({ row }) => <span className="block text-right"><Qty value={row.original.maxQty} uom={row.original.product?.uom} /></span> },
      {
        id: 'band',
        header: 'Threshold',
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) => <ThresholdBand min={row.original.minQty} max={row.original.maxQty} uom={row.original.product?.uom ?? ''} />,
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: () => <span className="sr-only">Actions</span>,
              meta: { className: 'w-12' },
              cell: ({ row }) => (
                <RowActions label={row.original.product?.name ?? 'rule'} onEdit={() => editItem(row.original)} onDelete={() => askRemove(row.original)} />
              ),
            } satisfies ColumnDef<ReorderRuleRow, unknown>,
          ]
        : []),
    ],
    [canEdit, editItem, askRemove],
  );

  const newButton = (
    <Button variant="gradient" onClick={editor.create}>
      <Plus />
      New rule
    </Button>
  );
  const meta = list.data?.meta;
  const productLabel = productFilter.data ? `[${productFilter.data.sku}] ${productFilter.data.name}` : 'Product';

  return (
    <SettingsPage
      icon={RefreshCcw}
      title="Reorder Rules"
      description={
        <>
          Min / max thresholds per product and warehouse. Free to use ≤ min raises a <span className="font-medium text-warning">low-stock</span> alert; ≤ 0 raises{' '}
          <span className="font-medium text-destructive">out-of-stock</span>.
        </>
      }
      writeRole="manager"
      action={newButton}
      toolbar={
        <>
          <FilterSelect
            label="Warehouse"
            icon={WarehouseIcon}
            value={state.warehouse}
            onChange={(warehouse) => setState({ warehouse })}
            options={warehouses.map((w) => ({ value: w._id, label: w.name, hint: w.shortCode }))}
          />
          {state.product && (
            <span className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pl-3 pr-1 text-[13px] font-medium">
              <Package className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate text-primary">{productLabel}</span>
              <button
                type="button"
                onClick={() => setState({ product: '' })}
                aria-label="Clear product filter"
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-primary/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </>
      }
    >
      <DataTable
        aria-label="Reorder rules"
        data={list.data?.items}
        columns={columns}
        isLoading={list.isLoading || list.isPlaceholderData}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(r) => r._id}
        onRowClick={canEdit ? editor.edit : undefined}
        empty={{
          icon: RefreshCcw,
          title: filtering ? 'No rules for this filter' : 'No reorder rules yet',
          description: filtering ? 'Clear the filters or add a rule for this selection.' : 'Set a minimum and maximum so StockSense can warn you before you run out.',
          action: filtering ? (
            <Button variant="outline" onClick={() => setState({ warehouse: '', product: '' })}>
              Clear filters
            </Button>
          ) : canEdit ? (
            newButton
          ) : undefined,
        }}
        renderCard={(r) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.product?.name ?? 'Deleted product'}</div>
                <div className="flex items-center gap-2">
                  <Sku>{r.product?.sku ?? '—'}</Sku>
                  <span className="font-mono text-[11.5px] font-semibold text-primary">{r.warehouse?.shortCode}</span>
                </div>
              </div>
              {canEdit && <RowActions label={r.product?.name ?? 'rule'} onEdit={() => editItem(r)} onDelete={() => askRemove(r)} />}
            </div>
            <ThresholdBand min={r.minQty} max={r.maxQty} uom={r.product?.uom ?? ''} />
          </div>
        )}
        footer={meta && meta.total > LIMIT ? <Pagination page={page} limit={LIMIT} total={meta.total} onPageChange={(p) => setState({ page: String(p) })} noun="rules" /> : undefined}
      />

      <ReorderRuleSheet open={editor.open} onOpenChange={editor.setOpen} rule={editor.editing} defaults={{
          warehouse: state.warehouse || undefined,
          product: productFilter.data
            ? { _id: productFilter.data._id, sku: productFilter.data.sku, name: productFilter.data.name, uom: productFilter.data.uom, perUnitCost: productFilter.data.perUnitCost }
            : undefined,
        }} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title="Delete reorder rule?"
        description={
          editor.removing?.product ? (
            <>
              <span className="font-mono">[{editor.removing.product.sku}]</span> {editor.removing.product.name} in {editor.removing.warehouse?.shortCode} will stop raising low-stock alerts.
            </>
          ) : (
            'This product will stop raising low-stock alerts in this warehouse.'
          )
        }
        successTitle="Reorder rule deleted"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
