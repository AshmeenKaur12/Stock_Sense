import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { logger } from '../config/logger';
import { Contact } from '../models/Contact';
import { nextSequence } from '../models/Counter';
import { Location } from '../models/Location';
import {
  OPEN_STATUSES,
  OPERATION_CODES,
  Operation,
  type AdjustmentReason,
  type OperationAttrs,
  type OperationDoc,
  type OperationStatus,
  type OperationType,
} from '../models/Operation';
import { Product } from '../models/Product';
import { StockMove, type MoveDirection } from '../models/StockMove';
import { Warehouse } from '../models/Warehouse';
import { emit, SocketEvents } from '../sockets';
import { ApiError } from '../utils/ApiError';
import { runInTransaction, type TxContext } from '../utils/transaction';
import { escapeRegex } from '../validators/common';
import { checkStockAlerts, type StockKey } from './alert.service';
import { notify } from './notification.service';
import * as quant from './quant.service';
import { getDefaultStockLocation, getVirtualLocation } from './warehouse.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface Actor {
  id: string;
  name: string;
}

export interface LineInput {
  product: string;
  quantity: number;
}

export interface OperationInput {
  type: Exclude<OperationType, 'adjustment'>;
  warehouse?: string;
  contact?: string | null;
  sourceLocation?: string;
  destinationLocation?: string;
  scheduleDate?: Date;
  responsible?: string;
  deliveryAddress?: string;
  operationType?: 'delivery_order' | 'return' | 'dropship';
  notes?: string;
  lines?: LineInput[];
}

export type OperationPatch = Partial<Omit<OperationInput, 'type'>>;

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Late = scheduled before today and still open. */
export const isLate = (op: Pick<OperationAttrs, 'scheduleDate' | 'status'>) =>
  OPEN_STATUSES.includes(op.status) && new Date(op.scheduleDate).getTime() < startOfToday().getTime();

const TYPE_LABEL: Record<OperationType, string> = { receipt: 'receipt', delivery: 'delivery', internal: 'transfer', adjustment: 'adjustment' };

export const ROUTE_SEGMENT: Record<OperationType, string> = {
  receipt: 'receipts',
  delivery: 'deliveries',
  internal: 'transfers',
  adjustment: 'adjustments',
};

function assertStatus(op: OperationDoc, allowed: OperationStatus[], action: string) {
  if (op.status === 'done') throw ApiError.conflict('Done operations are locked and cannot be changed');
  if (!allowed.includes(op.status)) {
    throw ApiError.conflict(`Cannot ${action} a ${TYPE_LABEL[op.type]} in ${op.status} state`);
  }
}

function assertType(op: OperationDoc, types: OperationType[], action: string) {
  if (!types.includes(op.type)) throw ApiError.conflict(`${action} is not available for ${TYPE_LABEL[op.type]}s`);
}

function assertHasLines(op: OperationDoc) {
  if (!op.lines.length || op.lines.every((l) => l.quantity <= 0)) {
    throw ApiError.unprocessable('Add at least one product with a quantity', [{ field: 'lines', message: 'At least one product is required' }]);
  }
}

async function loadForUpdate(id: string, session: ClientSession) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Operation not found');
  const op = await Operation.findById(id).session(session);
  if (!op) throw ApiError.notFound('Operation not found');
  return op;
}

