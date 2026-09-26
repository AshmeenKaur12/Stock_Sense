import { motion } from 'framer-motion';
import { Download, History, MapPin, Package, SearchX, Warehouse as WarehouseIcon, X } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/DataTable';
import { FilterSelect, type FilterOption } from '@/components/common/FilterSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { ViewToggle, type ViewMode } from '@/components/common/ViewToggle';
import { Button } from '@/components/ui/button';
import { useLocations, useWarehouses } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { getErrorMessage } from '@/lib/axios';
import { formatNumber } from '@/lib/format';
import type { MoveDirection, MoveRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { MoveFilters, MoveTotals } from '../api';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { DirectionChips } from '../components/DirectionChips';
import { DIRECTION_STYLE, DIRECTIONS } from '../components/direction';
import { MoveCard } from '../components/MoveCard';
import { MoveKanban } from '../components/MoveKanban';
import { buildMoveColumns, groupMoves } from '../components/moveColumns';
import { useExportMoves, useMoves, useMovesKanban } from '../queries';

const PAGE_SIZE = 25;

const URL_DEFAULTS = {
  search: '',
  direction: '',
  product: '',
  location: '',
  warehouse: '',
  from: '',
  to: '',
  view: 'list',
  page: '1',
};

const isDirection = (v: string): v is MoveDirection => (DIRECTIONS as string[]).includes(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export default function MoveHistoryPage() {
  const [state, update] = useUrlState(URL_DEFAULTS);
  const view: ViewMode = state.view === 'kanban' ? 'kanban' : 'list';
  const page = Math.max(1, Number(state.page) || 1);
  const direction = isDirection(state.direction) ? state.direction : undefined;

  /** Filters shared by list, kanban, counts and export (direction excluded). */
  const base: MoveFilters = {
    search: state.search || undefined,
    product: state.product || undefined,
    location: state.location || undefined,
    warehouse: state.warehouse || undefined,
    from: isDate(state.from) ? state.from : undefined,
    to: isDate(state.to) ? state.to : undefined,
  };
  const listFilters: MoveFilters = { ...base, direction };

  const list = useMoves({ ...listFilters, page, limit: PAGE_SIZE }, view === 'list');
  // Direction chip counts must ignore the selected direction; reuse the list totals when none is set.
  const counts = useMoves({ ...base, page: 1, limit: 1 }, view === 'list' && !!direction);
  const kanban = useMovesKanban(base, view === 'kanban');
  const exporter = useExportMoves();

  const totals: MoveTotals | undefined = direction ? counts.data?.meta.totals : list.data?.meta.totals;

  const { data: warehouses = [] } = useWarehouses();
  const { data: locations = [] } = useLocations(state.warehouse ? { warehouse: state.warehouse, type: 'all' } : { type: 'all' });
  const warehouseOptions: FilterOption[] = warehouses.map((w) => ({ value: w._id, label: w.name, hint: w.shortCode }));
  const locationOptions: FilterOption[] = locations.map((l) => ({
    value: l._id,
    label: l.fullName,
    group: l.type === 'internal' ? (warehouses.length > 1 ? l.warehouse.name : 'Locations') : 'Virtual',
  }));

  const rows = list.data?.items;
  const groups = useMemo(() => groupMoves(rows), [rows]);
  const columns = useMemo(() => buildMoveColumns(groups), [groups]);

  const productLabel = useMemo(() => {
    if (!state.product) return '';
    const p = [...(rows ?? []), ...(kanban.data ?? []).flatMap((c) => c.items)].find((m) => m.product?._id === state.product)?.product;
    return p ? `[${p.sku}] ${p.name}` : 'Selected product';
  }, [state.product, rows, kanban.data]);

  const hasFilters = !!(state.search || state.product || state.location || state.warehouse || state.from || state.to || (view === 'list' && direction));
  const clearFilters = () => update({ search: '', product: '', location: '', warehouse: '', from: '', to: '', direction: '' });

  const onExport = () => {
    exporter.mutate(view === 'list' ? listFilters : base, {
      onSuccess: () => toast.success('Export ready', { description: 'stocksense-moves.csv has been downloaded.' }),
      onError: (err) => toast.error('Export failed', { description: getErrorMessage(err) }),
    });
  };

  const total = list.data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Move History"
        description="Every unit that entered, left or moved between locations — one row per product line."
        actions={
          <Button variant="outline" onClick={onExport} loading={exporter.isPending}>
            {!exporter.isPending && <Download />}
            Export CSV
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={state.search}
            onChange={(search) => update({ search })}
            placeholder="Search reference, contact or product…"
            aria-label="Search moves by reference, contact or product"
            className="sm:w-72 sm:focus-within:w-96"
          />
          <ViewToggle value={view} onChange={(v) => update({ view: v, page: '1' })} className="self-end sm:self-auto" />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {view === 'list' ? (
            <DirectionChips value={direction ?? ''} onChange={(d) => update({ direction: d })} totals={totals} />
          ) : (
            <KanbanSummary totals={kanban.data?.reduce<MoveTotals>((acc, c) => ({ ...acc, [c.direction]: { qty: 0, count: c.total } }), {})} />
          )}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
            {state.product && (
              <span className="inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pl-3 pr-1.5 text-[13px] font-medium">
                <Package className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate text-primary">{productLabel}</span>
                <button
                  type="button"
                  onClick={() => update({ product: '' })}
                  aria-label="Clear product filter"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            <FilterSelect
              label="Warehouse"
              icon={WarehouseIcon}
              value={state.warehouse}
              options={warehouseOptions}
              onChange={(warehouse) => update({ warehouse, location: '' })}
            />
            <FilterSelect label="Location" icon={MapPin} value={state.location} options={locationOptions} onChange={(location) => update({ location })} />
            <DateRangeFilter value={{ from: state.from, to: state.to }} onChange={({ from, to }) => update({ from, to })} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Clear
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {view === 'kanban' ? (
        <MoveKanban
          columns={kanban.data}
          isLoading={kanban.isLoading}
          isFetching={kanban.isFetching}
          error={kanban.error}
          onRetry={() => void kanban.refetch()}
          onShowAll={(d) => update({ view: 'list', direction: d })}
        />
      ) : (
        <DataTable<MoveRow>
          aria-label="Stock move ledger"
          data={rows}
          columns={columns}
          isLoading={list.isLoading}
          error={list.error}
          onRetry={() => void list.refetch()}
          getRowId={(m) => m._id}
          rowClassName={(m) => {
            const info = groups.get(m._id);
            return cn(
              DIRECTION_STYLE[m.direction].row,
              info && !info.last && '[&>td]:!border-b-border/25',
              info && !info.first && 'max-md:!mt-1.5 max-md:ml-5 max-md:rounded-xl max-md:p-3',
            );
          }}
          renderCard={(m) => <MoveCard move={m} group={groups.get(m._id) ?? { first: true, last: true, lines: 1 }} />}
          empty={
            hasFilters
              ? {
                  icon: SearchX,
                  title: 'No moves match these filters',
                  description: 'Try another reference or contact, widen the date range, or clear the filters.',
                  action: (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ),
                }
              : {
                  icon: History,
                  title: 'No move history yet',
                  description: 'Validated receipts, deliveries, transfers and adjustments appear here as a live ledger.',
                }
          }
          footer={total > 0 ? <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={(p) => update({ page: String(p) })} noun="moves" /> : undefined}
        />
      )}
    </div>
  );
}

/** Kanban mode: columns are the directions, so show a static legend with counts instead of chips. */
function KanbanSummary({ totals }: { totals: MoveTotals | undefined }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground" aria-label="Moves per direction">
      {DIRECTIONS.map((d) => {
        const s = DIRECTION_STYLE[d];
        return (
          <li key={d} className="inline-flex items-center gap-1.5">
            <s.icon className={cn('size-3.5', s.text)} aria-hidden />
            {s.chip}
            <span className="tabular font-mono text-foreground">{totals ? formatNumber(totals[d]?.count ?? 0) : '—'}</span>
          </li>
        );
      })}
    </ul>
  );
}
