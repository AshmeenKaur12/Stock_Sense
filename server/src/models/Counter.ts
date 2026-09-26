import { Schema, model, type ClientSession } from 'mongoose';

/** Monotonic sequences keyed by `<warehouseId>:<code>` (e.g. "65f…:IN"). */
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model('Counter', counterSchema);

/** Atomically increments and returns the next value — safe under concurrency. */
export async function nextSequence(key: string, session?: ClientSession): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return doc.seq;
}
