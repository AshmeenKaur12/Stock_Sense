import request from 'supertest';
import { buildFixture, resetDb, startDb, stopDb, type Fixture } from './helpers';

let f: Fixture;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  f = await buildFixture();
});

describe('RBAC is enforced by the API', () => {
  it('rejects unauthenticated requests with 401', async () => {
    await request(f.app).get('/api/v1/operations').expect(401);
    await request(f.app).get('/api/v1/stock').expect(401);
  });

  it('staff can view and process operations but not manage master data', async () => {
    await f.staff.get('/api/v1/stock').expect(200);
    await f.staff.get('/api/v1/moves').expect(200);
    await f.staff.post('/api/v1/operations').send({ type: 'receipt', warehouse: f.warehouseId }).expect(201);

    await f.staff.post('/api/v1/products').send({ name: 'X', sku: 'X01' }).expect(403);
    await f.staff.post('/api/v1/categories').send({ name: 'Cat' }).expect(403);
    await f.staff.post('/api/v1/contacts').send({ name: 'C', type: 'vendor' }).expect(403);
    await f.staff.post('/api/v1/reorder-rules').send({ product: f.steel, warehouse: f.warehouseId, minQty: 1, maxQty: 2 }).expect(403);
    await f.staff.post('/api/v1/operations').send({ type: 'adjustment', product: f.steel, location: f.mainStore, countedQty: 1, reason: 'lost' }).expect(403);
    await f.staff.patch(`/api/v1/stock/${f.steel}`).send({ location: f.mainStore, countedQty: 1, reason: 'lost' }).expect(403);
    await f.staff.post('/api/v1/warehouses').send({ name: 'W', shortCode: 'W9' }).expect(403);
    await f.staff.get('/api/v1/users').expect(403);
  });

  it('managers manage catalog but not warehouses, locations or users', async () => {
    await f.manager.post('/api/v1/categories').send({ name: 'Metals' }).expect(201);
    await f.manager.post('/api/v1/contacts').send({ name: 'Vendor B', type: 'vendor' }).expect(201);
    await f.manager.post('/api/v1/reorder-rules').send({ product: f.steel, warehouse: f.warehouseId, minQty: 10, maxQty: 50 }).expect(201);
    await f.manager.post('/api/v1/warehouses').send({ name: 'W', shortCode: 'W9' }).expect(403);
    await f.manager.post('/api/v1/locations').send({ name: 'Rack C', shortCode: 'RackC', warehouse: f.warehouseId }).expect(403);
    await f.manager.get('/api/v1/users').expect(403);
  });

  it('admins manage warehouses (with auto-created locations) and users', async () => {
    const wh = await f.admin.post('/api/v1/warehouses').send({ name: 'Second', shortCode: 'wh2', address: 'Pune' }).expect(201);
    expect(wh.body.data.shortCode).toBe('WH2');
    const locs = await f.admin.get('/api/v1/locations').query({ warehouse: wh.body.data._id, type: 'all' }).expect(200);
    expect(locs.body.data.map((l: { fullName: string }) => l.fullName).sort()).toEqual(['Partners/Customer', 'Partners/Vendor', 'Virtual/Adjustment', 'WH2/Stock1']);
    await f.admin.post('/api/v1/warehouses').send({ name: 'Dup', shortCode: 'WH2' }).expect(409);

    const user = await f.admin.post('/api/v1/users').send({ loginId: 'newstaff', email: 'n@s.io', password: 'Str0ng@Pass', role: 'staff' }).expect(201);
    expect(user.body.data.role).toBe('staff');
    await f.admin.patch(`/api/v1/users/${user.body.data._id}`).send({ role: 'manager' }).expect(200);
  });

  it('never exposes password hashes', async () => {
    const res = await f.admin.get('/api/v1/users').expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
