import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { Contact } from '../src/models/Contact';
import { Location } from '../src/models/Location';
import { Product } from '../src/models/Product';
import { User } from '../src/models/User';
import { hashPassword } from '../src/services/auth.service';
import { createLocation, createWarehouse } from '../src/services/warehouse.service';

let replSet: MongoMemoryReplSet | null = null;

/** Single-node in-memory replica set so transactions behave exactly as in production. */
export async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: `test-${Date.now()}` });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function stopDb() {
  await mongoose.disconnect();
  await replSet?.stop();
  replSet = null;
}

export async function resetDb() {
  const db = mongoose.connection.db!;
  const collections = await db.collections();
  // Drop documents (not collections) so indexes stay built.
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export const PASSWORD = 'Secret@123';

export async function createUser(loginId: string, role: 'staff' | 'manager' | 'admin') {
  return User.create({ loginId, email: `${loginId}@test.io`, name: loginId, role, passwordHash: await hashPassword(PASSWORD) });
}

/** Logged-in supertest agent (cookies persist across calls). */
export async function loginAgent(app: Express, loginId: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ loginId, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${loginId}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export interface Fixture {
  app: Express;
  admin: ReturnType<typeof request.agent>;
  manager: ReturnType<typeof request.agent>;
  staff: ReturnType<typeof request.agent>;
  warehouseId: string;
  mainStore: string;
  prodRack: string;
  steel: string;
  vendor: string;
  customer: string;
}

/**
 * Warehouse WH with Stock1 ("Main Store") + ProdRack, product Steel (kg),
 * one vendor, one customer and one logged-in agent per role.
 */
export async function buildFixture(): Promise<Fixture> {
  const app = createApp();
  await Promise.all([createUser('admin01', 'admin'), createUser('manager1', 'manager'), createUser('staff01', 'staff')]);
  const wh = await createWarehouse({ name: 'Main Warehouse', shortCode: 'WH', address: 'Plot 7' });
  const stock1 = await Location.findOne({ warehouse: wh._id, shortCode: 'Stock1' }).lean();
  const rack = await createLocation({ name: 'Production Rack', shortCode: 'ProdRack', warehouse: String(wh._id) });
  const steel = await Product.create({ name: 'Steel', sku: 'STL001', uom: 'kg', perUnitCost: 80 });
  const [vendor, customer] = await Contact.create([
    { name: 'Tata Steel', type: 'vendor' },
    { name: 'Azure Interior', type: 'customer', address: '12 MG Road' },
  ]);
  const [admin, manager, staff] = await Promise.all([loginAgent(app, 'admin01'), loginAgent(app, 'manager1'), loginAgent(app, 'staff01')]);
  return {
    app,
    admin,
    manager,
    staff,
    warehouseId: String(wh._id),
    mainStore: String(stock1!._id),
    prodRack: String(rack._id),
    steel: String(steel._id),
    vendor: String(vendor!._id),
    customer: String(customer!._id),
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polls until `fn` returns truthy (post-commit effects run asynchronously). */
export async function eventually<T>(fn: () => Promise<T>, timeoutMs = 5000): Promise<NonNullable<T>> {
  const start = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value as NonNullable<T>;
    if (Date.now() - start > timeoutMs) throw new Error('condition not met in time');
    await sleep(50);
  }
}
