import { Schema, model, type InferSchemaType } from 'mongoose';

export const CONTACT_TYPES = ['vendor', 'customer'] as const;

const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: CONTACT_TYPES, required: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

contactSchema.index({ name: 1 });
contactSchema.index({ type: 1 });

export type ContactAttrs = InferSchemaType<typeof contactSchema>;
export const Contact = model('Contact', contactSchema);
