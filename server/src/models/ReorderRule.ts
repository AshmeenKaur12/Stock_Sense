import { Schema, model, type InferSchemaType } from 'mongoose';

const reorderRuleSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    minQty: { type: Number, required: true, min: 0 },
    maxQty: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

reorderRuleSchema.index({ product: 1, warehouse: 1 }, { unique: true });

export type ReorderRuleAttrs = InferSchemaType<typeof reorderRuleSchema>;
export const ReorderRule = model('ReorderRule', reorderRuleSchema);
