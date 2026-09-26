import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Source of truth for on-hand stock per (product, internal location).
 * Only the stock service mutates quants, always inside a transaction, and
 * always with guarded updates so neither field can go below zero.
 */
const stockQuantSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    onHand: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

stockQuantSchema.index({ product: 1, location: 1 }, { unique: true });

stockQuantSchema.virtual('freeToUse').get(function (this: { onHand: number; reserved: number }) {
  return Math.max(0, this.onHand - this.reserved);
});

export type StockQuantAttrs = InferSchemaType<typeof stockQuantSchema>;
export const StockQuant = model('StockQuant', stockQuantSchema);
