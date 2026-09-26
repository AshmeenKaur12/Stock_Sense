import { Schema, model, type InferSchemaType } from 'mongoose';

export const LOCATION_TYPES = ['internal', 'vendor', 'customer', 'adjustment'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

/**
 * Internal locations (Stock1, RackA…) hold stock. Each warehouse also owns three
 * virtual locations — Partners/Vendor, Partners/Customer, Virtual/Adjustment — which
 * are the counterpart of every receipt, delivery and adjustment move.
 */
const locationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortCode: { type: String, required: true, trim: true, match: /^[A-Za-z0-9_-]{1,16}$/ },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    type: { type: String, enum: LOCATION_TYPES, default: 'internal' },
    /** e.g. "WH/Stock1" for internal, "Partners/Vendor" for virtual. */
    fullName: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

locationSchema.index(
  { warehouse: 1, shortCode: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

export type LocationAttrs = InferSchemaType<typeof locationSchema>;
export const Location = model('Location', locationSchema);

export const isStockLocation = (type: LocationType | string) => type === 'internal';
