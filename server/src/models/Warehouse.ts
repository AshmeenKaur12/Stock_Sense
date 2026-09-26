import { Schema, model, type InferSchemaType } from 'mongoose';

const warehouseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortCode: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9]{1,8}$/ },
    address: { type: String, trim: true, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

warehouseSchema.index({ shortCode: 1 }, { unique: true });

export type WarehouseAttrs = InferSchemaType<typeof warehouseSchema>;
export const Warehouse = model('Warehouse', warehouseSchema);
