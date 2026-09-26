/** Domain types mirroring the StockSense REST API (server/src). */

export type Role = 'staff' | 'manager' | 'admin';
export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';
export type StockStatus = 'in' | 'low' | 'out';
export type MoveDirection = 'in' | 'out' | 'internal' | 'adjust';
export type LocationType = 'internal' | 'vendor' | 'customer' | 'adjustment';
export type AdjustmentReason = 'damaged' | 'lost' | 'count_correction' | 'expired' | 'initial_stock';
export type DeliveryKind = 'delivery_order' | 'return' | 'dropship';
export type NotificationType = 'low_stock' | 'out_of_stock' | 'waiting' | 'late';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  [key: string]: unknown;
}

export interface Paged<T, M extends object = object> {
  items: T[];
  meta: PageMeta & M;
}

export interface Ref {
  _id: string;
  name: string;
}

export interface Warehouse {
  _id: string;
  name: string;
  shortCode: string;
  address: string;
  locationCount?: number;
  createdAt?: string;
}

export interface Location {
  _id: string;
  name: string;
  shortCode: string;
  fullName: string;
  type: LocationType;
  warehouse: { _id: string; name: string; shortCode: string };
}

export interface Category {
  _id: string;
  name: string;
  parent: string | null;
  description: string;
  productCount: number;
}

export interface Contact {
  _id: string;
  name: string;
  type: 'vendor' | 'customer';
  email: string;
  phone: string;
  address: string;
}

export interface ReorderRule {
  _id: string;
  product: { _id: string; sku: string; name: string; uom: string } | string;
  warehouse: { _id: string; shortCode: string; name: string } | string;
  minQty: number;
  maxQty: number;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  displayName: string;
  category: Ref | null;
  uom: string;
  perUnitCost: number;
  salePrice: number;
  isActive: boolean;
  reorderRules?: ReorderRule[];
}

export interface StockRow {
  _id: string;
  name: string;
  sku: string;
  uom: string;
  perUnitCost: number;
  salePrice: number;
  category: Ref | null;
  onHand: number;
  reserved: number;
  freeToUse: number;
  value: number;
  status: StockStatus;
  minQty: number;
  maxQty: number;
  hasRule: boolean;
  locationCount: number;
}

export interface StockSummary {
  onHand: number;
  value: number;
  low: number;
  out: number;
}

export interface StockLocationRow {
  _id: string;
  warehouse: { _id: string; name: string; shortCode: string };
  location: { _id: string; name: string; shortCode: string; fullName: string; type: LocationType };
  onHand: number;
  reserved: number;
  freeToUse: number;
}

export interface OperationRow {
  _id: string;
  reference: string;
  type: OperationType;
  status: OperationStatus;
  from: string;
  fromType: LocationType | '';
  to: string;
  toType: LocationType | '';
  contact: string;
  scheduleDate: string;
  doneDate: string | null;
  isLate: boolean;
  picked: boolean;
  packed: boolean;
  reason: AdjustmentReason | null;
  lineCount: number;
  totalQty: number;
  hasShortage: boolean;
  products: string[];
}

export interface OperationLine {
  _id: string;
  product: { _id: string; sku: string; name: string; uom: string; perUnitCost: number; salePrice: number } | null;
  quantity: number;
  doneQty: number;
  reservedQty: number;
  isShort: boolean;
  availableQty: number | null;
  recordedQty: number | null;
  countedQty: number | null;
  /** Live free-to-use at the source (incl. this line's reservation); null when not applicable. */
  available: number | null;
}

export interface OperationDetail {
  _id: string;
  reference: string;
  type: OperationType;
  status: OperationStatus;
  warehouse: { _id: string; name: string; shortCode: string };
  contact: (Contact & { _id: string }) | null;
  sourceLocation: { _id: string; name: string; shortCode: string; fullName: string; type: LocationType; warehouse: string };
  destinationLocation: { _id: string; name: string; shortCode: string; fullName: string; type: LocationType; warehouse: string };
  deliveryAddress: string;
  operationType: DeliveryKind;
  scheduleDate: string;
  doneDate: string | null;
  responsible: { _id: string; name: string; loginId: string; avatarUrl?: string | null } | null;
  picked: boolean;
  packed: boolean;
  reason: AdjustmentReason | null;
  notes: string;
  lines: OperationLine[];
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  status: OperationStatus;
  total: number;
  items: OperationRow[];
}

export interface MoveRow {
  _id: string;
  reference: string;
  operation: string;
  operationType: OperationType;
  date: string;
  contact: string;
  product: { _id: string; sku: string; name: string; uom: string } | null;
  from: string;
  fromType: LocationType | '';
  to: string;
  toType: LocationType | '';
  quantity: number;
  effect: 1 | -1 | 0;
  signedQty: number;
  direction: MoveDirection;
  status: string;
  reason: AdjustmentReason | null;
  user: { name: string; avatarUrl: string | null } | null;
}

export interface MoveKanbanColumn {
  direction: MoveDirection;
  total: number;
  items: MoveRow[];
}

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  receipt: { toReceive: number; late: number; operations: number; today: number };
  delivery: { toDeliver: number; late: number; waiting: number; operations: number; today: number };
  kpis: {
    totalProducts: number;
    totalProductsInStock: number;
    totalUnits: number;
    lowStock: number;
    outOfStock: number;
    pendingReceipts: number;
    pendingDeliveries: number;
    internalTransfersScheduled: number;
    stockValue: number;
  };
  alerts: { _id: string; sku: string; name: string; uom: string; freeToUse: number; onHand: number; minQty: number; maxQty: number; status: StockStatus }[];
}

export interface DashboardCharts {
  inOut: { date: string; in: number; out: number }[];
  valueByCategory: { category: string; value: number; onHand: number }[];
  topMovers: { productId: string; sku: string; name: string; uom: string; quantity: number; moves: number }[];
}

export interface PublicUser {
  _id: string;
  loginId: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export type ActivityItem =
  | { kind: 'operation'; id: string; reference: string; type: OperationType; status: OperationStatus; at: string }
  | { kind: 'move'; id: string; reference: string; direction: MoveDirection; effect: number; quantity: number; product: { sku: string; name: string } | null; at: string };

export const REASON_LABEL: Record<AdjustmentReason, string> = {
  damaged: 'Damaged',
  lost: 'Lost',
  count_correction: 'Count correction',
  expired: 'Expired',
  initial_stock: 'Initial stock',
};

export const DELIVERY_KIND_LABEL: Record<DeliveryKind, string> = {
  delivery_order: 'Delivery order',
  return: 'Return',
  dropship: 'Dropship',
};
