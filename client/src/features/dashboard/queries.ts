import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { dashboardApi, type ChartParams, type DashboardFilters } from './api';

/** Realtime sockets invalidate `queryKeys.dashboard.all`, so every key below refreshes live. */

export function useDashboardSummary(filters: DashboardFilters) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary({ ...filters }),
    queryFn: () => dashboardApi.summary(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useDashboardCharts(params: ChartParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.charts({ ...params }),
    queryFn: () => dashboardApi.charts(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useRecentOperations(filters: DashboardFilters) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.recent, { ...filters }],
    queryFn: () => dashboardApi.recent(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
