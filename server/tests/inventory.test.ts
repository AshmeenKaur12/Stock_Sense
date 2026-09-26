import { Operation } from '../src/models/Operation';
import { StockMove } from '../src/models/StockMove';
import { StockQuant } from '../src/models/StockQuant';
import { buildFixture, eventually, resetDb, startDb, stopDb, type Fixture } from './helpers';

let f: Fixture;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  f = await buildFixture();
});

const quant = async (location: string, product = f.steel) => (await StockQuant.findOne({ product, location }).lean()) ?? { onHand: 0, reserved: 0 };
const totalOnHand = async (product = f.steel) => (await StockQuant.find({ product }).lean()).reduce((s, q) => s + q.onHand, 0);

async function receive(qty: number, location = f.mainStore) {
  const created = await f.staff
    .post('/api/v1/operations')
    .send({ type: 'receipt', contact: f.vendor, destinationLocation: location, lines: [{ product: f.steel, quantity: qty }] })
    .expect(201);
  const id = created.body.data._id as string;
  await f.staff.post(`/api/v1/operations/${id}/todo`).expect(200);
  await f.staff.post(`/api/v1/operations/${id}/validate`).expect(200);
  return id;
}

async function draftDelivery(qty: number, source = f.mainStore) {
  const res = await f.staff
    .post('/api/v1/operations')
    .send({ type: 'delivery', contact: f.customer, sourceLocation: source, lines: [{ product: f.steel, quantity: qty }] })
    .expect(201);
  return res.body.data._id as string;
}

describe('acceptance flow: 100 → 100 → 80 → 77', () => {
  it('receive, transfer, deliver and adjust, with a matching ledger', async () => {
    // 1. Receive 100 kg Steel
    await receive(100);
    expect(await totalOnHand()).toBe(100);

    // 2. Internal transfer Main Store → Production Rack (total unchanged)
    const t = await f.staff
      .post('/api/v1/operations')
      .send({ type: 'internal', sourceLocation: f.mainStore, destinationLocation: f.prodRack, lines: [{ product: f.steel, quantity: 100 }] })
      .expect(201);
    expect(t.body.data.reference).toBe('WH/INT/0001');
    await f.staff.post(`/api/v1/operations/${t.body.data._id}/todo`).expect(200);
    await f.staff.post(`/api/v1/operations/${t.body.data._id}/validate`).expect(200);
    expect(await totalOnHand()).toBe(100);
    expect((await quant(f.prodRack)).onHand).toBe(100);
    expect((await quant(f.mainStore)).onHand).toBe(0);

    // 3. Deliver 20 from the Production Rack
    const d = await draftDelivery(20, f.prodRack);
    await f.staff.post(`/api/v1/operations/${d}/check-availability`).expect(200);
    await f.staff.post(`/api/v1/operations/${d}/pick`).expect(200);
    await f.staff.post(`/api/v1/operations/${d}/pack`).expect(200);
    await f.staff.post(`/api/v1/operations/${d}/validate`).expect(200);
    expect(await totalOnHand()).toBe(80);

    // 4. 3 kg damaged
    const adj = await f.manager
      .post('/api/v1/operations')
      .send({ type: 'adjustment', product: f.steel, location: f.prodRack, countedQty: 77, reason: 'damaged' })
      .expect(201);
    expect(adj.body.data.reference).toBe('WH/ADJ/0001');
    expect(adj.body.data.status).toBe('done');
    expect(await totalOnHand()).toBe(77);

    // 5. Move history: exactly 4 rows with correct from/to/qty
    const moves = await f.staff.get('/api/v1/moves').query({ product: f.steel, limit: 50 }).expect(200);
    const rows = [...moves.body.data].reverse() as { reference: string; from: string; to: string; quantity: number; signedQty: number; direction: string }[];
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => [r.reference, r.from, r.to, r.quantity, r.direction])).toEqual([
      ['WH/IN/0001', 'Partners/Vendor', 'WH/Stock1', 100, 'in'],
      ['WH/INT/0001', 'WH/Stock1', 'WH/ProdRack', 100, 'internal'],
      ['WH/OUT/0001', 'WH/ProdRack', 'Partners/Customer', 20, 'out'],
      ['WH/ADJ/0001', 'WH/ProdRack', 'Virtual/Adjustment', 3, 'adjust'],
    ]);
    expect(rows.map((r) => r.signedQty)).toEqual([100, 0, -20, -3]);
  });
});

