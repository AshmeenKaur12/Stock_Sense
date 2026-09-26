import { z } from 'zod';
import { ADJUSTMENT_REASONS, DELIVERY_KINDS, OPERATION_STATUSES, OPERATION_TYPES } from '../models/Operation';
import { MOVE_DIRECTIONS } from '../models/StockMove';
import { ROLES } from '../models/User';
import { UOMS } from '../models/Product';
import { emailSchema, loginIdSchema, passwordSchema } from './auth';
import { booleanQuery, objectId, optionalObjectId, pageQuery } from './common';

const qty = z.coerce.number().finite().min(0, 'Quantity cannot be negative').max(1e9);
const positiveQty = z.coerce.number().finite().gt(0, 'Quantity must be greater than 0').max(1e9);
const money = z.coerce.number().finite().min(0, 'Amount cannot be negative').max(1e12);
const nullableId = z.union([objectId, z.null(), z.literal('')]).transform((v) => (v ? v : null));
const optionalDate = z.coerce.date().optional();

// ── Warehouses & locations ────────────────────────────────────────────────

export const warehouseBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  shortCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,8}$/, 'Short code: 1–8 letters or digits'),
  address: z.string().trim().max(300).optional(),
});
export const warehousePatch = warehouseBody.partial();

export const locationBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  shortCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,16}$/, 'Short code: 1–16 letters, digits, dash or underscore'),
  warehouse: objectId,
});
export const locationPatch = locationBody.omit({ warehouse: true }).partial();
export const locationQuery = z.object({ warehouse: optionalObjectId, type: z.enum(['internal', 'vendor', 'customer', 'adjustment', 'all']).optional() });

// ── Catalog ───────────────────────────────────────────────────────────────

export const productBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/, 'SKU: 2–20 letters, digits or dashes'),
  category: nullableId.optional(),
  uom: z.enum(UOMS).optional(),
  perUnitCost: money.optional(),
  salePrice: money.optional(),
  isActive: z.boolean().optional(),
  initialStock: z
    .object({ quantity: qty, location: objectId })
    .nullable()
    .optional(),
});
export const productPatch = productBody.omit({ initialStock: true }).partial();
export const productQuery = z.object({ ...pageQuery, category: optionalObjectId, active: booleanQuery });

export const categoryBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  parent: nullableId.optional(),
  description: z.string().trim().max(300).optional(),
});
export const categoryPatch = categoryBody.partial();

export const contactBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  type: z.enum(['vendor', 'customer']),
  email: z.union([emailSchema, z.literal('')]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
});
export const contactPatch = contactBody.partial();
export const contactQuery = z.object({ ...pageQuery, type: z.enum(['vendor', 'customer']).optional() });

export const reorderRuleBody = z
  .object({ product: objectId, warehouse: objectId, minQty: qty, maxQty: qty })
  .refine((v) => v.minQty <= v.maxQty, { path: ['minQty'], message: 'Minimum cannot exceed maximum' });
export const reorderRulePatch = z.object({ minQty: qty.optional(), maxQty: qty.optional() });
export const reorderRuleQuery = z.object({ ...pageQuery, product: optionalObjectId, warehouse: optionalObjectId });

// ── Operations ────────────────────────────────────────────────────────────

const lineBody = z.object({ product: objectId, quantity: positiveQty });

export const operationBody = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['receipt', 'delivery', 'internal']),
    warehouse: objectId.optional(),
    contact: nullableId.optional(),
    sourceLocation: objectId.optional(),
    destinationLocation: objectId.optional(),
    scheduleDate: optionalDate,
    responsible: objectId.optional(),
    deliveryAddress: z.string().trim().max(300).optional(),
    operationType: z.enum(DELIVERY_KINDS).optional(),
    notes: z.string().trim().max(1000).optional(),
    lines: z.array(lineBody).max(200).optional(),
  }),
  z.object({
    type: z.literal('adjustment'),
    product: objectId,
    location: objectId,
    countedQty: qty,
    reason: z.enum(ADJUSTMENT_REASONS).exclude(['initial_stock']),
    notes: z.string().trim().max(1000).optional(),
  }),
]);

export const operationPatch = z.object({
  warehouse: objectId.optional(),
  contact: nullableId.optional(),
  sourceLocation: objectId.optional(),
  destinationLocation: objectId.optional(),
  scheduleDate: optionalDate,
  responsible: objectId.optional(),
  deliveryAddress: z.string().trim().max(300).optional(),
  operationType: z.enum(DELIVERY_KINDS).optional(),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(lineBody).max(200).optional(),
});

export const operationQuery = z.object({
  ...pageQuery,
  type: z.enum(OPERATION_TYPES).optional(),
  status: z.enum(OPERATION_STATUSES).optional(),
  warehouse: optionalObjectId,
  location: optionalObjectId,
  category: optionalObjectId,
  late: booleanQuery,
  upcoming: booleanQuery,
  sort: z.string().trim().optional(),
});

export const statusPatch = z.object({ status: z.enum(OPERATION_STATUSES) });
export const toggleBody = z.object({ value: z.boolean().optional().default(true) });

// ── Stock & moves ─────────────────────────────────────────────────────────

export const stockQuery = z.object({
  ...pageQuery,
  warehouse: optionalObjectId,
  location: optionalObjectId,
  category: optionalObjectId,
  stockStatus: z.enum(['in', 'low', 'out']).optional(),
  sort: z.string().trim().optional(),
});
export const stockAdjustBody = z.object({
  location: objectId,
  countedQty: qty,
  reason: z.enum(ADJUSTMENT_REASONS).exclude(['initial_stock']),
  notes: z.string().trim().max(1000).optional(),
});
export const productIdParams = z.object({ productId: objectId });

export const moveQuery = z.object({
  ...pageQuery,
  product: optionalObjectId,
  location: optionalObjectId,
  warehouse: optionalObjectId,
  direction: z.enum(MOVE_DIRECTIONS).optional(),
  from: optionalDate,
  to: optionalDate,
});

// ── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardQuery = z.object({
  type: z.enum(OPERATION_TYPES).optional(),
  status: z.enum(OPERATION_STATUSES).optional(),
  warehouse: optionalObjectId,
  location: optionalObjectId,
  category: optionalObjectId,
});
export const chartsQuery = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
  warehouse: optionalObjectId,
  category: optionalObjectId,
});

// ── Users & profile ───────────────────────────────────────────────────────

export const userCreateBody = z.object({
  loginId: loginIdSchema,
  email: emailSchema,
  name: z.string().trim().max(60).optional(),
  password: passwordSchema,
  role: z.enum(ROLES),
});
export const userPatch = z.object({
  name: z.string().trim().max(60).optional(),
  email: emailSchema.optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});
export const userQuery = z.object({ ...pageQuery, role: z.enum(ROLES).optional() });
export const profilePatch = z.object({ name: z.string().trim().min(1).max(60).optional(), email: emailSchema.optional() });

export const notificationQuery = z.object({ ...pageQuery, unread: booleanQuery });
