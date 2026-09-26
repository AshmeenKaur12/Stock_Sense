import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Product } from '../models/Product';
import { ReorderRule } from '../models/ReorderRule';
import { StockQuant } from '../models/StockQuant';
import { Warehouse } from '../models/Warehouse';
import { emit, SocketEvents } from '../sockets';
import { notify } from './notification.service';

export interface StockKey {
  product: string;
  warehouse: string;
}

/** Sum of free-to-use (on hand − reserved) across a warehouse's internal locations. */
export async function warehouseFreeToUse(product: string, warehouse: string): Promise<number> {
  const [row] = await StockQuant.aggregate<{ free: number }>([
    { $match: { product: new Types.ObjectId(product), warehouse: new Types.ObjectId(warehouse) } },
    { $group: { _id: null, free: { $sum: { $subtract: ['$onHand', '$reserved'] } } } },
  ]);
  return Math.max(0, row?.free ?? 0);
}

/**
 * Re-evaluates reorder thresholds after stock changed. Free-to-use ≤ 0 raises
 * out_of_stock; ≤ minQty raises low_stock. Both are de-duplicated per product +
 * warehouse for 24 h and broadcast as `alert:lowstock`.
 * Runs after commit and never throws — alerts must not fail a stock operation.
 */
export async function checkStockAlerts(keys: StockKey[]): Promise<void> {
  const unique = [...new Map(keys.map((k) => [`${k.product}:${k.warehouse}`, k])).values()];
  for (const { product, warehouse } of unique) {
    try {
      const [rule, prod, wh] = await Promise.all([
        ReorderRule.findOne({ product, warehouse }).lean(),
        Product.findById(product).select('name sku uom isActive deletedAt').lean(),
        Warehouse.findById(warehouse).select('shortCode name').lean(),
      ]);
      // Thresholds come from reorder rules, so only products with a rule are tracked.
      if (!rule || !prod || !wh || !prod.isActive || prod.deletedAt) continue;

      const free = await warehouseFreeToUse(product, warehouse);
      const type = free <= 0 ? 'out_of_stock' : free <= rule.minQty ? 'low_stock' : null;
      if (!type) continue;

      const label = `[${prod.sku}] ${prod.name}`;
      const created = await notify({
        type,
        title: type === 'out_of_stock' ? `Out of stock · ${label}` : `Low stock · ${label}`,
        body:
          type === 'out_of_stock'
            ? `No free stock left in ${wh.shortCode}. Create a receipt to replenish.`
            : `Only ${free} ${prod.uom} free in ${wh.shortCode} (minimum ${rule.minQty}).`,
        link: `/stock?search=${encodeURIComponent(prod.sku)}`,
        dedupeKey: `${type}:${product}:${warehouse}`,
      });
      if (created) {
        emit(SocketEvents.LowStockAlert, {
          type,
          product: { _id: product, sku: prod.sku, name: prod.name },
          warehouse: { _id: warehouse, shortCode: wh.shortCode },
          free,
          minQty: rule.minQty,
        });
      }
    } catch (err) {
      logger.error({ err, product, warehouse }, 'stock alert check failed');
    }
  }
}
