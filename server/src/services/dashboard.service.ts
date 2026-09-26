import { Types } from 'mongoose';
import { Category } from '../models/Category';
import { Operation, OPEN_STATUSES, type OperationStatus, type OperationType } from '../models/Operation';
import { Product } from '../models/Product';
import { StockMove } from '../models/StockMove';
import { buildOperationFilter, endOfToday, listOperations, startOfToday } from './operation.service';
import { stockPipeline } from './stock.service';

export interface DashboardFilters {
  type?: OperationType;
  status?: OperationStatus;
  warehouse?: string;
  location?: string;
  category?: string;
}

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Card definitions (from the mockup legend):
 *  - To Receive / To Deliver: status Ready
 *  - Late: schedule date before today and not done/canceled
 *  - Operations: schedule date after today and not done/canceled
 *  - Waiting: deliveries waiting for stock
 */
export async function summary(f: DashboardFilters) {
  const base = await buildOperationFilter({ warehouse: f.warehouse, location: f.location, category: f.category }, false);
  const open = { $in: OPEN_STATUSES };
  const today = startOfToday();
  const end = endOfToday();
  const count = (extra: Record<string, unknown>) => Operation.countDocuments({ ...base, ...extra });

  const [
    toReceive,
    receiptLate,
    receiptUpcoming,
    receiptToday,
    toDeliver,
    deliveryLate,
    deliveryWaiting,
    deliveryUpcoming,
    deliveryToday,
    pendingReceipts,
    pendingDeliveries,
    internalScheduled,
    stockAgg,
    alerts,
  ] = await Promise.all([
    count({ type: 'receipt', status: 'ready' }),
    count({ type: 'receipt', status: open, scheduleDate: { $lt: today } }),
    count({ type: 'receipt', status: open, scheduleDate: { $gt: end } }),
    count({ type: 'receipt', status: open, scheduleDate: { $gte: today, $lte: end } }),
    count({ type: 'delivery', status: 'ready' }),
    count({ type: 'delivery', status: open, scheduleDate: { $lt: today } }),
    count({ type: 'delivery', status: 'waiting' }),
    count({ type: 'delivery', status: open, scheduleDate: { $gt: end } }),
    count({ type: 'delivery', status: open, scheduleDate: { $gte: today, $lte: end } }),
    count({ type: 'receipt', status: open }),
    count({ type: 'delivery', status: open }),
    count({ type: 'internal', status: open }),
    Product.aggregate<{ inStock: number; low: number; out: number; value: number; products: number; onHand: number }>([
      ...stockPipeline({ warehouse: f.warehouse, location: f.location, category: f.category }),
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          inStock: { $sum: { $cond: [{ $gt: ['$onHand', 0] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$status', 'low'] }, 1, 0] } },
          out: { $sum: { $cond: [{ $eq: ['$status', 'out'] }, 1, 0] } },
          value: { $sum: '$value' },
          onHand: { $sum: '$onHand' },
        },
      },
    ]),
    Product.aggregate([
      ...stockPipeline({ warehouse: f.warehouse, location: f.location, category: f.category }),
      { $match: { hasRule: true, status: { $in: ['low', 'out'] } } },
      { $sort: { freeToUse: 1, sku: 1 } },
      { $limit: 8 },
      { $project: { _id: 1, sku: 1, name: 1, uom: 1, freeToUse: 1, onHand: 1, minQty: 1, maxQty: 1, status: 1 } },
    ]),
  ]);

  const s = stockAgg[0] ?? { inStock: 0, low: 0, out: 0, value: 0, products: 0, onHand: 0 };
  return {
    receipt: { toReceive, late: receiptLate, operations: receiptUpcoming, today: receiptToday },
    delivery: { toDeliver, late: deliveryLate, waiting: deliveryWaiting, operations: deliveryUpcoming, today: deliveryToday },
    kpis: {
      totalProducts: s.products,
      totalProductsInStock: s.inStock,
      totalUnits: s.onHand,
      lowStock: s.low,
      outOfStock: s.out,
      pendingReceipts,
      pendingDeliveries,
      internalTransfersScheduled: internalScheduled,
      stockValue: Math.round(s.value * 100) / 100,
    },
    alerts,
  };
}

export async function charts(f: { days: number; warehouse?: string; category?: string }) {
  const start = startOfToday();
  start.setDate(start.getDate() - (f.days - 1));

  const moveMatch: Record<string, unknown> = { date: { $gte: start } };
  if (f.warehouse) moveMatch.warehouse = new Types.ObjectId(f.warehouse);
  if (f.category) {
    const products = await Product.find({ category: f.category }).select('_id').lean();
    moveMatch.product = { $in: products.map((p) => p._id) };
  }

  const [daily, byCategory, movers] = await Promise.all([
    StockMove.aggregate<{ _id: string; in: number; out: number }>([
      { $match: moveMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } },
          in: { $sum: { $cond: [{ $eq: ['$effect', 1] }, '$quantity', 0] } },
          out: { $sum: { $cond: [{ $eq: ['$effect', -1] }, '$quantity', 0] } },
        },
      },
    ]),
    Product.aggregate<{ _id: Types.ObjectId | null; value: number; onHand: number }>([
      ...stockPipeline({ warehouse: f.warehouse, category: f.category }),
      { $group: { _id: '$category', value: { $sum: '$value' }, onHand: { $sum: '$onHand' } } },
      { $sort: { value: -1 } },
    ]),
    StockMove.aggregate<{ _id: Types.ObjectId; quantity: number; moves: number }>([
      { $match: { ...moveMatch, direction: { $in: ['in', 'out'] } } },
      { $group: { _id: '$product', quantity: { $sum: '$quantity' }, moves: { $sum: 1 } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const byDay = new Map(daily.map((d) => [d._id, d]));
  const series: { date: string; in: number; out: number }[] = [];
  for (let i = 0; i < f.days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    series.push({ date: key, in: byDay.get(key)?.in ?? 0, out: byDay.get(key)?.out ?? 0 });
  }

  const cats = await Category.find({ _id: { $in: byCategory.map((c) => c._id).filter(Boolean) } }).select('name').lean();
  const catName = new Map(cats.map((c) => [String(c._id), c.name]));
  const products = await Product.find({ _id: { $in: movers.map((m) => m._id) } }).select('sku name uom').lean();
  const prod = new Map(products.map((p) => [String(p._id), p]));

  return {
    inOut: series,
    valueByCategory: byCategory
      .filter((c) => c.value > 0)
      .map((c) => ({ category: c._id ? (catName.get(String(c._id)) ?? 'Uncategorised') : 'Uncategorised', value: Math.round(c.value), onHand: c.onHand })),
    topMovers: movers.map((m) => {
      const p = prod.get(String(m._id));
      return { productId: String(m._id), sku: p?.sku ?? '', name: p?.name ?? 'Deleted product', uom: p?.uom ?? '', quantity: m.quantity, moves: m.moves };
    }),
  };
}

export async function recent(f: DashboardFilters & { limit?: number }) {
  const { items } = await listOperations({ ...f, page: 1, limit: f.limit ?? 8, sort: '-createdAt' });
  return items;
}
