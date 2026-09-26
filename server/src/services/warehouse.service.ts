import type { ClientSession, Types } from 'mongoose';
import { Location, type LocationType } from '../models/Location';
import { Operation, OPEN_STATUSES } from '../models/Operation';
import { StockQuant } from '../models/StockQuant';
import { Warehouse } from '../models/Warehouse';
import { ApiError } from '../utils/ApiError';
import { runInTransaction } from '../utils/transaction';

type Id = Types.ObjectId | string;

/** Virtual counterparts created with every warehouse. */
const VIRTUAL_LOCATIONS: { name: string; shortCode: string; type: LocationType; fullName: string }[] = [
  { name: 'Vendor', shortCode: 'Vendor', type: 'vendor', fullName: 'Partners/Vendor' },
  { name: 'Customer', shortCode: 'Customer', type: 'customer', fullName: 'Partners/Customer' },
  { name: 'Adjustment', shortCode: 'Adjustment', type: 'adjustment', fullName: 'Virtual/Adjustment' },
];

export async function createWarehouse(input: { name: string; shortCode: string; address?: string }, session?: ClientSession) {
  const work = async (s: ClientSession) => {
    const shortCode = input.shortCode.toUpperCase();
    if (await Warehouse.exists({ shortCode }).session(s)) {
      throw ApiError.conflict(`Short code ${shortCode} is already used`, [{ field: 'shortCode', message: 'Already exists' }]);
    }
    const [wh] = await Warehouse.create([{ name: input.name, shortCode, address: input.address ?? '' }], { session: s });
    await Location.create(
      [
        ...VIRTUAL_LOCATIONS.map((v) => ({ ...v, warehouse: wh._id })),
        { name: 'Stock1', shortCode: 'Stock1', type: 'internal', warehouse: wh._id, fullName: `${shortCode}/Stock1` },
      ],
      { session: s, ordered: true },
    );
    return wh;
  };
  return session ? work(session) : runInTransaction(({ session: s }) => work(s));
}

export async function updateWarehouse(id: string, input: { name?: string; shortCode?: string; address?: string }) {
  return runInTransaction(async ({ session }) => {
    const wh = await Warehouse.findOne({ _id: id, deletedAt: null }).session(session);
    if (!wh) throw ApiError.notFound('Warehouse not found');

    if (input.shortCode && input.shortCode.toUpperCase() !== wh.shortCode) {
      const code = input.shortCode.toUpperCase();
      if (await Warehouse.exists({ shortCode: code, _id: { $ne: wh._id } }).session(session)) {
        throw ApiError.conflict(`Short code ${code} is already used`, [{ field: 'shortCode', message: 'Already exists' }]);
      }
      // Existing references keep their original prefix; new ones use the new code.
      const internals = await Location.find({ warehouse: wh._id, type: 'internal' }).session(session);
      for (const loc of internals) {
        loc.fullName = `${code}/${loc.shortCode}`;
        await loc.save({ session });
      }
      wh.shortCode = code;
    }
    if (input.name !== undefined) wh.name = input.name;
    if (input.address !== undefined) wh.address = input.address;
    await wh.save({ session });
    return wh;
  });
}

export async function deleteWarehouse(id: string) {
  const wh = await Warehouse.findOne({ _id: id, deletedAt: null });
  if (!wh) throw ApiError.notFound('Warehouse not found');
  const [stocked, open] = await Promise.all([
    StockQuant.exists({ warehouse: wh._id, onHand: { $gt: 0 } }),
    Operation.exists({ warehouse: wh._id, status: { $in: OPEN_STATUSES } }),
  ]);
  if (stocked) throw ApiError.conflict('This warehouse still holds stock. Move or adjust it out first.');
  if (open) throw ApiError.conflict('This warehouse has open operations. Validate or cancel them first.');
  const now = new Date();
  wh.deletedAt = now;
  await wh.save();
  await Location.updateMany({ warehouse: wh._id, deletedAt: null }, { $set: { deletedAt: now } });
}

export async function getVirtualLocation(warehouse: Id, type: Exclude<LocationType, 'internal'>, session?: ClientSession) {
  const loc = await Location.findOne({ warehouse, type, deletedAt: null }).session(session ?? null);
  if (!loc) throw ApiError.conflict(`Warehouse is missing its ${type} location`);
  return loc;
}

/** First internal location of a warehouse (Stock1 by default). */
export async function getDefaultStockLocation(warehouse: Id, session?: ClientSession) {
  const loc = await Location.findOne({ warehouse, type: 'internal', deletedAt: null }).sort({ createdAt: 1 }).session(session ?? null);
  if (!loc) throw ApiError.conflict('Warehouse has no internal location');
  return loc;
}

export async function createLocation(input: { name: string; shortCode: string; warehouse: string }) {
  const wh = await Warehouse.findOne({ _id: input.warehouse, deletedAt: null });
  if (!wh) throw ApiError.badRequest('Warehouse not found', [{ field: 'warehouse', message: 'Not found' }]);
  if (await Location.exists({ warehouse: wh._id, shortCode: input.shortCode, deletedAt: null })) {
    throw ApiError.conflict(`${wh.shortCode}/${input.shortCode} already exists`, [{ field: 'shortCode', message: 'Already exists' }]);
  }
  return Location.create({
    name: input.name,
    shortCode: input.shortCode,
    warehouse: wh._id,
    type: 'internal',
    fullName: `${wh.shortCode}/${input.shortCode}`,
  });
}

export async function updateLocation(id: string, input: { name?: string; shortCode?: string }) {
  const loc = await Location.findOne({ _id: id, deletedAt: null }).populate<{ warehouse: { shortCode: string; _id: Types.ObjectId } }>('warehouse', 'shortCode');
  if (!loc) throw ApiError.notFound('Location not found');
  if (loc.type !== 'internal') throw ApiError.conflict('Virtual locations cannot be edited');
  if (input.shortCode && input.shortCode !== loc.shortCode) {
    if (await Location.exists({ warehouse: loc.warehouse._id, shortCode: input.shortCode, deletedAt: null, _id: { $ne: loc._id } })) {
      throw ApiError.conflict(`${loc.warehouse.shortCode}/${input.shortCode} already exists`, [{ field: 'shortCode', message: 'Already exists' }]);
    }
    loc.shortCode = input.shortCode;
    loc.fullName = `${loc.warehouse.shortCode}/${input.shortCode}`;
  }
  if (input.name !== undefined) loc.name = input.name;
  await loc.save();
  return Location.findById(loc._id).lean();
}

export async function deleteLocation(id: string) {
  const loc = await Location.findOne({ _id: id, deletedAt: null });
  if (!loc) throw ApiError.notFound('Location not found');
  if (loc.type !== 'internal') throw ApiError.conflict('Virtual locations cannot be deleted');
  const [stocked, open, siblings] = await Promise.all([
    StockQuant.exists({ location: loc._id, $or: [{ onHand: { $gt: 0 } }, { reserved: { $gt: 0 } }] }),
    Operation.exists({ status: { $in: OPEN_STATUSES }, $or: [{ sourceLocation: loc._id }, { destinationLocation: loc._id }] }),
    Location.countDocuments({ warehouse: loc.warehouse, type: 'internal', deletedAt: null }),
  ]);
  if (stocked) throw ApiError.conflict('This location still holds stock. Transfer or adjust it out first.');
  if (open) throw ApiError.conflict('This location is used by open operations.');
  if (siblings <= 1) throw ApiError.conflict('A warehouse needs at least one stock location.');
  loc.deletedAt = new Date();
  await loc.save();
}
