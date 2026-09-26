import { getData } from '@/lib/api';
import type { DashboardCharts, DashboardSummary, OperationRow, OperationStatus, OperationType } from '@/lib/types';

/** URL-synced dashboard filters. Empty string = not set. */
export type DashboardFilters = {
  type: '' | OperationType;
  status: '' | OperationStatus;
  warehouse: string;
  location: string;
  category: string;
};

export const DEFAULT_FILTERS: DashboardFilters = { type: '', status: '', warehouse: '', location: '', category: '' };

export interface ChartParams {
  days: number;
  warehouse: string;
  category: string;
}

export const dashboardApi = {
  summary: (f: DashboardFilters) => getData<DashboardSummary>('/dashboard/summary', { ...f }),
  charts: (p: ChartParams) => getData<DashboardCharts>('/dashboard/charts', { ...p }),
  recent: (f: DashboardFilters) => getData<OperationRow[]>('/dashboard/recent', { ...f }),
};
