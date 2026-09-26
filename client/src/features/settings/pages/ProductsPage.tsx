import type { ColumnDef } from '@tanstack/react-table';
import { CircleDot, FolderTree, Package, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { Sku } from '@/components/common/bits';
import { DataTable } from '@/components/common/DataTable';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { categoryPaths, useCategories } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { getErrorMessage } from '@/lib/axios';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { useHasRole } from '@/store/auth';
import { productsApi } from '../api';
import { DeleteDialog } from '../components/DeleteDialog';
import { ProductSheet } from '../components/ProductSheet';
import { RowActions } from '../components/RowActions';
import { SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { INVALIDATES, useProductList, useSettingsMutation } from '../queries';

const LIMIT = 20;

function ProductTile({ product }: { product: Product }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/60 font-mono text-[11px] font-semibold text-muted-foreground',
        product.isActive && 'bg-brand-gradient-soft text-primary',
      )}
    >
      {initials(product.name)}
    </span>
  );
}

function ActiveToggle({ product, canEdit }: { product: Product; canEdit: boolean }) {
  const toggle = useSettingsMutation((isActive: boolean) => productsApi.update(product._id, { isActive }), INVALIDATES.products);
  if (!canEdit) {
    return product.isActive ? (
      <Badge variant="success">
        <span className="size-1.5 rounded-full bg-success" aria-hidden />
        Active
      </Badge>
    ) : (
      <Badge variant="muted">Archived</Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Switch
        checked={toggle.isPending ? toggle.variables : product.isActive}
        disabled={toggle.isPending}
        aria-label={`${product.name} active`}
        onCheckedChange={(isActive) =>
          toggle.mutate(isActive, {
            onSuccess: () => toast.success(isActive ? 'Product activated' : 'Product archived', { description: `[${product.sku}] ${product.name}` }),
            onError: (err) => toast.error('Could not update product', { description: getErrorMessage(err) }),
          })
        }
      />
      <span className="hidden text-[12.5px] text-muted-foreground xl:inline">{product.isActive ? 'Active' : 'Archived'}</span>
    </span>
  );
}

export default function ProductsPage() {
  const canEdit = useHasRole('manager');
  const [state, setState] = useUrlState({ q: '', category: '', active: '', page: '1' });
  const page = Math.max(1, Number(state.page) || 1);
  const { data: categories } = useCategories();
  const paths = useMemo(() => categoryPaths(categories), [categories]);
  const list = useProductList({ search: state.q, category: state.category, active: state.active, page, limit: LIMIT });
  const editor = useEditor<Product>();
  const { edit: editItem, askRemove } = editor;
  const remove = useSettingsMutation((id: string) => productsApi.remove(id), INVALIDATES.products);
  const filtering = Boolean(state.q || state.category || state.active);

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <ProductTile product={row.original} />
            <div className="min-w-0">
              <div className={cn('truncate font-medium', !row.original.isActive && 'text-muted-foreground')}>{row.original.name}</div>
              <Sku>{row.original.sku}</Sku>
            </div>
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) =>
          row.original.category ? (
            <span className="truncate text-[13px]">{paths.get(row.original.category._id) ?? row.original.category.name}</span>
          ) : (
            <span className="text-[13px] text-muted-foreground">Uncategorised</span>
          ),
      },
      {
        id: 'uom',
        header: 'UoM',
        meta: { className: 'hidden xl:table-cell' },
        cell: ({ row }) => <span className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-[12px] text-muted-foreground">{row.original.uom}</span>,
      },
      {
        id: 'cost',
        header: () => <span className="block text-right">Cost / unit</span>,
        cell: ({ row }) => <span className="tabular block text-right font-mono text-[13px]">{formatCurrency(row.original.perUnitCost)}</span>,
      },
      {
        id: 'price',
        header: () => <span className="block text-right">Sale price</span>,
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) => <span className="tabular block text-right font-mono text-[13px] text-muted-foreground">{formatCurrency(row.original.salePrice)}</span>,
      },
      {
        id: 'active',
        header: 'Status',
        cell: ({ row }) => <ActiveToggle product={row.original} canEdit={canEdit} />,
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: () => <span className="sr-only">Actions</span>,
              meta: { className: 'w-12' },
              cell: ({ row }) => <RowActions label={row.original.name} onEdit={() => editItem(row.original)} onDelete={() => askRemove(row.original)} />,
            } satisfies ColumnDef<Product, unknown>,
          ]
        : []),
    ],
    [canEdit, paths, editItem, askRemove],
  );

  const newButton = (
    <Button variant="gradient" onClick={editor.create}>
      <Plus />
      New product
    </Button>
  );

  const meta = list.data?.meta;

  return (
    <SettingsPage
      icon={Package}
      title="Products"
      description="Your catalogue — SKUs, units and ₹ costs used across receipts, deliveries and stock valuation."
      writeRole="manager"
      action={newButton}
      toolbar={
        <>
          <SearchInput value={state.q} onChange={(q) => setState({ q })} placeholder="Search SKU or name…" />
          <FilterSelect
            label="Category"
            icon={FolderTree}
            value={state.category}
            onChange={(category) => setState({ category })}
            options={(categories ?? []).map((c) => ({ value: c._id, label: paths.get(c._id) ?? c.name })).sort((a, b) => a.label.localeCompare(b.label))}
          />
          <FilterSelect
            label="Status"
            icon={CircleDot}
            value={state.active}
            onChange={(active) => setState({ active })}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Archived' },
            ]}
          />
        </>
      }
    >
      <DataTable
        aria-label="Products"
        data={list.data?.items}
        columns={columns}
        isLoading={list.isLoading || list.isPlaceholderData}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(p) => p._id}
        onRowClick={canEdit ? editor.edit : undefined}
        empty={{
          icon: Package,
          title: filtering ? 'No products match' : 'No products yet',
          description: filtering ? 'Try another search or clear the filters.' : 'Add your first product with a SKU, unit and cost.',
          action: filtering ? (
            <Button variant="outline" onClick={() => setState({ q: '', category: '', active: '' })}>
              Clear filters
            </Button>
          ) : canEdit ? (
            newButton
          ) : undefined,
        }}
        renderCard={(p) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <ProductTile product={p} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name}</div>
                <Sku>{p.sku}</Sku>
              </div>
              {canEdit && <RowActions label={p.name} onEdit={() => editItem(p)} onDelete={() => askRemove(p)} />}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-muted-foreground">
                {p.category ? (paths.get(p.category._id) ?? p.category.name) : 'Uncategorised'} · {p.uom}
              </span>
              <span className="tabular font-mono">{formatCurrency(p.perUnitCost)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-caption text-muted-foreground">
                Sale <span className="tabular font-mono text-foreground">{formatCurrency(p.salePrice)}</span>
              </span>
              <ActiveToggle product={p} canEdit={canEdit} />
            </div>
          </div>
        )}
        footer={meta && meta.total > LIMIT ? <Pagination page={page} limit={LIMIT} total={meta.total} onPageChange={(p) => setState({ page: String(p) })} noun="products" /> : undefined}
      />

      <ProductSheet open={editor.open} onOpenChange={editor.setOpen} product={editor.editing} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title={`Delete ${editor.removing?.name ?? 'product'}?`}
        description="The product is archived and removed from the catalogue. Products with stock on hand or open operations can't be deleted."
        successTitle="Product deleted"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
