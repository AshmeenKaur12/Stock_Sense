import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { stockApi, type AdjustStockBody, type CreateProductBody, type StockListParams } from './api';

export function useStockList(params: StockListParams) {
  return useQuery({
    queryKey: queryKeys.stock.list({ ...params }),
    queryFn: () => stockApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** Per-location breakdown for one product (shared by the expansion and the adjust popover). */
export function useStockLocations(productId: string, enabled = true, warehouse?: string) {
  return useQuery({
    queryKey: [...queryKeys.stock.locations(productId), warehouse ?? ''],
    queryFn: () => stockApi.locations(productId, warehouse || undefined),
    enabled: enabled && !!productId,
    staleTime: 15_000,
  });
}

export function useAdjustStock(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdjustStockBody) => stockApi.adjust(productId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.stock.all });
      void qc.invalidateQueries({ queryKey: queryKeys.moves.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductBody) => stockApi.createProduct(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.stock.all });
      void qc.invalidateQueries({ queryKey: queryKeys.products.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
