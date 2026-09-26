import { motion } from 'framer-motion';
import { CircleDot, FolderTree, MapPin, PackageSearch, Plus, Warehouse as WarehouseIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { FilterSelect, type FilterOption } from '@/components/common/FilterSelect';
import { RoleGate } from '@/components/common/guards';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { categoryPaths, useCategories, useLocations, useWarehouses } from '@/features/master/queries';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useUrlState } from '@/hooks/useUrlState';
import type { StockRow, StockStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/store/auth';
import { ProductSheet } from '../components/ProductSheet';
import { StockCard } from '../components/StockCard';
import { buildStockColumns, type StockSort } from '../components/stockColumns';
import { StockLocationBreakdown } from '../components/StockLocationBreakdown';
import { StockSummaryStrip } from '../components/StockSummaryStrip';
import type { StockListParams } from '../api';
import { useStockList } from '../queries';

const PAGE_SIZE = 20;

const URL_DEFAULTS = {
  search: '',
  warehouse: '',
  location: '',
  category: '',
  stockStatus: '',
  sort: '',
  page: '1',
  expanded: '',
};

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const isStatus = (v: string): v is StockStatus => v === 'in' || v === 'low' || v === 'out';
const SORTS: StockSort[] = ['name', 'sku', 'onHand', '-onHand', 'status'];
const isSort = (v: string): v is Exclude<StockSort, ''> => (SORTS as string[]).includes(v) && v !== '';

export default function StockPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  const canAdjust = useHasRole('manager');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const page = Math.max(1, Number(state.page) || 1);
  const params: StockListParams = {
    search: state.search || undefined,
    warehouse: state.warehouse || undefined,
    location: state.location || undefined,
    category: state.category || undefined,
    stockStatus: isStatus(state.stockStatus) ? state.stockStatus : undefined,
    sort: isSort(state.sort) ? state.sort : undefined,
    page,
    limit: PAGE_SIZE,
  };
  const { data, isLoading, isFetching, error, refetch } = useStockList(params);

  // Filter lookups
  const { data: warehouses = [] } = useWarehouses();
  const { data: locations = [] } = useLocations(state.warehouse ? { warehouse: state.warehouse } : {});
  const { data: categories = [] } = useCategories();

  const warehouseOptions: FilterOption[] = warehouses.map((w) => ({ value: w._id, label: w.name, hint: w.shortCode }));
  const locationOptions: FilterOption[] = locations
    .filter((l) => l.type === 'internal')
    .map((l) => ({ value: l._id, label: l.fullName, group: warehouses.length > 1 ? l.warehouse.name : undefined }));
  const categoryOptions: FilterOption[] = useMemo(
    () =>
      [...categoryPaths(categories).entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    [categories],
  );

  const hasFilters = !!(state.search || state.warehouse || state.location || state.category || state.stockStatus);
  const clearFilters = () => update({ search: '', warehouse: '', location: '', category: '', stockStatus: '' });

  const toggleExpanded = (row: StockRow) => {
    if (state.expanded === row._id) {
      setClosingId(row._id);
      update({ expanded: '', page: state.page });
    } else {
      if (state.expanded) setClosingId(state.expanded);
      update({ expanded: row._id, page: state.page });
    }
  };

  const columns = useMemo(
    () =>
      buildStockColumns({
        expandedId: state.expanded,
        warehouse: state.warehouse,
        canAdjust,
        sort: isSort(state.sort) ? state.sort : '',
        onSortChange: (sort) => update({ sort }),
      }),
    [state.expanded, state.warehouse, state.sort, canAdjust, update],
  );

  useHotkeys(canAdjust ? [{ combo: 'n', handler: () => setSheetOpen(true) }] : []);

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock"
        description="Manage inventory across warehouses and locations."
        titleAdornment={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Live
          </span>
        }
        actions={
          <RoleGate min="manager">
            <Button variant="gradient" onClick={() => setSheetOpen(true)}>
              <Plus />
              New Product
              <Kbd className="ml-1 hidden border-white/25 bg-white/15 text-white/90 shadow-none sm:inline-flex">N</Kbd>
            </Button>
          </RoleGate>
        }
      />

      <StockSummaryStrip
        summary={data?.meta.summary}
        isLoading={isLoading}
        activeStatus={state.stockStatus}
        onStatusToggle={(stockStatus) => update({ stockStatus })}
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <SearchInput value={state.search} onChange={(search) => update({ search })} placeholder="Search products…" aria-label="Search products by SKU or name" />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
          <FilterSelect
            label="Warehouse"
            icon={WarehouseIcon}
            value={state.warehouse}
            options={warehouseOptions}
            onChange={(warehouse) => update({ warehouse, location: '' })}
          />
          <FilterSelect label="Location" icon={MapPin} value={state.location} options={locationOptions} onChange={(location) => update({ location })} />
          <FilterSelect label="Category" icon={FolderTree} value={state.category} options={categoryOptions} onChange={(category) => update({ category })} />
          <FilterSelect label="Status" icon={CircleDot} value={state.stockStatus} options={STATUS_OPTIONS} onChange={(stockStatus) => update({ stockStatus })} />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              Clear
            </Button>
          )}
        </div>
      </motion.div>

      <DataTable<StockRow>
        aria-label="Stock by product"
        data={data?.items}
        columns={columns}
        isLoading={isLoading || (isFetching && !data)}
        error={error}
        onRetry={() => void refetch()}
        getRowId={(r) => r._id}
        onRowClick={toggleExpanded}
        isExpanded={(r) => r._id === state.expanded || r._id === closingId}
        renderExpanded={(r) => (
          <StockLocationBreakdown
            key={r._id}
            row={r}
            open={r._id === state.expanded}
            warehouse={state.warehouse || undefined}
            onClosed={() => setClosingId((c) => (c === r._id ? null : c))}
          />
        )}
        rowClassName={(r) => cn(r._id === state.expanded && 'bg-accent/40 [&>td:first-child]:shadow-[inset_2px_0_0_0_hsl(var(--primary))]')}
        renderCard={(r) => <StockCard row={r} expanded={r._id === state.expanded} canAdjust={canAdjust} warehouse={state.warehouse} />}
        empty={{
          icon: PackageSearch,
          title: 'No products found',
          description: hasFilters ? 'Nothing matches these filters. Try a different search or clear the filters.' : 'Add your first product to start tracking stock.',
          action: hasFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : canAdjust ? (
            <Button variant="gradient" onClick={() => setSheetOpen(true)}>
              <Plus />
              New Product
            </Button>
          ) : undefined,
        }}
        footer={
          total > 0 ? <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={(p) => update({ page: String(p), expanded: '' })} noun="products" /> : undefined
        }
      />

      {canAdjust && <ProductSheet open={sheetOpen} onOpenChange={setSheetOpen} />}
    </div>
  );
}
