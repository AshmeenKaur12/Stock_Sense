import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { useCategories, useLocations, useWarehouses } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import type { OperationStatus, OperationType } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { DEFAULT_FILTERS, type DashboardFilters } from '../api';
import { CategoryDonut } from '../components/CategoryDonut';
import { DashboardFilterBar } from '../components/DashboardFilterBar';
import { DashboardHero } from '../components/DashboardHero';
import { FlowCards } from '../components/FlowCards';
import { InOutChart } from '../components/InOutChart';
import { KpiBento } from '../components/KpiBento';
import { LowStockAlerts } from '../components/LowStockAlerts';
import { RecentOperations } from '../components/RecentOperations';
import { TopMovers } from '../components/TopMovers';
import { fadeUp, stagger } from '../components/primitives';
import { useDashboardCharts, useDashboardSummary, useRecentOperations } from '../queries';

const CHART_DAYS = 30;
const TREND_DAYS = 14;
const TYPES: readonly OperationType[] = ['receipt', 'delivery', 'internal', 'adjustment'];
const STATUSES: readonly OperationStatus[] = ['draft', 'waiting', 'ready', 'done', 'canceled'];
const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Drops hand-edited URL values the API would reject (422) so the page never errors on a bad link. */
function sanitize(raw: DashboardFilters): DashboardFilters {
  const id = (v: string) => (OBJECT_ID.test(v) ? v : '');
  return {
    type: TYPES.includes(raw.type as OperationType) ? raw.type : '',
    status: STATUSES.includes(raw.status as OperationStatus) ? raw.status : '',
    warehouse: id(raw.warehouse),
    location: id(raw.location),
    category: id(raw.category),
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] || user?.loginId;

  const [rawFilters, setFilters] = useUrlState<DashboardFilters>(DEFAULT_FILTERS);
  const filters = useMemo(() => sanitize(rawFilters), [rawFilters]);
  const filtered = Object.values(filters).some((v) => v !== '');

  const warehouses = useWarehouses();
  const locations = useLocations({ warehouse: filters.warehouse || undefined, type: 'internal' });
  const categories = useCategories();

  const summary = useDashboardSummary(filters);
  const charts = useDashboardCharts({ days: CHART_DAYS, warehouse: filters.warehouse, category: filters.category });
  const recent = useRecentOperations(filters);

  const { trendIn, trendOut } = useMemo(() => {
    const series = charts.data?.inOut.slice(-TREND_DAYS) ?? [];
    return { trendIn: series.map((d) => d.in), trendOut: series.map((d) => d.out) };
  }, [charts.data]);

  const chartProps = {
    loading: charts.isPending,
    error: charts.error,
    onRetry: () => void charts.refetch(),
    retrying: charts.isFetching,
  };
  const summaryError = summary.error && !summary.data;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 lg:space-y-8">
      <div className="space-y-5">
        <DashboardHero
          firstName={firstName}
          summary={summary.data}
          summaryLoading={summary.isPending}
          warehouses={warehouses.data ?? []}
          warehousesLoading={warehouses.isPending}
          warehouse={filters.warehouse}
          onWarehouseChange={(id) => setFilters({ warehouse: id, location: '' })}
        />
        <DashboardFilterBar
          filters={filters}
          onChange={setFilters}
          warehouses={warehouses.data ?? []}
          locations={locations.data ?? []}
          categories={categories.data ?? []}
        />
      </div>

      <section aria-label="Receipts and deliveries" className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {summaryError ? (
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <ErrorState error={summary.error} onRetry={() => void summary.refetch()} retrying={summary.isFetching} />
          </motion.div>
        ) : (
          <FlowCards summary={summary.data} loading={summary.isPending} trendIn={trendIn} trendOut={trendOut} />
        )}
      </section>

      {!summaryError && <KpiBento summary={summary.data} loading={summary.isPending} trendIn={trendIn} trendOut={trendOut} />}

      <div className="grid min-w-0 gap-4 lg:gap-5 xl:grid-cols-12">
        <InOutChart {...chartProps} data={charts.data?.inOut} days={CHART_DAYS} className="xl:col-span-8" />
        <CategoryDonut {...chartProps} data={charts.data?.valueByCategory} className="xl:col-span-4" />
      </div>

      <div className="grid min-w-0 items-start gap-4 lg:gap-5 xl:grid-cols-12">
        <RecentOperations
          data={recent.data}
          loading={recent.isPending}
          error={recent.error}
          onRetry={() => void recent.refetch()}
          retrying={recent.isFetching}
          filtered={filtered}
          className="xl:col-span-8"
        />
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:gap-5 xl:col-span-4 xl:grid-cols-1">
          <LowStockAlerts
            alerts={summary.data?.alerts}
            lowCount={summary.data?.kpis.lowStock}
            outCount={summary.data?.kpis.outOfStock}
            loading={summary.isPending}
            error={summary.error}
            onRetry={() => void summary.refetch()}
            retrying={summary.isFetching}
          />
          <TopMovers {...chartProps} data={charts.data?.topMovers} days={CHART_DAYS} />
        </div>
      </div>
    </motion.div>
  );
}
