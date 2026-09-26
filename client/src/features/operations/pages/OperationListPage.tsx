import type { ColumnDef } from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { CalendarClock, Plus, Timer, Warehouse as WarehouseIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ContactName, LocationChip, LocationFlow, Reference, SignedQty } from '@/components/common/bits';
import { DataTable } from '@/components/common/DataTable';
import { FilterSelect } from '@/components/common/FilterSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { LateBadge, OPERATION_STATUS_LABEL, ShortBadge, StatusBadge } from '@/components/common/StatusBadge';
import { ViewToggle, type ViewMode } from '@/components/common/ViewToggle';
import { Button } from '@/components/ui/button';
import { useWarehouses } from '@/features/master/queries';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDate, formatNumber } from '@/lib/format';
import { REASON_LABEL, type OperationRow, type OperationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/store/auth';
import { KanbanBoard } from '../components/KanbanBoard';
import { OPERATION_CONFIG, operationPath, type OperationSegment } from '../config';
import { useOperationList } from '../queries';

const LIMIT = 20;

export default function OperationListPage() {
  const { type: segment } = useParams<{ type: OperationSegment }>();
  const config = segment ? OPERATION_CONFIG[segment] : undefined;
  if (!config) return <Navigate to="/operations/receipts" replace />;
  return <ListView key={config.segment} segment={config.segment} />;
}

function ListView({ segment }: { segment: OperationSegment }) {
  const config = OPERATION_CONFIG[segment];
  const navigate = useNavigate();
  const canAdjust = useHasRole('manager');
  const canCreate = config.type !== 'adjustment' || canAdjust;
  const [q, setQ] = useUrlState({ status: '', search: '', warehouse: '', late: '', upcoming: '', view: 'list', page: '1' });
  const view = (config.hasKanban ? q.view : 'list') as ViewMode;
  const page = Number(q.page) || 1;
  const { data: warehouses = [] } = useWarehouses();

  const base = { type: config.type, search: q.search, warehouse: q.warehouse, late: q.late, upcoming: q.upcoming };
  const list = useOperationList({ ...base, status: q.status, page, limit: LIMIT, sort: config.type === 'adjustment' ? '-createdAt' : '-scheduleDate' });
  const counts = list.data?.meta.statusCounts ?? {};
  const allCount = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);

  useHotkeys(canCreate ? [{ combo: 'n', handler: () => navigate(`/operations/${segment}/new`) }] : []);

  const columns = useMemo<ColumnDef<OperationRow, unknown>[]>(() => {
    if (config.type === 'adjustment') {
      return [
        { id: 'reference', header: 'Reference', cell: ({ row }) => <Reference>{row.original.reference}</Reference> },
        { id: 'product', header: 'Product', cell: ({ row }) => <span className="truncate">{row.original.products[0] || '—'}</span> },
        {
          id: 'location',
          header: 'Location',
          meta: { className: 'hidden md:table-cell' },
          cell: ({ row }) => <LocationChip name={row.original.fromType === 'internal' ? row.original.from : row.original.to} type="internal" />,
        },
        {
          id: 'diff',
          header: 'Difference',
          cell: ({ row }) => <SignedQty value={row.original.fromType === 'internal' ? -row.original.totalQty : row.original.totalQty} />,
        },
        { id: 'reason', header: 'Reason', meta: { className: 'hidden lg:table-cell' }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason ? REASON_LABEL[row.original.reason] : '—'}</span> },
        { id: 'date', header: 'Date', cell: ({ row }) => <span className="tabular text-muted-foreground">{formatDate(row.original.doneDate ?? row.original.scheduleDate)}</span> },
        { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ];
    }
    return [
      {
        id: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <Reference>{row.original.reference}</Reference>
            {row.original.hasShortage && <ShortBadge />}
          </span>
        ),
      },
      { id: 'from', header: 'From', meta: { className: 'hidden lg:table-cell' }, cell: ({ row }) => <LocationChip name={row.original.from} type={row.original.fromType} /> },
      { id: 'to', header: 'To', meta: { className: 'hidden lg:table-cell' }, cell: ({ row }) => <LocationChip name={row.original.to} type={row.original.toType} /> },
      {
        id: 'flow',
        header: 'From → To',
        meta: { className: 'lg:hidden' },
        cell: ({ row }) => <LocationFlow from={row.original.from} fromType={row.original.fromType} to={row.original.to} toType={row.original.toType} />,
      },
      ...(config.type === 'internal'
        ? []
        : [{ id: 'contact', header: 'Contact', meta: { className: 'hidden md:table-cell' }, cell: ({ row }) => <ContactName name={row.original.contact} /> } as ColumnDef<OperationRow, unknown>]),
      {
        id: 'date',
        header: 'Schedule date',
        cell: ({ row }) => (
          <span className={cn('tabular inline-flex items-center gap-2', row.original.isLate ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {formatDate(row.original.scheduleDate)}
            {row.original.isLate && <LateBadge />}
          </span>
        ),
      },
      { id: 'qty', header: 'Qty', meta: { className: 'hidden xl:table-cell text-right' }, cell: ({ row }) => <span className="tabular block text-right font-mono text-[13px]">{formatNumber(row.original.totalQty)}</span> },
      { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ];
  }, [config.type]);

  const tabs: ('' | OperationStatus)[] = ['', ...config.statuses];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations' }, { label: config.title }]}
        title={config.title}
        titleAdornment={<span className="tabular rounded-full bg-muted px-2 py-0.5 text-[13px] font-medium text-muted-foreground">{formatNumber(allCount)}</span>}
        description={config.description}
        actions={
          canCreate && (
            <Button variant="gradient" asChild>
              <Link to={`/operations/${segment}/new`}>
                <Plus /> NEW
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {config.type !== 'adjustment' ? (
          <div role="tablist" aria-label="Filter by status" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
            {tabs.map((s) => {
              const active = q.status === s;
              const n = s ? (counts[s] ?? 0) : allCount;
              return (
                <button
                  key={s || 'all'}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setQ({ status: s })}
                  className={cn(
                    'relative flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  {active && <motion.span layoutId={`tab-${segment}`} className="absolute inset-0 rounded-lg border bg-card shadow-xs" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <span className="relative">{s ? OPERATION_STATUS_LABEL[s] : 'All'}</span>
                  <span className={cn('tabular relative rounded-full px-1.5 text-[11px]', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{n}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Warehouse"
            icon={WarehouseIcon}
            value={q.warehouse}
            onChange={(v) => setQ({ warehouse: v })}
            options={warehouses.map((w) => ({ value: w._id, label: w.shortCode, hint: w.name }))}
          />
          {config.type !== 'adjustment' && (
            <>
              <FilterSelect label="Late" icon={Timer} value={q.late} onChange={(v) => setQ({ late: v, upcoming: '' })} options={[{ value: 'true', label: 'Late only' }]} />
              <FilterSelect label="Upcoming" icon={CalendarClock} value={q.upcoming} onChange={(v) => setQ({ upcoming: v, late: '' })} options={[{ value: 'true', label: 'After today' }]} />
            </>
          )}
          <SearchInput value={q.search} onChange={(v) => setQ({ search: v })} placeholder="Search reference or contact…" />
          {config.hasKanban && <ViewToggle value={view} onChange={(v) => setQ({ view: v })} />}
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard config={config} params={base} />
      ) : (
        <DataTable
          aria-label={config.title}
          data={list.data?.items}
          columns={columns}
          isLoading={list.isLoading || list.isFetching}
          error={list.error}
          onRetry={() => void list.refetch()}
          getRowId={(r) => r._id}
          onRowClick={(r) => navigate(operationPath(r.type, r._id))}
          rowClassName={(r) => (r.hasShortage ? 'bg-destructive/[0.03]' : undefined)}
          empty={{
            icon: config.icon,
            title: q.search || q.status || q.warehouse || q.late || q.upcoming ? 'No operations match these filters' : config.emptyTitle,
            description: q.search || q.status || q.warehouse || q.late || q.upcoming ? 'Try a different status, search or filter.' : config.emptyDescription,
            action: canCreate ? (
              <Button variant="gradient" asChild>
                <Link to={`/operations/${segment}/new`}>
                  <Plus /> New {config.singular}
                </Link>
              </Button>
            ) : undefined,
          }}
          renderCard={(r) => (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <Reference>{r.reference}</Reference>
                <StatusBadge status={r.status} />
              </div>
              {r.contact && <ContactName name={r.contact} />}
              <LocationFlow from={r.from} fromType={r.fromType} to={r.to} toType={r.toType} />
              <div className="flex items-center justify-between text-caption">
                <span className={cn('tabular inline-flex items-center gap-1.5', r.isLate ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                  {formatDate(r.scheduleDate)} {r.isLate && <LateBadge />}
                </span>
                <span className="text-muted-foreground">
                  {r.lineCount} product{r.lineCount === 1 ? '' : 's'} · {formatNumber(r.totalQty)}
                </span>
              </div>
            </div>
          )}
          footer={
            list.data && list.data.meta.total > LIMIT ? (
              <Pagination page={page} limit={LIMIT} total={list.data.meta.total} onPageChange={(p) => setQ({ page: String(p) })} noun="operations" />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
