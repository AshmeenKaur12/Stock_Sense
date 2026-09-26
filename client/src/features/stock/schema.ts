import { z } from 'zod';
import type { ManualAdjustmentReason } from './api';

export const UOM_OPTIONS = ['Units', 'pcs', 'kg', 'g', 'L', 'mL', 'm', 'cm', 'box', 'pack'] as const;

export const ADJUST_REASONS: { value: ManualAdjustmentReason; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
  { value: 'count_correction', label: 'Count correction' },
  { value: 'expired', label: 'Expired' },
];

const money = (label: string) =>
  z
    .number({ invalid_type_error: `Enter a ${label}`, required_error: `Enter a ${label}` })
    .min(0, 'Cannot be negative')
    .max(100_000_000, 'That looks too large');

export const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Keep it under 120 characters'),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'SKU is required')
      .regex(/^[A-Z0-9-]{2,20}$/, '2–20 letters, digits or dashes'),
    category: z.string(),
    uom: z.enum(UOM_OPTIONS, { errorMap: () => ({ message: 'Choose a unit' }) }),
    perUnitCost: money('cost'),
    salePrice: money('price'),
    initialQty: z.number({ invalid_type_error: 'Enter a quantity' }).min(0, 'Cannot be negative'),
    initialLocation: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.initialQty > 0 && !v.initialLocation) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['initialLocation'], message: 'Choose where the stock is' });
    }
  });

export type ProductFormValues = z.infer<typeof productSchema>;

export const PRODUCT_DEFAULTS: ProductFormValues = {
  name: '',
  sku: '',
  category: '',
  uom: 'Units',
  perUnitCost: 0,
  salePrice: 0,
  initialQty: 0,
  initialLocation: '',
};
