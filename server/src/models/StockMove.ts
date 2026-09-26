import { Schema, model, type InferSchemaType } from 'mongoose';

export const MOVE_DIRECTIONS = ['in', 'out', 'internal', 'adjust'] as const;
export type MoveDirection = (typeof MOVE_DIRECTIONS)[number];

/**
 * The stock ledger. Append-only: rows are inserted by the stock engine inside the
 * same transaction that changes quants, and never updated or deleted (enforced by
 * the middleware below).
 */
const stockMoveSchema = new Schema(
  {
    reference: { type: String, required: true, index: true },
    operation: { type: Schema.Types.ObjectId, ref: 'Operation', required: true, index: true },
    operationType: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    from: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    /** Always positive; see `effect` for the sign. */
    quantity: { type: Number, required: true, min: 0 },
    /** +1 stock entered the warehouse, −1 left it, 0 moved between internal locations. */
    effect: { type: Number, enum: [1, -1, 0], required: true },
    direction: { type: String, enum: MOVE_DIRECTIONS, required: true },
    contact: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    contactName: { type: String, default: '' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, default: 'done' },
    reason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMoveSchema.index({ from: 1, date: -1 });
stockMoveSchema.index({ to: 1, date: -1 });

const immutable = () => {
  throw new Error('Stock moves are append-only and cannot be modified or deleted');
};
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'] as const) {
  stockMoveSchema.pre(op, immutable);
}

export type StockMoveAttrs = InferSchemaType<typeof stockMoveSchema>;
export const StockMove = model('StockMove', stockMoveSchema);
