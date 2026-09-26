import { Types } from 'mongoose';
import { Category } from '../models/Category';
import { Contact } from '../models/Contact';
import { Operation, OPEN_STATUSES } from '../models/Operation';
import { Product } from '../models/Product';
import { ReorderRule } from '../models/ReorderRule';
import { StockQuant } from '../models/StockQuant';
import { Warehouse } from '../models/Warehouse';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../validators/common';
import { checkStockAlerts } from './alert.service';
import { applyAdjustment, type Actor } from './operation.service';

// ─────────────────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductInput {
  name: string;
  sku: string;
  category?: string | null;
  uom?: string;
  perUnitCost?: number;
  salePrice?: number;
  isActive?: boolean;
  initialStock?: { quantity: number; location: string } | null;
}

const withDisplayName = <T extends { sku: string; name: string }>(p: T) => ({ ...p, displayName: `[${p.sku}] ${p.name}` });

export async function listProducts(q: { search?: string; category?: string; active?: boolean; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (q.category) filter.category = q.category;
  if (q.active !== undefined) filter.isActive = q.active;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ sku: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('category', 'name').lean(),
    Product.countDocuments(filter),
  ]);
  return { items: items.map(withDisplayName), total };
}

export async function getProduct(id: string) {
  const p = await Product.findOne({ _id: id, deletedAt: null }).populate('category', 'name').lean();
  if (!p) throw ApiError.notFound('Product not found');
  const rules = await ReorderRule.find({ product: id }).populate('warehouse', 'name shortCode').lean();
  return { ...withDisplayName(p), reorderRules: rules };
}

async function assertCategory(id: string | null | undefined) {
  if (!id) return null;
  const cat = await Category.findOne({ _id: id, deletedAt: null }).lean();
  if (!cat) throw ApiError.unprocessable('Category not found', [{ field: 'category', message: 'Not found' }]);
  return cat._id;
}

export async function createProduct(input: ProductInput, actor: Actor) {
  const sku = input.sku.toUpperCase();
  if (await Product.exists({ sku })) throw ApiError.conflict(`SKU ${sku} already exists`, [{ field: 'sku', message: 'SKU must be unique' }]);
  const product = await Product.create({
    name: input.name,
    sku,
    category: await assertCategory(input.category),
    uom: input.uom ?? 'Units',
    perUnitCost: input.perUnitCost ?? 0,
    salePrice: input.salePrice ?? 0,
    isActive: input.isActive ?? true,
  });

  // Initial stock is recorded as an adjustment so the ledger stays complete.
  if (input.initialStock && input.initialStock.quantity > 0) {
    try {
      await applyAdjustment(
        { product: String(product._id), location: input.initialStock.location, countedQty: input.initialStock.quantity, reason: 'initial_stock', notes: 'Initial stock' },
        actor,
      );
    } catch (err) {
      await Product.deleteOne({ _id: product._id });
      throw err;
    }
  }
  return getProduct(String(product._id));
}

export async function updateProduct(id: string, input: Partial<Omit<ProductInput, 'initialStock'>>) {
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');
  if (input.sku && input.sku.toUpperCase() !== product.sku) {
    const sku = input.sku.toUpperCase();
    if (await Product.exists({ sku, _id: { $ne: product._id } })) throw ApiError.conflict(`SKU ${sku} already exists`, [{ field: 'sku', message: 'SKU must be unique' }]);
    product.sku = sku;
  }
  if (input.category !== undefined) product.category = await assertCategory(input.category);
  if (input.name !== undefined) product.name = input.name;
  if (input.uom !== undefined) product.set('uom', input.uom);
  if (input.perUnitCost !== undefined) product.perUnitCost = input.perUnitCost;
  if (input.salePrice !== undefined) product.salePrice = input.salePrice;
  if (input.isActive !== undefined) product.isActive = input.isActive;
  await product.save();
  return getProduct(id);
}

