import { Schema, model, type InferSchemaType } from 'mongoose';

export const UOMS = ['Units', 'pcs', 'kg', 'g', 'L', 'mL', 'm', 'cm', 'box', 'pack'] as const;

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9-]{2,20}$/ },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    uom: { type: String, enum: UOMS, default: 'Units' },
    perUnitCost: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', sku: 'text' });

/** "[DESK001] Desk" — the label used on every operation line. */
productSchema.virtual('displayName').get(function (this: { sku: string; name: string }) {
  return `[${this.sku}] ${this.name}`;
});

export type ProductAttrs = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);
