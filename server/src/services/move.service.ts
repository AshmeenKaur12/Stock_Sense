import { Parser } from '@json2csv/plainjs';
import { Types, type FilterQuery } from 'mongoose';
import { Product } from '../models/Product';
import { StockMove, type MoveDirection, type StockMoveAttrs } from '../models/StockMove';
import { escapeRegex } from '../validators/common';
import { format } from '../utils/format';

export interface MoveFilters {
  search?: string;
  product?: string;
  location?: string;
  warehouse?: string;
  direction?: MoveDirection;
  from?: Date;
  to?: Date;
}

async function buildFilter(f: MoveFilters): Promise<FilterQuery<StockMoveAttrs>> {
  const q: FilterQuery<StockMoveAttrs> = {};
  if (f.product) q.product = new Types.ObjectId(f.product);
  if (f.warehouse) q.warehouse = new Types.ObjectId(f.warehouse);
  if (f.direction) q.direction = f.direction;
  if (f.location) {
    const loc = new Types.ObjectId(f.location);
    q.$or = [{ from: loc }, { to: loc }];
  }
  if (f.from || f.to) {
    q.date = {};
    if (f.from) q.date.$gte = f.from;
    if (f.to) {
      const end = new Date(f.to);
      end.setHours(23, 59, 59, 999);
      q.date.$lte = end;
    }
  }
  if (f.search) {
    const rx = new RegExp(escapeRegex(f.search), 'i');
    const products = await Product.find({ $or: [{ sku: rx }, { name: rx }] }).select('_id').lean();
    q.$and = [{ $or: [{ reference: rx }, { contactName: rx }, { product: { $in: products.map((p) => p._id) } }] }];
  }
  return q;
}

const POPULATE = [
  { path: 'product', select: 'sku name uom' },
  { path: 'from', select: 'fullName type' },
  { path: 'to', select: 'fullName type' },
  { path: 'user', select: 'name loginId avatarUrl' },
];

type MoveRow = StockMoveAttrs & {
  _id: Types.ObjectId;
  product: { _id: Types.ObjectId; sku: string; name: string; uom: string } | null;
  from: { fullName: string; type: string } | null;
  to: { fullName: string; type: string } | null;
  user: { name: string; loginId: string; avatarUrl?: string | null } | null;
};

function toRow(m: MoveRow) {
  return {
    _id: String(m._id),
    reference: m.reference,
    operation: String(m.operation),
    operationType: m.operationType,
    date: m.date,
    contact: m.contactName,
    product: m.product ? { _id: String(m.product._id), sku: m.product.sku, name: m.product.name, uom: m.product.uom } : null,
    from: m.from?.fullName ?? '',
    fromType: m.from?.type ?? '',
    to: m.to?.fullName ?? '',
    toType: m.to?.type ?? '',
    quantity: m.quantity,
    effect: m.effect,
    signedQty: m.quantity * m.effect,
    direction: m.direction,
    status: m.status,
    reason: m.reason,
    user: m.user ? { name: m.user.name || m.user.loginId, avatarUrl: m.user.avatarUrl ?? null } : null,
  };
}

export async function listMoves(f: MoveFilters & { page: number; limit: number }) {
  const filter = await buildFilter(f);
  const [items, total, totals] = await Promise.all([
    StockMove.find(filter).sort({ date: -1, _id: -1 }).skip((f.page - 1) * f.limit).limit(f.limit).populate(POPULATE).lean<MoveRow[]>(),
    StockMove.countDocuments(filter),
    StockMove.aggregate<{ _id: MoveDirection; qty: number; n: number }>([{ $match: filter }, { $group: { _id: '$direction', qty: { $sum: '$quantity' }, n: { $sum: 1 } } }]),
  ]);
  return { items: items.map(toRow), total, totals: Object.fromEntries(totals.map((t) => [t._id, { qty: t.qty, count: t.n }])) };
}

/** Kanban grouping for the ledger: columns by direction (every ledger row is Done). */
export async function movesKanban(f: MoveFilters) {
  const filter = await buildFilter(f);
  const directions: MoveDirection[] = ['in', 'out', 'internal', 'adjust'];
  return Promise.all(
    directions.map(async (direction) => {
      const q = { ...filter, direction };
      const [items, total] = await Promise.all([
        StockMove.find(q).sort({ date: -1 }).limit(50).populate(POPULATE).lean<MoveRow[]>(),
        StockMove.countDocuments(q),
      ]);
      return { direction, total, items: items.map(toRow) };
    }),
  );
}

export async function exportMovesCsv(f: MoveFilters): Promise<string> {
  const filter = await buildFilter(f);
  const moves = await StockMove.find(filter).sort({ date: -1 }).limit(50_000).populate(POPULATE).lean<MoveRow[]>();
  const parser = new Parser({
    fields: ['Reference', 'Date', 'Type', 'Contact', 'Product SKU', 'Product', 'From', 'To', 'Quantity', 'UoM', 'Status', 'Reason', 'User'],
  });
  return parser.parse(
    moves.map((m) => {
      const r = toRow(m);
      return {
        Reference: r.reference,
        Date: format.dateTime(r.date),
        Type: r.direction.toUpperCase(),
        Contact: r.contact,
        'Product SKU': r.product?.sku ?? '',
        Product: r.product?.name ?? '',
        From: r.from,
        To: r.to,
        Quantity: r.direction === 'internal' ? r.quantity : r.signedQty,
        UoM: r.product?.uom ?? '',
        Status: r.status,
        Reason: r.reason ?? '',
        User: r.user?.name ?? '',
      };
    }),
  );
}
