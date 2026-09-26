import { Schema, model, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, trim: true, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

categorySchema.index({ name: 1, parent: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export type CategoryAttrs = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);