describe('receipt workflow', () => {
  it('Draft → Ready → Done and auto-fills Responsible', async () => {
    const res = await f.staff.post('/api/v1/operations').send({ type: 'receipt', warehouse: f.warehouseId, lines: [{ product: f.steel, quantity: 5 }] }).expect(201);
    expect(res.body.data).toMatchObject({ reference: 'WH/IN/0001', status: 'draft' });
    expect(res.body.data.responsible.loginId).toBe('staff01');
    expect(res.body.data.destinationLocation.fullName).toBe('WH/Stock1');

    const id = res.body.data._id;
    // Validate straight from Draft is an invalid transition.
    await f.staff.post(`/api/v1/operations/${id}/validate`).expect(409);
    const ready = await f.staff.post(`/api/v1/operations/${id}/todo`).expect(200);
    expect(ready.body.data.status).toBe('ready');
    const done = await f.staff.post(`/api/v1/operations/${id}/validate`).expect(200);
    expect(done.body.data.status).toBe('done');
    expect(done.body.data.doneDate).toBeTruthy();
    expect((await quant(f.mainStore)).onHand).toBe(5);
  });

  it('locks Done operations', async () => {
    const id = await receive(10);
    await f.staff.patch(`/api/v1/operations/${id}`).send({ notes: 'late edit' }).expect(409);
    await f.staff.post(`/api/v1/operations/${id}/cancel`).expect(409);
    await f.staff.post(`/api/v1/operations/${id}/validate`).expect(409);
  });

  it('prints only when Done', async () => {
    const res = await f.staff.post('/api/v1/operations').send({ type: 'receipt', warehouse: f.warehouseId, lines: [{ product: f.steel, quantity: 5 }] });
    const id = res.body.data._id;
    await f.staff.get(`/api/v1/operations/${id}/print`).expect(409);
    await f.staff.post(`/api/v1/operations/${id}/todo`).expect(200);
    await f.staff.get(`/api/v1/operations/${id}/print`).expect(409);
    await f.staff.post(`/api/v1/operations/${id}/validate`).expect(200);
    const pdf = await f.staff.get(`/api/v1/operations/${id}/print`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('delivery workflow', () => {
  it('goes Waiting when short, marks the line, and auto-flips to Ready when stock arrives', async () => {
    await receive(3);
    const id = await draftDelivery(10);
    const check = await f.staff.post(`/api/v1/operations/${id}/check-availability`).expect(200);
    expect(check.body.data.status).toBe('waiting');
    expect(check.body.data.lines[0]).toMatchObject({ isShort: true, availableQty: 3 });
    expect((await quant(f.mainStore)).reserved).toBe(0);

    await receive(20);
    const flipped = await eventually(async () => {
      const op = await Operation.findById(id).lean();
      return op?.status === 'ready' ? op : null;
    });
    expect(flipped.lines[0]!.isShort).toBe(false);
    expect((await quant(f.mainStore)).reserved).toBe(10);
  });

  it('flips the oldest waiting delivery first when stock is limited', async () => {
    const older = await draftDelivery(5);
    const newer = await draftDelivery(5);
    await Operation.updateOne({ _id: older }, { $set: { scheduleDate: new Date(Date.now() - 86_400_000) } });
    await f.staff.post(`/api/v1/operations/${older}/check-availability`).expect(200);
    await f.staff.post(`/api/v1/operations/${newer}/check-availability`).expect(200);

    await receive(6);
    await eventually(async () => (await Operation.findById(older).lean())?.status === 'ready');
    await new Promise((r) => setTimeout(r, 200));
    expect((await Operation.findById(newer).lean())?.status).toBe('waiting');
  });

  it('blocks Validate until picked and packed, and pack requires pick', async () => {
    await receive(10);
    const id = await draftDelivery(4);
    await f.staff.post(`/api/v1/operations/${id}/check-availability`).expect(200);
    await f.staff.post(`/api/v1/operations/${id}/validate`).expect(409);
    await f.staff.post(`/api/v1/operations/${id}/pack`).expect(409);
    await f.staff.post(`/api/v1/operations/${id}/pick`).expect(200);
    const blocked = await f.staff.post(`/api/v1/operations/${id}/validate`).expect(409);
    expect(blocked.body.message).toMatch(/pick and pack/i);
    await f.staff.post(`/api/v1/operations/${id}/pack`).expect(200);
    await f.staff.post(`/api/v1/operations/${id}/validate`).expect(200);
    expect(await quant(f.mainStore)).toMatchObject({ onHand: 6, reserved: 0 });
  });

  it('cancel releases the reservation', async () => {
    await receive(10);
    const id = await draftDelivery(7);
    await f.staff.post(`/api/v1/operations/${id}/check-availability`).expect(200);
    expect((await quant(f.mainStore)).reserved).toBe(7);
    const res = await f.staff.post(`/api/v1/operations/${id}/cancel`).expect(200);
    expect(res.body.data.status).toBe('canceled');
    expect(await quant(f.mainStore)).toMatchObject({ onHand: 10, reserved: 0 });
  });

  it('never lets stock go negative, even if reservations are bypassed', async () => {
    await receive(5);
    const id = await draftDelivery(5);
    await f.staff.post(`/api/v1/operations/${id}/check-availability`).expect(200);
    await f.staff.post(`/api/v1/operations/${id}/pick`).expect(200);
    await f.staff.post(`/api/v1/operations/${id}/pack`).expect(200);
    // Simulate stock vanishing behind the engine's back.
    await StockQuant.updateOne({ product: f.steel, location: f.mainStore }, { $set: { onHand: 2 } });
    await f.staff.post(`/api/v1/operations/${id}/validate`).expect(409);
    // The failed transaction rolled back: no ledger row, operation still Ready.
    expect(await StockMove.countDocuments({ operation: id })).toBe(0);
    expect((await Operation.findById(id).lean())?.status).toBe('ready');
    expect((await quant(f.mainStore)).onHand).toBe(2);
  });
});

describe('internal transfers', () => {
  it('rejects the same From and To location', async () => {
    const res = await f.staff
      .post('/api/v1/operations')
      .send({ type: 'internal', sourceLocation: f.mainStore, destinationLocation: f.mainStore, lines: [{ product: f.steel, quantity: 1 }] });
    expect(res.status).toBe(422);
  });

  it('cannot move more than is free at the source', async () => {
    await receive(4);
    const t = await f.staff
      .post('/api/v1/operations')
      .send({ type: 'internal', sourceLocation: f.mainStore, destinationLocation: f.prodRack, lines: [{ product: f.steel, quantity: 9 }] })
      .expect(201);
    const res = await f.staff.post(`/api/v1/operations/${t.body.data._id}/todo`).expect(409);
    expect(res.body.message).toMatch(/Only 4 available/);
    expect(await quant(f.mainStore)).toMatchObject({ onHand: 4, reserved: 0 });
  });
});

describe('adjustments & stock page', () => {
  it('inline stock edit creates an adjustment and a ledger row', async () => {
    await receive(50);
    const res = await f.manager.patch(`/api/v1/stock/${f.steel}`).send({ location: f.mainStore, countedQty: 47, reason: 'damaged' }).expect(200);
    expect(res.body.data).toMatchObject({ recorded: 50, counted: 47, difference: -3 });
    expect((await quant(f.mainStore)).onHand).toBe(47);
    const move = await StockMove.findOne({ direction: 'adjust' }).lean();
    expect(move).toMatchObject({ quantity: 3, effect: -1, reason: 'damaged' });

    const stock = await f.staff.get('/api/v1/stock').query({ search: 'STL001' }).expect(200);
    expect(stock.body.data[0]).toMatchObject({ sku: 'STL001', onHand: 47, freeToUse: 47, status: 'in' });
  });

  it('rejects a count equal to the recorded quantity and counts below reserved', async () => {
    await receive(10);
    await f.manager.patch(`/api/v1/stock/${f.steel}`).send({ location: f.mainStore, countedQty: 10, reason: 'count_correction' }).expect(422);
    const d = await draftDelivery(8);
    await f.staff.post(`/api/v1/operations/${d}/check-availability`).expect(200);
    await f.manager.patch(`/api/v1/stock/${f.steel}`).send({ location: f.mainStore, countedQty: 5, reason: 'lost' }).expect(409);
  });

  it('product initial stock is recorded as an adjustment', async () => {
    const res = await f.manager
      .post('/api/v1/products')
      .send({ name: 'Desk', sku: 'desk001', uom: 'Units', perUnitCost: 3000, initialStock: { quantity: 50, location: f.mainStore } })
      .expect(201);
    expect(res.body.data.sku).toBe('DESK001');
    expect(res.body.data.displayName).toBe('[DESK001] Desk');
    const move = await StockMove.findOne({ product: res.body.data._id }).lean();
    expect(move).toMatchObject({ direction: 'adjust', quantity: 50, effect: 1, reason: 'initial_stock' });
    await f.manager.post('/api/v1/products').send({ name: 'Desk 2', sku: 'DESK001' }).expect(409);
  });
});

describe('references & concurrency', () => {
  it('20 concurrent receipts get unique, sequential references', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        f.staff.post('/api/v1/operations').send({ type: 'receipt', warehouse: f.warehouseId, lines: [{ product: f.steel, quantity: 1 }] }),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const refs = results.map((r) => r.body.data.reference as string).sort();
    expect(new Set(refs).size).toBe(20);
    expect(refs).toEqual(Array.from({ length: 20 }, (_, i) => `WH/IN/${String(i + 1).padStart(4, '0')}`));
  });

  it('kanban status changes follow the same rules', async () => {
    const res = await f.staff.post('/api/v1/operations').send({ type: 'receipt', warehouse: f.warehouseId, lines: [{ product: f.steel, quantity: 2 }] });
    const id = res.body.data._id;
    await f.staff.patch(`/api/v1/operations/${id}/status`).send({ status: 'done' }).expect(409);
    await f.staff.patch(`/api/v1/operations/${id}/status`).send({ status: 'ready' }).expect(200);
    await f.staff.patch(`/api/v1/operations/${id}/status`).send({ status: 'draft' }).expect(409);
    await f.staff.patch(`/api/v1/operations/${id}/status`).send({ status: 'done' }).expect(200);
  });
});

describe('ledger immutability', () => {
  it('rejects updates and deletes of stock moves', async () => {
    await receive(1);
    await expect(StockMove.updateOne({}, { $set: { quantity: 99 } })).rejects.toThrow(/append-only/);
    await expect(StockMove.deleteMany({})).rejects.toThrow(/append-only/);
  });
});
