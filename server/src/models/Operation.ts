import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const OPERATION_TYPES = ['receipt', 'delivery', 'internal', 'adjustment'] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const OPERATION_STATUSES = ['draft', 'waiting', 'ready', 'done', 'canceled'] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

export const DELIVERY_KINDS = ['delivery_order', 'return', 'dropship'] as const;
export const ADJUSTMENT_REASONS = ['damaged', 'lost', 'count_correction', 'expired', 'initial_stock'] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

/** Reference code per operation type: WH/IN/0001, WH/OUT/0001… */
export const OPERATION_CODES: Record<OperationType, string> = {
  receipt: 'IN',
  delivery: 'OUT',
  internal: 'INT',
  adjustment: 'ADJ',
};

export const OPEN_STATUSES: OperationStatus[] = ['draft', 'waiting', 'ready'];

const lineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0 },
    /** Quantity actually moved on validation (equals `quantity` — partial moves are not supported). */
    doneQty: { type: Number, default: 0, min: 0 },
    /** Delivery/transfer: quantity currently reserved at the source location. */
    reservedQty: { type: Number, default: 0, min: 0 },
    /** Delivery: true when Check Availability found insufficient free stock. */
    isShort: { type: Boolean, default: false },
    /** Delivery: free-to-use quantity seen at the last availability check. */
    availableQty: { type: Number, default: null },
    /** Adjustment: system quantity before the count and the physically counted quantity. */
    recordedQty: { type: Number, default: null },
    countedQty: { type: Number, default: null },
  },
  { _id: true },
);

const operationSchema = new Schema(
  {
    reference: { type: String, required: true },
    type: { type: String, enum: OPERATION_TYPES, required: true },
    status: { type: String, enum: OPERATION_STATUSES, default: 'draft' },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    contact: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    sourceLocation: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    destinationLocation: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    deliveryAddress: { type: String, trim: true, default: '' },
    operationType: { type: String, enum: DELIVERY_KINDS, default: 'delivery_order' },
    scheduleDate: { type: Date, required: true },
    doneDate: { type: Date, default: null },
    responsible: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    picked: { type: Boolean, default: false },
    packed: { type: Boolean, default: false },
    reason: { type: String, enum: [...ADJUSTMENT_REASONS, null], default: null },
    notes: { type: String, trim: true, default: '' },
    lines: { type: [lineSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

operationSchema.index({ reference: 1 }, { unique: true });
operationSchema.index({ type: 1, status: 1, scheduleDate: 1 });
operationSchema.index({ warehouse: 1, type: 1 });
operationSchema.index({ 'lines.product': 1, status: 1 });
operationSchema.index({ sourceLocation: 1, status: 1, type: 1 });

export type OperationAttrs = InferSchemaType<typeof operationSchema>;
export type OperationDoc = HydratedDocument<OperationAttrs>;
export const Operation = model('Operation', operationSchema);
