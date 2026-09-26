import { Types, type PipelineStage } from 'mongoose';
import { Product } from '../models/Product';
import { StockQuant } from '../models/StockQuant';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../validators/common';
import { applyAdjustment, type Actor, type AdjustmentInput } from './operation.service';

export type StockStatus = 'in' | 'low' | 'out';

export interface StockFilters {
  search?: string;
  warehouse?: string;
  location?: string;
  category?: string;
  stockStatus?: StockStatus;
}

/**
 * One aggregation that yields, per active product: on hand, reserved, free to use,
 * valuation and status (out: free ≤ 0 · low: free ≤ reorder min · in: otherwise),
 * scoped to an optional warehouse/location/category.
 */
export function stockPipeline(f: StockFilters): PipelineStage[] {
  const productMatch: Record<string, unknown> = { deletedAt: null, isActive: true };
  if (f.category) productMatch.category = new Types.ObjectId(f.category);
  if (f.search) {
    const rx = new RegExp(escapeRegex(f.search), 'i');
    productMatch.$or = [{ name: rx }, { sku: rx }];
  }
  const quantMatch: Record<string, unknown>[] = [{ $expr: { $eq: ['$product', '$$pid'] } }];
  if (f.warehouse) quantMatch.push({ warehouse: new Types.ObjectId(f.warehouse) });
  if (f.location) quantMatch.push({ location: new Types.ObjectId(f.location) });
  const ruleMatch: Record<string, unknown>[] = [{ $expr: { $eq: ['$product', '$$pid'] } }];
  if (f.warehouse) ruleMatch.push({ warehouse: new Types.ObjectId(f.warehouse) });

  return [
    { $match: productMatch },
    { $lookup: { from: 'stockquants', let: { pid: '$_id' }, pipeline: [{ $match: { $and: quantMatch } }], as: 'quants' } },
    { $lookup: { from: 'reorderrules', let: { pid: '$_id' }, pipeline: [{ $match: { $and: ruleMatch } }], as: 'rules' } },
    {
      $addFields: {
        onHand: { $sum: '$quants.onHand' },
        reserved: { $sum: '$quants.reserved' },
        hasRule: { $gt: [{ $size: '$rules' }, 0] },
        minQty: { $sum: '$rules.minQty' },
        maxQty: { $sum: '$rules.maxQty' },
        locationCount: { $size: { $filter: { input: '$quants', cond: { $gt: ['$$this.onHand', 0] } } } },
      },
    },
    { $addFields: { freeToUse: { $max: [0, { $subtract: ['$onHand', '$reserved'] }] }, value: { $multiply: ['$onHand', '$perUnitCost'] } } },
    {
      $addFields: {
        status: {
          $switch: {
            branches: [
              { case: { $lte: ['$freeToUse', 0] }, then: 'out' },
              { case: { $and: ['$hasRule', { $lte: ['$freeToUse', '$minQty'] }] }, then: 'low' },
            ],
            default: 'in',
          },
        },
      },
    },
    ...(f.stockStatus ? [{ $match: { status: f.stockStatus } }] : []),
  ];
}

export async function listStock(f: StockFilters & { page: number; limit: number; sort?: string }) {
  const sort: Record<string, 1 | -1> =
    f.sort === 'onHand' ? { onHand: 1 } : f.sort === '-onHand' ? { onHand: -1 } : f.sort === 'name' ? { name: 1 } : f.sort === 'status' ? { status: -1, sku: 1 } : { sku: 1 };
  const [result] = await Product.aggregate<{ items: Record<string, unknown>[]; total: { n: number }[]; summary: { onHand: number; value: number; low: number; out: number }[] }>([
    ...stockPipeline(f),
    {
      $facet: {
        items: [
          { $sort: sort },
          { $skip: (f.page - 1) * f.limit },
          { $limit: f.limit },
          { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
          {
            $project: {
              _id: 1,
              name: 1,
              sku: 1,
              uom: 1,
              perUnitCost: 1,
              salePrice: 1,
              category: { $let: { vars: { c: { $first: '$category' } }, in: { _id: '$$c._id', name: '$$c.name' } } },
              onHand: 1,
              reserved: 1,
              freeToUse: 1,
              value: 1,
              status: 1,
              minQty: 1,
              maxQty: 1,
              hasRule: 1,
              locationCount: 1,
            },
          },
        ],
        total: [{ $count: 'n' }],
        summary: [
          {
            $group: {
              _id: null,
              onHand: { $sum: '$onHand' },
              value: { $sum: '$value' },
              low: { $sum: { $cond: [{ $eq: ['$status', 'low'] }, 1, 0] } },
              out: { $sum: { $cond: [{ $eq: ['$status', 'out'] }, 1, 0] } },
            },
          },
        ],
      },
    },
  ]);
  return {
    items: result?.items ?? [],
    total: result?.total[0]?.n ?? 0,
    summary: result?.summary[0] ?? { onHand: 0, value: 0, low: 0, out: 0 },
  };
}

export async function productLocations(productId: string, warehouse?: string) {
  if (!Types.ObjectId.isValid(productId)) throw ApiError.notFound('Product not found');
  const product = await Product.findOne({ _id: productId, deletedAt: null }).select('sku name uom perUnitCost').lean();
  if (!product) throw ApiError.notFound('Product not found');
  const quants = await StockQuant.find({ product: productId, ...(warehouse ? { warehouse } : {}) })
    .populate('location', 'name shortCode fullName type deletedAt')
    .populate('warehouse', 'name shortCode')
    .sort({ onHand: -1 })
    .lean();
  const rows = quants
    .filter((q) => q.onHand > 0 || q.reserved > 0)
    .map((q) => ({
      _id: String(q._id),
      warehouse: q.warehouse,
      location: q.location,
      onHand: q.onHand,
      reserved: q.reserved,
      freeToUse: Math.max(0, q.onHand - q.reserved),
    }));
  return { product, locations: rows };
}

/** Inline edit on the Stock page — always goes through a WH/ADJ adjustment + ledger row. */
export async function adjustStock(productId: string, body: Omit<AdjustmentInput, 'product'>, actor: Actor) {
  return applyAdjustment({ ...body, product: productId }, actor);
}
