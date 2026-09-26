import { z } from 'zod';
import { loginIdSchema, passwordSchema } from '@/features/auth/schema';
import { UOMS } from './api';

/** Client-side mirrors of the server validators (server stays the source of truth). */

const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(120);
const optionalEmail = z.union([z.string().trim().email('Enter a valid email').max(120), z.literal('')]);
const quantity = z
  .number({ invalid_type_error: 'Enter a number', required_error: 'Required' })
  .finite('Enter a number')
  .min(0, 'Cannot be negative')
  .max(1e9, 'Too large');
const money = z
  .number({ invalid_type_error: 'Enter an amount', required_error: 'Required' })
  .finite('Enter an amount')
  .min(0, 'Cannot be negative')
  .max(1e12, 'Too large');

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep it under 80 characters'),
  shortCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,8}$/, '1–8 letters or digits (A–Z, 0–9)'),
  address: z.string().trim().max(300, 'Keep it under 300 characters'),
});
export type WarehouseForm = z.infer<typeof warehouseSchema>;

export const locationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep it under 80 characters'),
  shortCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,16}$/, '1–16 letters, digits, dash or underscore'),
  warehouse: z.string().min(1, 'Choose a warehouse'),
});
export type LocationForm = z.infer<typeof locationSchema>;

export const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Keep it under 120 characters'),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{2,20}$/, '2–20 letters, digits or dashes'),
    category: z.string(),
    uom: z.enum(UOMS),
    perUnitCost: money,
    salePrice: money,
    isActive: z.boolean(),
    withInitialStock: z.boolean(),
    initialQuantity: quantity,
    initialLocation: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.withInitialStock) return;
    if (!v.initialLocation) ctx.addIssue({ code: 'custom', path: ['initialLocation'], message: 'Choose a location' });
    if (!(v.initialQuantity > 0)) ctx.addIssue({ code: 'custom', path: ['initialQuantity'], message: 'Enter a quantity above 0' });
  });
export type ProductForm = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep it under 80 characters'),
  parent: z.string(),
  description: z.string().trim().max(300, 'Keep it under 300 characters'),
});
export type CategoryForm = z.infer<typeof categorySchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Keep it under 120 characters'),
  type: z.enum(['vendor', 'customer']),
  email: optionalEmail,
  phone: z.string().trim().max(30, 'Keep it under 30 characters'),
  address: z.string().trim().max(300, 'Keep it under 300 characters'),
});
export type ContactForm = z.infer<typeof contactSchema>;

const role = z.enum(['staff', 'manager', 'admin']);

export const userCreateSchema = z.object({
  loginId: loginIdSchema,
  email,
  name: z.string().trim().max(60, 'Keep it under 60 characters'),
  password: passwordSchema,
  role,
});
export type UserCreateForm = z.infer<typeof userCreateSchema>;

export const userEditSchema = z.object({
  name: z.string().trim().max(60, 'Keep it under 60 characters'),
  email,
  role,
  isActive: z.boolean(),
});
export type UserEditForm = z.infer<typeof userEditSchema>;

export const reorderRuleSchema = z
  .object({
    product: z.object({ _id: z.string(), sku: z.string(), name: z.string(), uom: z.string(), perUnitCost: z.number() }).nullable(),
    warehouse: z.string(),
    minQty: quantity,
    maxQty: quantity,
  })
  .superRefine((v, ctx) => {
    if (!v.product) ctx.addIssue({ code: 'custom', path: ['product'], message: 'Choose a product' });
    if (!v.warehouse) ctx.addIssue({ code: 'custom', path: ['warehouse'], message: 'Choose a warehouse' });
    if (v.minQty > v.maxQty) ctx.addIssue({ code: 'custom', path: ['minQty'], message: 'Minimum cannot exceed maximum' });
  });
export type ReorderRuleForm = z.infer<typeof reorderRuleSchema>;