export async function deleteProduct(id: string) {
  const product = await Product.findOne({ _id: id, deletedAt: null });
  if (!product) throw ApiError.notFound('Product not found');
  const [stocked, open] = await Promise.all([
    StockQuant.exists({ product: product._id, $or: [{ onHand: { $gt: 0 } }, { reserved: { $gt: 0 } }] }),
    Operation.exists({ 'lines.product': product._id, status: { $in: OPEN_STATUSES } }),
  ]);
  if (stocked) throw ApiError.conflict('This product still has stock on hand. Adjust it to zero first.');
  if (open) throw ApiError.conflict('This product is used by open operations. Validate or cancel them first.');
  product.deletedAt = new Date();
  product.isActive = false;
  await product.save();
  await ReorderRule.deleteMany({ product: product._id });
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

export async function listCategories() {
  const [cats, counts] = await Promise.all([
    Category.find({ deletedAt: null }).sort({ name: 1 }).lean(),
    Product.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { deletedAt: null } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return cats.map((c) => ({ ...c, productCount: byId.get(String(c._id)) ?? 0 }));
}

async function assertParent(parent: string | null | undefined, selfId?: string) {
  if (!parent) return null;
  if (selfId && parent === selfId) throw ApiError.unprocessable('A category cannot be its own parent', [{ field: 'parent', message: 'Invalid parent' }]);
  // Walk up to prevent cycles.
  let cursor: string | null = parent;
  for (let depth = 0; cursor && depth < 20; depth++) {
    const node: { _id: Types.ObjectId; parent?: Types.ObjectId | null } | null = await Category.findOne({ _id: cursor, deletedAt: null })
      .select('parent')
      .lean<{ _id: Types.ObjectId; parent?: Types.ObjectId | null }>();
    if (!node) throw ApiError.unprocessable('Parent category not found', [{ field: 'parent', message: 'Not found' }]);
    if (selfId && String(node._id) === selfId) throw ApiError.unprocessable('That would create a loop', [{ field: 'parent', message: 'Invalid parent' }]);
    cursor = node.parent ? String(node.parent) : null;
  }
  return new Types.ObjectId(parent);
}

export async function createCategory(input: { name: string; parent?: string | null; description?: string }) {
  const parent = await assertParent(input.parent);
  if (await Category.exists({ name: input.name, parent, deletedAt: null })) throw ApiError.conflict('A category with this name already exists here', [{ field: 'name', message: 'Already exists' }]);
  return Category.create({ name: input.name, parent, description: input.description ?? '' });
}

export async function updateCategory(id: string, input: { name?: string; parent?: string | null; description?: string }) {
  const cat = await Category.findOne({ _id: id, deletedAt: null });
  if (!cat) throw ApiError.notFound('Category not found');
  if (input.parent !== undefined) cat.parent = await assertParent(input.parent, id);
  if (input.name !== undefined) cat.name = input.name;
  if (input.description !== undefined) cat.description = input.description;
  await cat.save();
  return cat;
}

export async function deleteCategory(id: string) {
  const cat = await Category.findOne({ _id: id, deletedAt: null });
  if (!cat) throw ApiError.notFound('Category not found');
  const [children, products] = await Promise.all([
    Category.exists({ parent: cat._id, deletedAt: null }),
    Product.exists({ category: cat._id, deletedAt: null }),
  ]);
  if (children) throw ApiError.conflict('Move or delete the sub-categories first.');
  if (products) throw ApiError.conflict('This category still has products. Reassign them first.');
  cat.deletedAt = new Date();
  await cat.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactInput {
  name: string;
  type: 'vendor' | 'customer';
  email?: string;
  phone?: string;
  address?: string;
}

export async function listContacts(q: { search?: string; type?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (q.type) filter.type = q.type;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    Contact.find(filter).sort({ name: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Contact.countDocuments(filter),
  ]);
  return { items, total };
}

export const createContact = (input: ContactInput) => Contact.create(input);

export async function updateContact(id: string, input: Partial<ContactInput>) {
  const contact = await Contact.findOne({ _id: id, deletedAt: null });
  if (!contact) throw ApiError.notFound('Contact not found');
  if (input.type && input.type !== contact.type && (await Operation.exists({ contact: contact._id }))) {
    throw ApiError.conflict('This contact is used by operations; its type cannot change.');
  }
  contact.set(input);
  await contact.save();
  return contact;
}

export async function deleteContact(id: string) {
  const contact = await Contact.findOne({ _id: id, deletedAt: null });
  if (!contact) throw ApiError.notFound('Contact not found');
  if (await Operation.exists({ contact: contact._id, status: { $in: OPEN_STATUSES } })) {
    throw ApiError.conflict('This contact has open operations. Validate or cancel them first.');
  }
  contact.deletedAt = new Date();
  await contact.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// Reorder rules
// ─────────────────────────────────────────────────────────────────────────────

export interface ReorderRuleInput {
  product: string;
  warehouse: string;
  minQty: number;
  maxQty: number;
}

export async function listReorderRules(q: { product?: string; warehouse?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.product) filter.product = q.product;
  if (q.warehouse) filter.warehouse = q.warehouse;
  const [items, total] = await Promise.all([
    ReorderRule.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('product', 'sku name uom')
      .populate('warehouse', 'shortCode name')
      .lean(),
    ReorderRule.countDocuments(filter),
  ]);
  return { items, total };
}

async function assertRuleRefs(product: string, warehouse: string) {
  const [p, w] = await Promise.all([Product.exists({ _id: product, deletedAt: null }), Warehouse.exists({ _id: warehouse, deletedAt: null })]);
  if (!p) throw ApiError.unprocessable('Product not found', [{ field: 'product', message: 'Not found' }]);
  if (!w) throw ApiError.unprocessable('Warehouse not found', [{ field: 'warehouse', message: 'Not found' }]);
}

export async function createReorderRule(input: ReorderRuleInput) {
  await assertRuleRefs(input.product, input.warehouse);
  if (await ReorderRule.exists({ product: input.product, warehouse: input.warehouse })) {
    throw ApiError.conflict('This product already has a rule for that warehouse', [{ field: 'product', message: 'Rule exists' }]);
  }
  const rule = await ReorderRule.create(input);
  await checkStockAlerts([{ product: input.product, warehouse: input.warehouse }]);
  return rule;
}

export async function updateReorderRule(id: string, input: Partial<Pick<ReorderRuleInput, 'minQty' | 'maxQty'>>) {
  const rule = await ReorderRule.findById(id);
  if (!rule) throw ApiError.notFound('Reorder rule not found');
  const min = input.minQty ?? rule.minQty;
  const max = input.maxQty ?? rule.maxQty;
  if (min > max) throw ApiError.unprocessable('Minimum cannot exceed maximum', [{ field: 'minQty', message: 'Must be ≤ maximum' }]);
  rule.minQty = min;
  rule.maxQty = max;
  await rule.save();
  await checkStockAlerts([{ product: String(rule.product), warehouse: String(rule.warehouse) }]);
  return rule;
}

export async function deleteReorderRule(id: string) {
  const res = await ReorderRule.deleteOne({ _id: id });
  if (!res.deletedCount) throw ApiError.notFound('Reorder rule not found');
}
