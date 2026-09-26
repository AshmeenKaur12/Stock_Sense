import type { Request, Response } from 'express';
import { Location } from '../models/Location';
import { Warehouse } from '../models/Warehouse';
import { currentUser } from '../middlewares/auth';
import * as catalog from '../services/catalog.service';
import * as warehouses from '../services/warehouse.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/response';

type Paged = { page: number; limit: number; search?: string };
const id = (req: Request) => req.params.id!;

// ── Warehouses ─────────────────────────────────────────────────────────────

export async function listWarehouses(_req: Request, res: Response) {
  const [items, counts] = await Promise.all([
    Warehouse.find({ deletedAt: null }).sort({ createdAt: 1 }).lean(),
    Location.aggregate<{ _id: unknown; n: number }>([{ $match: { deletedAt: null, type: 'internal' } }, { $group: { _id: '$warehouse', n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  sendSuccess(res, items.map((w) => ({ ...w, locationCount: byId.get(String(w._id)) ?? 0 })));
}

export async function getWarehouse(req: Request, res: Response) {
  const wh = await Warehouse.findOne({ _id: id(req), deletedAt: null }).lean();
  if (!wh) throw ApiError.notFound('Warehouse not found');
  sendSuccess(res, wh);
}

export async function createWarehouse(req: Request, res: Response) {
  sendSuccess(res, await warehouses.createWarehouse(req.body), { status: 201, message: 'Warehouse created with Stock1 and virtual locations' });
}

export async function updateWarehouse(req: Request, res: Response) {
  sendSuccess(res, await warehouses.updateWarehouse(id(req), req.body), { message: 'Warehouse saved' });
}

export async function deleteWarehouse(req: Request, res: Response) {
  await warehouses.deleteWarehouse(id(req));
  sendSuccess(res, null, { message: 'Warehouse archived' });
}

// ── Locations ──────────────────────────────────────────────────────────────

export async function listLocations(req: Request, res: Response) {
  const { warehouse, type } = req.query as { warehouse?: string; type?: string };
  const filter: Record<string, unknown> = { deletedAt: null };
  if (warehouse) filter.warehouse = warehouse;
  if (type !== 'all') filter.type = type ?? 'internal';
  const items = await Location.find(filter).populate('warehouse', 'name shortCode').sort({ fullName: 1 }).lean();
  sendSuccess(res, items.filter((l) => l.warehouse));
}

export async function createLocation(req: Request, res: Response) {
  sendSuccess(res, await warehouses.createLocation(req.body), { status: 201, message: 'Location created' });
}

export async function updateLocation(req: Request, res: Response) {
  sendSuccess(res, await warehouses.updateLocation(id(req), req.body), { message: 'Location saved' });
}

export async function deleteLocation(req: Request, res: Response) {
  await warehouses.deleteLocation(id(req));
  sendSuccess(res, null, { message: 'Location archived' });
}

// ── Products ───────────────────────────────────────────────────────────────

export async function listProducts(req: Request, res: Response) {
  const q = req.query as unknown as Paged & { category?: string; active?: boolean };
  const { items, total } = await catalog.listProducts(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total } });
}

export async function getProduct(req: Request, res: Response) {
  sendSuccess(res, await catalog.getProduct(id(req)));
}

export async function createProduct(req: Request, res: Response) {
  const u = currentUser(req);
  sendSuccess(res, await catalog.createProduct(req.body, { id: u.id, name: u.name }), { status: 201, message: 'Product created' });
}

export async function updateProduct(req: Request, res: Response) {
  sendSuccess(res, await catalog.updateProduct(id(req), req.body), { message: 'Product saved' });
}

export async function deleteProduct(req: Request, res: Response) {
  await catalog.deleteProduct(id(req));
  sendSuccess(res, null, { message: 'Product archived' });
}

// ── Categories ─────────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response) {
  sendSuccess(res, await catalog.listCategories());
}
export async function createCategory(req: Request, res: Response) {
  sendSuccess(res, await catalog.createCategory(req.body), { status: 201, message: 'Category created' });
}
export async function updateCategory(req: Request, res: Response) {
  sendSuccess(res, await catalog.updateCategory(id(req), req.body), { message: 'Category saved' });
}
export async function deleteCategory(req: Request, res: Response) {
  await catalog.deleteCategory(id(req));
  sendSuccess(res, null, { message: 'Category archived' });
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function listContacts(req: Request, res: Response) {
  const q = req.query as unknown as Paged & { type?: string };
  const { items, total } = await catalog.listContacts(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total } });
}
export async function createContact(req: Request, res: Response) {
  sendSuccess(res, await catalog.createContact(req.body), { status: 201, message: 'Contact created' });
}
export async function updateContact(req: Request, res: Response) {
  sendSuccess(res, await catalog.updateContact(id(req), req.body), { message: 'Contact saved' });
}
export async function deleteContact(req: Request, res: Response) {
  await catalog.deleteContact(id(req));
  sendSuccess(res, null, { message: 'Contact archived' });
}

// ── Reorder rules ──────────────────────────────────────────────────────────

export async function listReorderRules(req: Request, res: Response) {
  const q = req.query as unknown as Paged & { product?: string; warehouse?: string };
  const { items, total } = await catalog.listReorderRules(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total } });
}
export async function createReorderRule(req: Request, res: Response) {
  sendSuccess(res, await catalog.createReorderRule(req.body), { status: 201, message: 'Reorder rule created' });
}
export async function updateReorderRule(req: Request, res: Response) {
  sendSuccess(res, await catalog.updateReorderRule(id(req), req.body), { message: 'Reorder rule saved' });
}
export async function deleteReorderRule(req: Request, res: Response) {
  await catalog.deleteReorderRule(id(req));
  sendSuccess(res, null, { message: 'Reorder rule deleted' });
}