async function productLabels(ids: Types.ObjectId[], session?: ClientSession) {
  const products = await Product.find({ _id: { $in: ids } }).select('sku name').session(session ?? null).lean();
  return new Map(products.map((p) => [String(p._id), `[${p.sku}] ${p.name}`]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation of references (locations, contacts, products)
// ─────────────────────────────────────────────────────────────────────────────

async function requireLocation(id: string | undefined, field: string, session?: ClientSession) {
  if (!id || !Types.ObjectId.isValid(id)) throw ApiError.unprocessable(`${field} is required`, [{ field, message: 'Required' }]);
  const loc = await Location.findOne({ _id: id, deletedAt: null }).session(session ?? null);
  if (!loc) throw ApiError.unprocessable('Location not found', [{ field, message: 'Location not found' }]);
  if (loc.type !== 'internal') throw ApiError.unprocessable('Choose a warehouse stock location', [{ field, message: 'Must be an internal location' }]);
  return loc;
}

async function resolveLocations(type: OperationInput['type'], input: OperationPatch, session?: ClientSession) {
  const fallbackStock = async () => {
    if (!input.warehouse) throw ApiError.unprocessable('Warehouse is required', [{ field: 'warehouse', message: 'Required' }]);
    const wh = await Warehouse.findOne({ _id: input.warehouse, deletedAt: null }).session(session ?? null);
    if (!wh) throw ApiError.unprocessable('Warehouse not found', [{ field: 'warehouse', message: 'Not found' }]);
    return getDefaultStockLocation(wh._id, session);
  };

  if (type === 'receipt') {
    const dest = input.destinationLocation ? await requireLocation(input.destinationLocation, 'destinationLocation', session) : await fallbackStock();
    const vendor = await getVirtualLocation(dest.warehouse, 'vendor', session);
    return { warehouse: dest.warehouse, source: vendor, destination: dest };
  }
  if (type === 'delivery') {
    const src = input.sourceLocation ? await requireLocation(input.sourceLocation, 'sourceLocation', session) : await fallbackStock();
    const customer = await getVirtualLocation(src.warehouse, 'customer', session);
    return { warehouse: src.warehouse, source: src, destination: customer };
  }
  const src = await requireLocation(input.sourceLocation, 'sourceLocation', session);
  const dest = await requireLocation(input.destinationLocation, 'destinationLocation', session);
  if (String(src._id) === String(dest._id)) {
    throw ApiError.unprocessable('From and To locations must be different', [{ field: 'destinationLocation', message: 'Must differ from the source location' }]);
  }
  return { warehouse: src.warehouse, source: src, destination: dest };
}

async function validateContact(type: OperationInput['type'], contactId: string | null | undefined) {
  if (!contactId) return null;
  const contact = await Contact.findOne({ _id: contactId, deletedAt: null }).lean();
  if (!contact) throw ApiError.unprocessable('Contact not found', [{ field: 'contact', message: 'Not found' }]);
  const expected = type === 'receipt' ? 'vendor' : type === 'delivery' ? 'customer' : null;
  if (expected && contact.type !== expected) {
    throw ApiError.unprocessable(`Choose a ${expected} for this ${TYPE_LABEL[type]}`, [{ field: 'contact', message: `Must be a ${expected}` }]);
  }
  return contact;
}

async function validateLines(lines: LineInput[]) {
  const seen = new Set<string>();
  for (const [i, line] of lines.entries()) {
    if (seen.has(line.product)) throw ApiError.unprocessable('Each product can appear only once', [{ field: `lines.${i}.product`, message: 'Duplicate product' }]);
    seen.add(line.product);
  }
  const ids = [...seen];
  const products = await Product.find({ _id: { $in: ids }, deletedAt: null, isActive: true }).select('_id').lean();
  if (products.length !== ids.length) {
    const found = new Set(products.map((p) => String(p._id)));
    const idx = lines.findIndex((l) => !found.has(l.product));
    throw ApiError.unprocessable('Product not found or inactive', [{ field: `lines.${idx}.product`, message: 'Not found or inactive' }]);
  }
  return lines.map((l) => ({ product: new Types.ObjectId(l.product), quantity: l.quantity }));
}

async function generateReference(warehouseId: Types.ObjectId | string, type: OperationType) {
  const wh = await Warehouse.findById(warehouseId).select('shortCode').lean();
  if (!wh) throw ApiError.unprocessable('Warehouse not found');
  const code = OPERATION_CODES[type];
  const seq = await nextSequence(`${String(warehouseId)}:${code}`);
  return `${wh.shortCode}/${code}/${String(seq).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Side effects (after commit)
// ─────────────────────────────────────────────────────────────────────────────

interface Effects {
  stockKeys?: StockKey[];
  /** Internal locations that gained free stock — waiting deliveries there are re-checked. */
  replenished?: string[];
}

function scheduleEffects(ctx: TxContext, op: OperationDoc, effects: Effects = {}) {
  ctx.afterCommit(() => {
    emit(SocketEvents.OperationUpdated, { _id: String(op._id), reference: op.reference, type: op.type, status: op.status });
    if (effects.stockKeys?.length) {
      emit(SocketEvents.StockUpdated, {
        products: [...new Set(effects.stockKeys.map((k) => k.product))],
        warehouses: [...new Set(effects.stockKeys.map((k) => k.warehouse))],
      });
    }
    emit(SocketEvents.DashboardRefresh, {});
    // Fire-and-forget: alerts and re-checks run in their own transactions and never fail the request.
    void (async () => {
      if (effects.stockKeys?.length) await checkStockAlerts(effects.stockKeys);
      for (const loc of new Set(effects.replenished ?? [])) await recheckWaitingDeliveries(loc);
    })().catch((err) => logger.error({ err }, 'post-commit effects failed'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / update
// ─────────────────────────────────────────────────────────────────────────────

export async function createOperation(input: OperationInput, actor: Actor) {
  const { warehouse, source, destination } = await resolveLocations(input.type, input);
  const contact = await validateContact(input.type, input.contact);
  const lines = await validateLines(input.lines ?? []);
  const reference = await generateReference(warehouse, input.type);

  const op = await Operation.create({
    reference,
    type: input.type,
    status: 'draft',
    warehouse,
    contact: contact?._id ?? null,
    sourceLocation: source._id,
    destinationLocation: destination._id,
    deliveryAddress: input.type === 'delivery' ? (input.deliveryAddress ?? contact?.address ?? '') : '',
    operationType: input.operationType ?? 'delivery_order',
    scheduleDate: input.scheduleDate ?? new Date(),
    responsible: input.responsible ?? actor.id,
    notes: input.notes ?? '',
    lines,
    createdBy: actor.id,
  });

  emit(SocketEvents.OperationUpdated, { _id: String(op._id), reference: op.reference, type: op.type, status: op.status });
  emit(SocketEvents.DashboardRefresh, {});
  return getOperation(String(op._id));
}

const HEADER_FIELDS = ['scheduleDate', 'responsible', 'deliveryAddress', 'operationType', 'notes', 'contact'] as const;

/**
 * Draft (and Waiting deliveries) are fully editable. Ready operations may only
 * change header fields — their lines are reserved. Done/Canceled are locked.
 */
export async function updateOperation(id: string, patch: OperationPatch) {
  const op = await Operation.findById(id);
  if (!op) throw ApiError.notFound('Operation not found');
  if (op.status === 'done') throw ApiError.conflict('Done operations are locked and cannot be changed');
  if (op.status === 'canceled') throw ApiError.conflict('Canceled operations cannot be changed');
  if (op.type === 'adjustment') throw ApiError.conflict('Adjustments are applied immediately and cannot be edited');

  const structural = patch.lines !== undefined || patch.sourceLocation !== undefined || patch.destinationLocation !== undefined || patch.warehouse !== undefined;
  if (structural && op.status === 'ready') {
    throw ApiError.conflict('Products and locations are locked once an operation is Ready. Cancel it to make changes.');
  }

  if (patch.contact !== undefined) {
    const contact = await validateContact(op.type as OperationInput['type'], patch.contact);
    op.contact = contact?._id ?? null;
  }
  for (const f of HEADER_FIELDS) {
    if (f === 'contact' || patch[f] === undefined) continue;
    (op as unknown as Record<string, unknown>)[f] = patch[f];
  }

  if (structural) {
    const merged: OperationPatch = {
      warehouse: patch.warehouse ?? String(op.warehouse),
      sourceLocation: patch.sourceLocation ?? String(op.sourceLocation),
      destinationLocation: patch.destinationLocation ?? String(op.destinationLocation),
    };
    // Receipts/deliveries derive their virtual side from the chosen internal location.
    if (op.type === 'receipt') delete merged.sourceLocation;
    if (op.type === 'delivery') delete merged.destinationLocation;
    if (patch.warehouse && !patch.sourceLocation && op.type === 'delivery') delete merged.sourceLocation;
    if (patch.warehouse && !patch.destinationLocation && op.type === 'receipt') delete merged.destinationLocation;

    const { warehouse, source, destination } = await resolveLocations(op.type as OperationInput['type'], merged);
    if (String(warehouse) !== String(op.warehouse)) {
      throw ApiError.unprocessable('The warehouse of an existing operation cannot change (its reference depends on it)', [
        { field: 'warehouse', message: 'Cannot change warehouse' },
      ]);
    }
    op.sourceLocation = source._id;
    op.destinationLocation = destination._id;

    if (patch.lines !== undefined) {
      op.set('lines', await validateLines(patch.lines));
    }
    // A waiting delivery whose lines changed must be re-checked.
    if (op.status === 'waiting') {
      op.status = 'draft';
      for (const l of op.lines) {
        l.isShort = false;
        l.availableQty = null;
      }
    }
  }

  await op.save();
  emit(SocketEvents.OperationUpdated, { _id: String(op._id), reference: op.reference, type: op.type, status: op.status });
  return getOperation(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow actions
// ─────────────────────────────────────────────────────────────────────────────

/** Receipt / Internal: Draft → Ready. Transfers reserve their source stock here. */
export async function markTodo(id: string) {
  await runInTransaction(async (ctx) => {
    const op = await loadForUpdate(id, ctx.session);
    assertType(op, ['receipt', 'internal'], 'To Do');
    assertStatus(op, ['draft'], 'mark To Do');
    assertHasLines(op);

    if (op.type === 'internal') {
      const labels = await productLabels(op.lines.map((l) => l.product), ctx.session);
      for (const line of op.lines) {
        await quant.reserve(
          { product: line.product, location: op.sourceLocation, warehouse: op.warehouse },
          line.quantity,
          ctx.session,
          labels.get(String(line.product)),
        );
        line.reservedQty = line.quantity;
      }
    }
    op.status = 'ready';
    await op.save({ session: ctx.session });
    scheduleEffects(ctx, op);
  });
  return getOperation(id);
}

/**
 * Delivery: reserves every line if all are available (→ Ready). Otherwise flags the
 * short lines, reserves nothing and moves to Waiting (with a notification).
 */
export async function checkAvailability(id: string) {
  const result = await runInTransaction(async (ctx) => {
    const op = await loadForUpdate(id, ctx.session);
    assertType(op, ['delivery'], 'Check Availability');
    assertStatus(op, ['draft', 'waiting'], 'check availability for');
    assertHasLines(op);

    const available = await Promise.all(op.lines.map((l) => quant.freeToUse(l.product, op.sourceLocation, ctx.session)));
    const short = op.lines.filter((l, i) => available[i]! < l.quantity);

    op.lines.forEach((l, i) => {
      l.availableQty = available[i]!;
      l.isShort = available[i]! < l.quantity;
    });

    if (short.length === 0) {
      for (const line of op.lines) {
        await quant.reserve({ product: line.product, location: op.sourceLocation, warehouse: op.warehouse }, line.quantity, ctx.session);
        line.reservedQty = line.quantity;
      }
      op.status = 'ready';
    } else {
      op.status = 'waiting';
    }
    await op.save({ session: ctx.session });
    scheduleEffects(ctx, op);

    if (op.status === 'waiting') {
      const labels = await productLabels(short.map((l) => l.product), ctx.session);
      const detail = short
        .map((l) => `${labels.get(String(l.product)) ?? 'Product'}: ${l.availableQty ?? 0} of ${l.quantity} available`)
        .join('; ');
      ctx.afterCommit(() =>
        notify({
          type: 'waiting',
          title: `${op.reference} is waiting for stock`,
          body: detail,
          link: `/operations/deliveries/${String(op._id)}`,
          dedupeKey: `waiting:${String(op._id)}`,
        }).then(() => undefined),
      );
    }
    return op.status;
  });
  const operation = await getOperation(id);
  return { operation, status: result };
}

/** Delivery: set/unset Picked. Unpicking also clears Packed (pack requires pick). */
export async function setPicked(id: string, value: boolean) {
  await runInTransaction(async (ctx) => {
    const op = await loadForUpdate(id, ctx.session);
    assertType(op, ['delivery'], 'Pick');
    assertStatus(op, ['ready'], 'pick');
    op.picked = value;
    if (!value) op.packed = false;
    await op.save({ session: ctx.session });
    scheduleEffects(ctx, op);
  });
  return getOperation(id);
}

export async function setPacked(id: string, value: boolean) {
  await runInTransaction(async (ctx) => {
    const op = await loadForUpdate(id, ctx.session);
    assertType(op, ['delivery'], 'Pack');
    assertStatus(op, ['ready'], 'pack');
    if (value && !op.picked) throw ApiError.conflict('Pick the items before packing');
    op.packed = value;
    await op.save({ session: ctx.session });
    scheduleEffects(ctx, op);
  });
  return getOperation(id);
}

/**
 * Ready → Done. One transaction: move stock (guarded, never negative), write one
 * ledger row per line, stamp done + doneDate. Alerts and waiting re-checks run after commit.
 */
export async function validateOperation(id: string, actor: Actor) {
  await runInTransaction(async (ctx) => {
    const { session } = ctx;
    const op = await loadForUpdate(id, session);
    if (op.type === 'adjustment') throw ApiError.conflict('Adjustments are applied immediately');
    assertStatus(op, ['ready'], 'validate');
    assertHasLines(op);
    if (op.type === 'delivery' && (!op.picked || !op.packed)) {
      throw ApiError.conflict('Pick and pack the delivery before validating');
    }

    const [contact, labels] = await Promise.all([
      op.contact ? Contact.findById(op.contact).select('name').session(session).lean() : null,
      productLabels(op.lines.map((l) => l.product), session),
    ]);
    const destLoc = await Location.findById(op.destinationLocation).select('warehouse').session(session).lean();
    const destWarehouse = destLoc?.warehouse ?? op.warehouse;

    const now = new Date();
    const moves: Record<string, unknown>[] = [];
    const stockKeys: StockKey[] = [];
    const replenished: string[] = [];

    for (const line of op.lines) {
      const label = labels.get(String(line.product));
      const src = { product: line.product, location: op.sourceLocation, warehouse: op.warehouse };
      const dst = { product: line.product, location: op.destinationLocation, warehouse: destWarehouse };
      let direction: MoveDirection;
      let effect: 1 | -1 | 0;

      if (op.type === 'receipt') {
        await quant.increase(dst, line.quantity, session);
        direction = 'in';
        effect = 1;
        stockKeys.push({ product: String(line.product), warehouse: String(destWarehouse) });
        replenished.push(String(op.destinationLocation));
      } else if (op.type === 'delivery') {
        await quant.decrease(src, line.quantity, session, { fromReserved: true, label });
        direction = 'out';
        effect = -1;
        stockKeys.push({ product: String(line.product), warehouse: String(op.warehouse) });
      } else {
        await quant.decrease(src, line.quantity, session, { fromReserved: true, label });
        await quant.increase(dst, line.quantity, session);
        direction = 'internal';
        effect = 0;
        stockKeys.push({ product: String(line.product), warehouse: String(op.warehouse) });
        if (String(destWarehouse) !== String(op.warehouse)) stockKeys.push({ product: String(line.product), warehouse: String(destWarehouse) });
        replenished.push(String(op.destinationLocation));
      }

      line.doneQty = line.quantity;
      line.reservedQty = 0;
      line.isShort = false;
      moves.push({
        reference: op.reference,
        operation: op._id,
        operationType: op.type,
        product: line.product,
        from: op.sourceLocation,
        to: op.destinationLocation,
        warehouse: op.warehouse,
        quantity: line.quantity,
        effect,
        direction,
        contact: op.contact,
        contactName: contact?.name ?? '',
        user: actor.id,
        date: now,
        status: 'done',
      });
    }

    await StockMove.insertMany(moves, { session });
    op.status = 'done';
    op.doneDate = now;
    await op.save({ session });
    scheduleEffects(ctx, op, { stockKeys, replenished });
  });
  return getOperation(id);
}

/** Cancel any open operation; reservations (Ready delivery/transfer) are released. */
export async function cancelOperation(id: string) {
  await runInTransaction(async (ctx) => {
    const op = await loadForUpdate(id, ctx.session);
    if (op.status === 'canceled') throw ApiError.conflict('Operation is already canceled');
    assertStatus(op, ['draft', 'waiting', 'ready'], 'cancel');

    const stockKeys: StockKey[] = [];
    for (const line of op.lines) {
      if (line.reservedQty > 0) {
        await quant.release({ product: line.product, location: op.sourceLocation, warehouse: op.warehouse }, line.reservedQty, ctx.session);
        stockKeys.push({ product: String(line.product), warehouse: String(op.warehouse) });
        line.reservedQty = 0;
      }
    }
    const released = stockKeys.length > 0;
    op.status = 'canceled';
    await op.save({ session: ctx.session });
    scheduleEffects(ctx, op, released ? { stockKeys, replenished: [String(op.sourceLocation)] } : {});
  });
  return getOperation(id);
}

/**
 * Kanban drag target → the equivalent workflow action (same rules as the buttons).
 * Returns the operation; for deliveries dropped on Ready the result may be Waiting.
 */
export async function moveToStatus(id: string, target: OperationStatus, actor: Actor) {
  const op = await Operation.findById(id).select('type status').lean();
  if (!op) throw ApiError.notFound('Operation not found');
  if (op.status === target) return getOperation(id);

  switch (target) {
    case 'ready':
      if (op.type === 'delivery') return (await checkAvailability(id)).operation;
      return markTodo(id);
    case 'done':
      return validateOperation(id, actor);
    case 'canceled':
      return cancelOperation(id);
    case 'waiting':
      throw ApiError.conflict('Waiting is set automatically when Check Availability finds a shortage');
    case 'draft':
    default:
      throw ApiError.conflict(`Cannot move a ${TYPE_LABEL[op.type]} back to ${target}`);
  }
}

/**
 * Stock arrived at `locationId`: re-check Waiting deliveries sourcing from it,
 * oldest first. Each check is its own transaction; any that can now be fully
 * reserved flip to Ready.
 */
export async function recheckWaitingDeliveries(locationId: string): Promise<string[]> {
  const waiting = await Operation.find({ type: 'delivery', status: 'waiting', sourceLocation: locationId })
    .sort({ scheduleDate: 1, createdAt: 1 })
    .select('_id')
    .lean();
  const readied: string[] = [];
  for (const { _id } of waiting) {
    try {
      const { status } = await checkAvailability(String(_id));
      if (status === 'ready') readied.push(String(_id));
    } catch (err) {
      logger.warn({ err, operation: String(_id) }, 'waiting delivery re-check failed');
    }
  }
  return readied;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adjustments (applied instantly)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdjustmentInput {
  product: string;
  location: string;
  countedQty: number;
  reason: AdjustmentReason;
  notes?: string;
}

/**
 * Posts the difference between counted and recorded stock to/from the
 * warehouse's Virtual/Adjustment location as a Done WH/ADJ/xxxx operation.
 */
export async function applyAdjustment(input: AdjustmentInput, actor: Actor, session?: ClientSession) {
  const location = await requireLocation(input.location, 'location', session);
  const product = await Product.findOne({ _id: input.product, deletedAt: null }).session(session ?? null).lean();
  if (!product) throw ApiError.unprocessable('Product not found', [{ field: 'product', message: 'Not found' }]);
  if (!Number.isFinite(input.countedQty) || input.countedQty < 0) {
    throw ApiError.unprocessable('Counted quantity cannot be negative', [{ field: 'countedQty', message: 'Must be ≥ 0' }]);
  }
  const reference = await generateReference(location.warehouse, 'adjustment');

  const work = async (ctx: TxContext) => {
    const { session: s } = ctx;
    const q = await quant.getQuant(product._id, location._id, s);
    const recorded = q?.onHand ?? 0;
    const diff = input.countedQty - recorded;
    if (diff === 0) throw ApiError.unprocessable('Counted quantity equals the recorded quantity — nothing to adjust', [{ field: 'countedQty', message: 'No difference' }]);

    const virtual = await getVirtualLocation(location.warehouse, 'adjustment', s);
    await quant.setOnHand({ product: product._id, location: location._id, warehouse: location.warehouse }, input.countedQty, s);

    const now = new Date();
    const [from, to] = diff > 0 ? [virtual._id, location._id] : [location._id, virtual._id];
    const [op] = await Operation.create(
      [
        {
          reference,
          type: 'adjustment',
          status: 'done',
          warehouse: location.warehouse,
          sourceLocation: from,
          destinationLocation: to,
          scheduleDate: now,
          doneDate: now,
          responsible: actor.id,
          reason: input.reason,
          notes: input.notes ?? '',
          lines: [{ product: product._id, quantity: Math.abs(diff), doneQty: Math.abs(diff), recordedQty: recorded, countedQty: input.countedQty }],
          createdBy: actor.id,
        },
      ],
      { session: s },
    );
    await StockMove.create(
      [
        {
          reference,
          operation: op!._id,
          operationType: 'adjustment',
          product: product._id,
          from,
          to,
          warehouse: location.warehouse,
          quantity: Math.abs(diff),
          effect: diff > 0 ? 1 : -1,
          direction: 'adjust',
          user: actor.id,
          date: now,
          status: 'done',
          reason: input.reason,
        },
      ],
      { session: s },
    );
    scheduleEffects(ctx, op!, {
      stockKeys: [{ product: String(product._id), warehouse: String(location.warehouse) }],
      replenished: diff > 0 ? [String(location._id)] : [],
    });
    return { id: String(op!._id), recorded, counted: input.countedQty, difference: diff };
  };

  const result = session
    ? await work({ session, afterCommit: () => undefined })
    : await runInTransaction(work);
  return { ...result, operation: session ? null : await getOperation(result.id) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

const DETAIL_POPULATE = [
  { path: 'warehouse', select: 'name shortCode' },
  { path: 'contact', select: 'name type email phone address' },
  { path: 'sourceLocation', select: 'name shortCode fullName type warehouse' },
  { path: 'destinationLocation', select: 'name shortCode fullName type warehouse' },
  { path: 'responsible', select: 'name loginId avatarUrl' },
  { path: 'lines.product', select: 'name sku uom perUnitCost salePrice' },
];

export async function getOperation(id: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Operation not found');
  const op = await Operation.findById(id).populate(DETAIL_POPULATE).lean();
  if (!op) throw ApiError.notFound('Operation not found');

  // Live availability hint per line (own reservation counts as available).
  const sourceIsInternal = (op.sourceLocation as unknown as { type?: string })?.type === 'internal';
  const sourceId = (op.sourceLocation as unknown as { _id: Types.ObjectId })._id;
  const lines = await Promise.all(
    op.lines.map(async (l) => {
      const productId = (l.product as unknown as { _id: Types.ObjectId })?._id;
      const free = sourceIsInternal && productId && OPEN_STATUSES.includes(op.status) ? await quant.freeToUse(productId, sourceId) : null;
      return { ...l, available: free === null ? null : free + (l.reservedQty ?? 0) };
    }),
  );

  return { ...op, lines, isLate: isLate(op) };
}

export interface ListFilters {
  type?: OperationType;
  status?: OperationStatus;
  warehouse?: string;
  location?: string;
  category?: string;
  search?: string;
  late?: boolean;
  upcoming?: boolean;
  page: number;
  limit: number;
  sort?: string;
}

export async function buildOperationFilter(f: Omit<ListFilters, 'page' | 'limit' | 'sort'>, withStatus = true): Promise<FilterQuery<OperationAttrs>> {
  const q: FilterQuery<OperationAttrs> = {};
  if (f.type) q.type = f.type;
  if (withStatus && f.status) q.status = f.status;
  if (f.warehouse) q.warehouse = new Types.ObjectId(f.warehouse);
  if (f.location) {
    const loc = new Types.ObjectId(f.location);
    q.$or = [{ sourceLocation: loc }, { destinationLocation: loc }];
  }
  if (f.category) {
    const products = await Product.find({ category: f.category }).select('_id').lean();
    q['lines.product'] = { $in: products.map((p) => p._id) };
  }
  if (f.late) {
    q.scheduleDate = { $lt: startOfToday() };
    if (!withStatus || !f.status) q.status = { $in: OPEN_STATUSES };
  }
  if (f.upcoming) {
    q.scheduleDate = { $gt: endOfToday() };
    if (!withStatus || !f.status) q.status = { $in: OPEN_STATUSES };
  }
  if (f.search) {
    const rx = new RegExp(escapeRegex(f.search), 'i');
    const contacts = await Contact.find({ name: rx }).select('_id').lean();
    const or = [{ reference: rx }, { contact: { $in: contacts.map((c) => c._id) } }];
    q.$and = [...(q.$and ?? []), { $or: or }];
  }
  return q;
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  scheduleDate: { scheduleDate: 1, _id: 1 },
  '-scheduleDate': { scheduleDate: -1, _id: -1 },
  reference: { reference: 1 },
  '-reference': { reference: -1 },
  createdAt: { createdAt: 1 },
  '-createdAt': { createdAt: -1 },
};

type ListRow = Omit<OperationAttrs, 'contact' | 'sourceLocation' | 'destinationLocation' | 'lines'> & {
  _id: Types.ObjectId;
  contact?: { name: string } | null;
  sourceLocation?: { fullName: string; type: string } | null;
  destinationLocation?: { fullName: string; type: string } | null;
  lines: (Omit<OperationAttrs['lines'][number], 'product'> & { product?: { sku: string; name: string } | null })[];
};

function toRow(op: ListRow) {
  return {
    _id: String(op._id),
    reference: op.reference,
    type: op.type,
    status: op.status,
    from: op.sourceLocation?.fullName ?? '',
    fromType: op.sourceLocation?.type ?? '',
    to: op.destinationLocation?.fullName ?? '',
    toType: op.destinationLocation?.type ?? '',
    contact: op.contact?.name ?? '',
    scheduleDate: op.scheduleDate,
    doneDate: op.doneDate,
    isLate: isLate(op),
    picked: op.picked,
    packed: op.packed,
    reason: op.reason,
    lineCount: op.lines.length,
    totalQty: op.lines.reduce((s, l) => s + l.quantity, 0),
    hasShortage: op.lines.some((l) => l.isShort),
    products: op.lines.slice(0, 3).map((l) => (l.product ? `[${l.product.sku}] ${l.product.name}` : '')),
  };
}

const LIST_POPULATE = [
  { path: 'contact', select: 'name' },
  { path: 'sourceLocation', select: 'fullName type' },
  { path: 'destinationLocation', select: 'fullName type' },
  { path: 'lines.product', select: 'sku name' },
];

export async function listOperations(f: ListFilters) {
  const filter = await buildOperationFilter(f);
  const countFilter = await buildOperationFilter(f, false);
  const [items, total, counts] = await Promise.all([
    Operation.find(filter)
      .sort(SORTS[f.sort ?? ''] ?? { scheduleDate: -1, _id: -1 })
      .skip((f.page - 1) * f.limit)
      .limit(f.limit)
      .populate(LIST_POPULATE)
      .lean<ListRow[]>(),
    Operation.countDocuments(filter),
    Operation.aggregate<{ _id: OperationStatus; n: number }>([{ $match: countFilter }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const statusCounts = Object.fromEntries(counts.map((c) => [c._id, c.n])) as Partial<Record<OperationStatus, number>>;
  return { items: items.map(toRow), total, statusCounts };
}

export async function kanban(f: Omit<ListFilters, 'page' | 'limit' | 'status'>) {
  const base = await buildOperationFilter(f, false);
  const statuses: OperationStatus[] = f.type === 'receipt' || f.type === 'internal' ? ['draft', 'ready', 'done', 'canceled'] : f.type === 'adjustment' ? ['done'] : ['draft', 'waiting', 'ready', 'done', 'canceled'];
  const columns = await Promise.all(
    statuses.map(async (status) => {
      const filter = { ...base, status };
      const closed = status === 'done' || status === 'canceled';
      const [items, total] = await Promise.all([
        Operation.find(filter)
          .sort(closed ? { doneDate: -1, updatedAt: -1 } : { scheduleDate: 1 })
          .limit(closed ? 20 : 100)
          .populate(LIST_POPULATE)
          .lean<ListRow[]>(),
        Operation.countDocuments(filter),
      ]);
      return { status, total, items: items.map(toRow) };
    }),
  );
  return columns;
}
