import { downloadFile, getData, getPaged } from '@/lib/api';
import type { MoveDirection, MoveKanbanColumn, MoveRow, OperationType } from '@/lib/types';

export interface MoveFilters {
  search?: string;
  product?: string;
  location?: string;
  warehouse?: string;
  direction?: MoveDirection;
  /** YYYY-MM-DD (inclusive) */
  from?: string;
  /** YYYY-MM-DD (inclusive) */
  to?: string;
}

export interface MoveListParams extends MoveFilters {
  page?: number;
  limit?: number;
}

export type MoveTotals = Partial<Record<MoveDirection, { qty: number; count: number }>>;

export interface MoveListMeta {
  totals: MoveTotals;
}

export const movesApi = {
  list: (params: MoveListParams) => getPaged<MoveRow, MoveListMeta>('/moves', { ...params }),
  kanban: (params: MoveFilters) => getData<MoveKanbanColumn[]>('/moves/kanban', { ...params }),
  exportCsv: (params: MoveFilters) => downloadFile('/moves/export.csv', { ...params }, 'stocksense-moves.csv'),
};

const OPERATION_SEGMENT: Record<OperationType, string> = {
  receipt: 'receipts',
  delivery: 'deliveries',
  internal: 'transfers',
  adjustment: 'adjustments',
};

/** Detail route of the operation that produced a ledger row. */
export const operationPath = (move: Pick<MoveRow, 'operationType' | 'operation'>) => `/operations/${OPERATION_SEGMENT[move.operationType]}/${move.operation}`;
