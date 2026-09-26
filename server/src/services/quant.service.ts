import type { ClientSession, Types } from 'mongoose';
import { StockQuant } from '../models/StockQuant';
import { ApiError } from '../utils/ApiError';

/**
 * Low-level, guarded StockQuant mutations. Every decrement is a single conditional
 * `findOneAndUpdate`, so a quant can never go negative even under concurrency —
 * if the guard fails, nothing is written and the caller's transaction aborts.
 */

type Id = Types.ObjectId | string;

export interface QuantKey {
  product: Id;
  location: Id;
  warehouse: Id;
}

export class InsufficientStockError extends ApiError {
  constructor(message: string, readonly productId: string, readonly available: number) {
    super(409, message, [{ field: 'quantity', message }]);
  }
}

export async function getQuant(product: Id, location: Id, session?: ClientSession) {
  return StockQuant.findOne({ product, location }).session(session ?? null).lean();
}

export async function freeToUse(product: Id, location: Id, session?: ClientSession): Promise<number> {
  const q = await getQuant(product, location, session);
  return q ? Math.max(0, q.onHand - q.reserved) : 0;
}

export async function increase({ product, location, warehouse }: QuantKey, qty: number, session: ClientSession) {
  if (qty <= 0) return;
  await StockQuant.findOneAndUpdate(
    { product, location },
    { $inc: { onHand: qty }, $setOnInsert: { warehouse, reserved: 0 } },
    { upsert: true, new: true, session },
  );
}

/**
 * Removes `qty` from on-hand. With `fromReserved`, the same amount is also released
 * from `reserved` (a validated delivery/transfer consumes its reservation).
 * Without it, only unreserved stock may be removed.
 */
export async function decrease({ product, location }: QuantKey, qty: number, session: ClientSession, opts: { fromReserved?: boolean; label?: string } = {}) {
  if (qty <= 0) return;
  const guard = opts.fromReserved
    ? { onHand: { $gte: qty }, reserved: { $gte: qty } }
    : { $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, qty] } };
  const inc = opts.fromReserved ? { onHand: -qty, reserved: -qty } : { onHand: -qty };

  const updated = await StockQuant.findOneAndUpdate({ product, location, ...guard }, { $inc: inc }, { new: true, session });
  if (!updated) {
    const available = await freeToUse(product, location, session);
    throw new InsufficientStockError(
      `Insufficient stock${opts.label ? ` for ${opts.label}` : ''}: ${available} available, ${qty} required`,
      String(product),
      available,
    );
  }
}

/** Reserves `qty` of free stock. Fails (409) if free-to-use is lower. */
export async function reserve({ product, location }: QuantKey, qty: number, session: ClientSession, label?: string) {
  if (qty <= 0) return;
  const updated = await StockQuant.findOneAndUpdate(
    { product, location, $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, qty] } },
    { $inc: { reserved: qty } },
    { new: true, session },
  );
  if (!updated) {
    const available = await freeToUse(product, location, session);
    throw new InsufficientStockError(`Only ${available} available${label ? ` for ${label}` : ''}`, String(product), available);
  }
}

export async function release({ product, location }: QuantKey, qty: number, session: ClientSession) {
  if (qty <= 0) return;
  // Clamp to what is actually reserved so a release can never push reserved below zero.
  const quant = await StockQuant.findOne({ product, location }).session(session);
  if (!quant) return;
  quant.reserved = Math.max(0, quant.reserved - qty);
  await quant.save({ session });
}

/** Sets on-hand to an absolute counted value (adjustments). Counted stock may not drop below reserved. */
export async function setOnHand({ product, location, warehouse }: QuantKey, counted: number, session: ClientSession) {
  const quant = await StockQuant.findOne({ product, location }).session(session);
  const reserved = quant?.reserved ?? 0;
  if (counted < reserved) {
    throw ApiError.conflict(
      `Counted quantity (${counted}) is below the ${reserved} units reserved for open deliveries/transfers. Cancel or validate them first.`,
    );
  }
  if (quant) {
    quant.onHand = counted;
    await quant.save({ session });
  } else {
    await StockQuant.create([{ product, location, warehouse, onHand: counted, reserved: 0 }], { session });
  }
}
