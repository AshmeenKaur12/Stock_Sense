import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, getPaged, patchData, postData } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { KanbanColumn, OperationDetail, OperationRow, OperationStatus, OperationType, StockLocationRow } from '@/lib/types';

export interface ListParams {
  type: OperationType;
  status?: string;
  search?: string;
  warehouse?: string;
  late?: string;
  upcoming?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export function useOperationList(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.operations.list(params as unknown as Record<string, unknown>),
    queryFn: () => getPaged<OperationRow, { statusCounts: Partial<Record<OperationStatus, number>> }>('/operations', params as unknown as Record<string, unknown>),
    placeholderData: keepPreviousData,
  });
}

export function useOperationKanban(params: Omit<ListParams, 'status' | 'page' | 'limit'>, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.operations.kanban(params as unknown as Record<string, unknown>),
    queryFn: () => getData<KanbanColumn[]>('/operations/kanban', params as unknown as Record<string, unknown>),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useOperation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.operations.detail(id ?? ''),
    queryFn: () => getData<OperationDetail>(`/operations/${id}`),
    enabled: !!id,
  });
}

/** Free-to-use of a product at one location (live hint on unsaved lines). */
export function useFreeAt(productId: string | undefined, locationId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.stock.locations(productId ?? ''), locationId],
    queryFn: async () => {
      const res = await getData<{ locations: StockLocationRow[] }>(`/stock/${productId}/locations`);
      return res.locations.find((l) => l.location._id === locationId)?.freeToUse ?? 0;
    },
    enabled: !!productId && !!locationId,
    staleTime: 10_000,
  });
}

export type OperationAction = 'todo' | 'check-availability' | 'validate' | 'cancel' | 'pick' | 'pack';

function useInvalidate() {
  const qc = useQueryClient();
  return (op?: OperationDetail) => {
    if (op) qc.setQueryData(queryKeys.operations.detail(op._id), op);
    void qc.invalidateQueries({ queryKey: queryKeys.operations.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    void qc.invalidateQueries({ queryKey: queryKeys.stock.all });
    void qc.invalidateQueries({ queryKey: queryKeys.moves.all });
  };
}

export function useSaveOperation() {
  const refresh = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id ? patchData<OperationDetail>(`/operations/${id}`, body) : postData<OperationDetail>('/operations', body),
    onSuccess: ({ data }) => refresh(data),
  });
}

export function useOperationAction() {
  const refresh = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action, value }: { id: string; action: OperationAction; value?: boolean }) =>
      postData<OperationDetail>(`/operations/${id}/${action}`, value === undefined ? undefined : { value }),
    onSuccess: ({ data }) => refresh(data),
  });
}

export function useSetStatus() {
  const refresh = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OperationStatus }) => patchData<OperationDetail>(`/operations/${id}/status`, { status }),
    onSettled: (res) => refresh(res?.data),
  });
}

export function useApplyAdjustment() {
  const refresh = useInvalidate();
  return useMutation({
    mutationFn: (body: { product: string; location: string; countedQty: number; reason: string; notes?: string }) =>
      postData<OperationDetail>('/operations', { type: 'adjustment', ...body }),
    onSuccess: ({ data }) => refresh(data),
  });
}
