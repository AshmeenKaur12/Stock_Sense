import { getData, getPaged, patchData, postData } from '@/lib/api';
import type { AdjustmentReason, OperationDetail, Product, StockLocationRow, StockRow, StockStatus, StockSummary } from '@/lib/types';

export interface StockListParams {
  search?: string;
  warehouse?: string;
  location?: string;
  category?: string;
  stockStatus?: StockStatus | '';
  page?: number;
  limit?: number;
  sort?: 'sku' | 'name' | 'onHand' | '-onHand' | 'status';
}

export interface StockListMeta {
  summary: StockSummary;
}

export interface StockLocationsResponse {
  product: { sku: string; name: string; uom: string; perUnitCost: number };
  locations: StockLocationRow[];
}

export type ManualAdjustmentReason = Exclude<AdjustmentReason, 'initial_stock'>;

export interface AdjustStockBody {
  location: string;
  countedQty: number;
  reason: ManualAdjustmentReason;
  notes?: string;
}

export interface AdjustStockResult {
  id: string;
  recorded: number;
  counted: number;
  difference: number;
  operation: OperationDetail | null;
}

export interface CreateProductBody {
  name: string;
  sku: string;
  category: string | null;
  uom: string;
  perUnitCost: number;
  salePrice: number;
  initialStock?: { quantity: number; location: string };
}

export const stockApi = {
  list: (params: StockListParams) => getPaged<StockRow, StockListMeta>('/stock', { ...params }),
  locations: (productId: string, warehouse?: string) =>
    getData<StockLocationsResponse>(`/stock/${productId}/locations`, { warehouse }),
  adjust: (productId: string, body: AdjustStockBody) => patchData<AdjustStockResult>(`/stock/${productId}`, body),
  createProduct: (body: CreateProductBody) => postData<Product>('/products', body),
};
