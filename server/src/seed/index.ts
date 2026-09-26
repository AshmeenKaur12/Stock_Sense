/**
 * npm run seed — rebuilds the demo database from scratch (idempotent: it drops the
 * database first, so every run ends in the same state).
 *
 * All stock is created through the real stock engine (receipts, deliveries,
 * transfers, adjustments), so every quantity is backed by ledger rows. History is
 * then back-dated across the last 30 days so the dashboard charts look alive.
 *
 * Resulting dashboard (matches the mockup):
 *   Receipts   → 4 to receive · 1 late · 6 upcoming operations
 *   Deliveries → 4 to deliver · 1 late · 2 waiting · 6 upcoming operations
 *   Stock      → 4 low-stock and 2 out-of-stock products (by reorder rules)
 */
import mongoose, { Types } from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { Category } from '../models/Category';
import { Contact } from '../models/Contact';
import { Location } from '../models/Location';
import { Notification } from '../models/Notification';
import { Operation } from '../models/Operation';
import { Product } from '../models/Product';
import { ReorderRule } from '../models/ReorderRule';
import { StockMove } from '../models/StockMove';
import { StockQuant } from '../models/StockQuant';
import { User } from '../models/User';
import { hashPassword } from '../services/auth.service';
import * as ops from '../services/operation.service';
import { createLocation, createWarehouse } from '../services/warehouse.service';

const DAY = 86_400_000;

/** A moment `offset` days from today at a working-hours time. */
function at(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() + offset * DAY);
}

const log = (msg: string) => console.log(`  ${msg}`);

// ── Catalogue ──────────────────────────────────────────────────────────────

type Cat = 'Furniture' | 'Raw Materials' | 'Hardware' | 'Office Supplies' | 'Electronics' | 'Packaging';

interface ProductSeed {
  sku: string;
  name: string;
  cat: Cat;
  uom: string;
  cost: number;
  sale: number;
  /** Final total on hand after all seeded history. */
  target: number;
  /** Reorder rule (WH) — drives low/out-of-stock status. */
  rule?: [min: number, max: number];
}

const PRODUCTS: ProductSeed[] = [
  { sku: 'DESK001', name: 'Desk', cat: 'Furniture', uom: 'Units', cost: 3000, sale: 4500, target: 50, rule: [10, 80] },
  { sku: 'TBL001', name: 'Table', cat: 'Furniture', uom: 'Units', cost: 3000, sale: 4200, target: 50, rule: [10, 80] },
  { sku: 'CHR001', name: 'Chair', cat: 'Furniture', uom: 'Units', cost: 1500, sale: 2400, target: 120, rule: [20, 200] },
  { sku: 'CHR002', name: 'Office Chair', cat: 'Furniture', uom: 'Units', cost: 4200, sale: 6500, target: 35 },
  { sku: 'SHF001', name: 'Bookshelf', cat: 'Furniture', uom: 'Units', cost: 2800, sale: 4000, target: 18 },
  { sku: 'CAB001', name: 'Filing Cabinet', cat: 'Furniture', uom: 'Units', cost: 3600, sale: 5200, target: 12, rule: [15, 40] },
  { sku: 'STL001', name: 'Steel', cat: 'Raw Materials', uom: 'kg', cost: 80, sale: 110, target: 640, rule: [100, 1000] },
  { sku: 'ROD001', name: 'Steel Rods', cat: 'Raw Materials', uom: 'Units', cost: 450, sale: 620, target: 300 },
  { sku: 'ALU001', name: 'Aluminium Sheet', cat: 'Raw Materials', uom: 'kg', cost: 210, sale: 290, target: 180 },
  { sku: 'WOD001', name: 'Teak Plank', cat: 'Raw Materials', uom: 'Units', cost: 950, sale: 1300, target: 75 },
  { sku: 'PLY001', name: 'Plywood 18mm', cat: 'Raw Materials', uom: 'Units', cost: 1250, sale: 1650, target: 8, rule: [20, 120] },
  { sku: 'GLS001', name: 'Tempered Glass Panel', cat: 'Raw Materials', uom: 'Units', cost: 1800, sale: 2500, target: 0, rule: [5, 30] },
  { sku: 'BLT001', name: 'Bolts M8', cat: 'Hardware', uom: 'box', cost: 120, sale: 180, target: 400 },
  { sku: 'NUT001', name: 'Nuts M8', cat: 'Hardware', uom: 'box', cost: 90, sale: 140, target: 380 },
  { sku: 'SCR001', name: 'Wood Screws', cat: 'Hardware', uom: 'box', cost: 75, sale: 120, target: 260 },
  { sku: 'HNG001', name: 'Hinges', cat: 'Hardware', uom: 'pcs', cost: 45, sale: 80, target: 5, rule: [50, 300] },
  { sku: 'DRL001', name: 'Drawer Slides', cat: 'Hardware', uom: 'pcs', cost: 260, sale: 390, target: 140 },
  { sku: 'GLU001', name: 'Wood Glue', cat: 'Hardware', uom: 'L', cost: 320, sale: 450, target: 0, rule: [5, 40] },
  { sku: 'PPR001', name: 'A4 Paper', cat: 'Office Supplies', uom: 'box', cost: 240, sale: 330, target: 90 },
  { sku: 'PEN001', name: 'Ballpoint Pens', cat: 'Office Supplies', uom: 'box', cost: 150, sale: 220, target: 60 },
  { sku: 'STP001', name: 'Stapler', cat: 'Office Supplies', uom: 'Units', cost: 180, sale: 260, target: 25, rule: [10, 60] },
  { sku: 'ENV001', name: 'Envelopes', cat: 'Office Supplies', uom: 'pack', cost: 95, sale: 150, target: 110 },
  { sku: 'MON001', name: 'Monitor 24"', cat: 'Electronics', uom: 'Units', cost: 9800, sale: 12500, target: 22 },
  { sku: 'KBD001', name: 'Keyboard', cat: 'Electronics', uom: 'Units', cost: 1200, sale: 1750, target: 45 },
  { sku: 'MSE001', name: 'Mouse', cat: 'Electronics', uom: 'Units', cost: 650, sale: 990, target: 70 },
  { sku: 'LMP001', name: 'LED Desk Lamp', cat: 'Electronics', uom: 'Units', cost: 1100, sale: 1600, target: 3, rule: [10, 40] },
  { sku: 'BOX001', name: 'Carton Box (L)', cat: 'Packaging', uom: 'pcs', cost: 38, sale: 60, target: 900, rule: [200, 2000] },
  { sku: 'TPE001', name: 'Packing Tape', cat: 'Packaging', uom: 'pcs', cost: 55, sale: 85, target: 240 },
  { sku: 'BWR001', name: 'Bubble Wrap', cat: 'Packaging', uom: 'm', cost: 18, sale: 30, target: 500 },
  { sku: 'PLT001', name: 'Wooden Pallet', cat: 'Packaging', uom: 'Units', cost: 650, sale: 900, target: 40 },
];

const CATEGORIES: { name: Cat; description: string }[] = [
  { name: 'Furniture', description: 'Finished furniture for offices and homes' },
  { name: 'Raw Materials', description: 'Metals, timber and sheet goods' },
  { name: 'Hardware', description: 'Fasteners, fittings and consumables' },
  { name: 'Office Supplies', description: 'Stationery and desk accessories' },
  { name: 'Electronics', description: 'Peripherals and lighting' },
  { name: 'Packaging', description: 'Boxes, tape and protective material' },
];

const VENDORS = [
  { name: 'Gemini Furniture', email: 'sales@geminifurniture.in', phone: '+91 98200 11223', address: 'Plot 14, MIDC Andheri East, Mumbai' },
  { name: 'Tata Steel Distributors', email: 'orders@tsdist.in', phone: '+91 98300 44556', address: 'Salt Lake Sector V, Kolkata' },
  { name: 'Wood Corner', email: 'hello@woodcorner.in', phone: '+91 99000 77889', address: '22 Industrial Estate, Peenya, Bengaluru' },
  { name: 'Office Depot India', email: 'b2b@officedepot.in', phone: '+91 98110 33445', address: 'Okhla Phase II, New Delhi' },
  { name: 'Deco Addict', email: 'supply@decoaddict.in', phone: '+91 97400 66778', address: '5 Hitech City Road, Hyderabad' },
];
const VENDOR_FOR: Record<Cat, string> = {
  Furniture: 'Gemini Furniture',
  'Raw Materials': 'Tata Steel Distributors',
  Hardware: 'Wood Corner',
  Packaging: 'Wood Corner',
  'Office Supplies': 'Office Depot India',
  Electronics: 'Deco Addict',
};

const CUSTOMERS = [
  { name: 'Azure Interior', email: 'purchasing@azureinterior.in', phone: '+91 98450 12345', address: '4th Floor, Prestige Tower, MG Road, Bengaluru' },
  { name: 'Ready Mat', email: 'ops@readymat.in', phone: '+91 98670 23456', address: '17 Linking Road, Bandra West, Mumbai' },
  { name: 'Lumber Inc', email: 'buy@lumberinc.in', phone: '+91 99620 34567', address: 'Guindy Industrial Estate, Chennai' },
  { name: 'Brandon Freeman', email: 'brandon@freeman.design', phone: '+91 98860 45678', address: '9 Koregaon Park, Pune' },
  { name: 'Nimbus Retail', email: 'store@nimbusretail.in', phone: '+91 98990 56789', address: 'Sector 29, Gurugram' },
];

// ── Scripted history (chronological; offsets are days relative to today) ──

type Line = [sku: string, qty: number];
const DONE_DELIVERIES: { day: number; customer: string; lines: Line[] }[] = [
  { day: -25, customer: 'Azure Interior', lines: [['DESK001', 10], ['CHR001', 20]] },
  { day: -22, customer: 'Lumber Inc', lines: [['STL001', 150], ['ROD001', 40]] },
  { day: -19, customer: 'Ready Mat', lines: [['GLS001', 10]] },
  { day: -16, customer: 'Nimbus Retail', lines: [['MON001', 6], ['KBD001', 10], ['MSE001', 15]] },
  { day: -13, customer: 'Ready Mat', lines: [['BOX001', 200], ['TPE001', 40]] },
  { day: -10, customer: 'Lumber Inc', lines: [['GLU001', 8], ['BLT001', 60]] },
  { day: -6, customer: 'Brandon Freeman', lines: [['TBL001', 8], ['CHR002', 5]] },
  { day: -3, customer: 'Azure Interior', lines: [['PPR001', 30], ['PEN001', 20], ['LMP001', 9]] },
];
const LATER_RECEIPTS: { day: number; vendor: string; lines: Line[] }[] = [
  { day: -20, vendor: 'Tata Steel Distributors', lines: [['STL001', 300]] },
  { day: -12, vendor: 'Wood Corner', lines: [['BLT001', 100], ['NUT001', 80]] },
  { day: -5, vendor: 'Wood Corner', lines: [['BOX001', 400], ['BWR001', 200]] },
];
const DONE_TRANSFERS: { day: number; from: string; to: string; lines: Line[] }[] = [
  { day: -18, from: 'WH/Stock1', to: 'WH/RackA', lines: [['STL001', 120]] },
  { day: -14, from: 'WH/Stock1', to: 'WH2/Stock1', lines: [['ROD001', 80]] },
  { day: -8, from: 'WH/Stock1', to: 'WH/Stock2', lines: [['BOX001', 300]] },
];
const ADJUSTMENTS: { day: number; sku: string; delta: number; reason: 'damaged' | 'lost' | 'expired' | 'count_correction' }[] = [
  { day: -11, sku: 'STL001', delta: -3, reason: 'damaged' },
  { day: -7, sku: 'GLU001', delta: -4, reason: 'expired' },
  { day: -4, sku: 'HNG001', delta: -2, reason: 'lost' },
];

async function main() {
  console.log('\n🌱 Seeding StockSense…');
  await connectDB();
  const dbName = mongoose.connection.name;
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  log(`dropped and re-created database "${dbName}"`);

  // Users
  const [admin, manager, staff] = await User.create([
    { loginId: 'admin01', email: 'admin@stocksense.io', name: 'Aarav Mehta', role: 'admin', passwordHash: await hashPassword('Admin@1234') },
    { loginId: 'manager1', email: 'manager@stocksense.io', name: 'Priya Sharma', role: 'manager', passwordHash: await hashPassword('Manager@1234') },
    { loginId: 'staff01', email: 'staff@stocksense.io', name: 'Rohan Das', role: 'staff', passwordHash: await hashPassword('Staff@1234') },
  ]);
  const actors = [admin!, manager!, staff!].map((u) => ({ id: String(u._id), name: u.name }));
  const pickActor = (i: number) => actors[i % actors.length]!;
  log('users: admin01 / Admin@1234 · manager1 / Manager@1234 · staff01 / Staff@1234');

  // Warehouses & locations
  const wh = await createWarehouse({ name: 'Main Warehouse', shortCode: 'WH', address: 'Plot 42, KIADB Industrial Area, Bengaluru 562114' });
  await createWarehouse({ name: 'Warehouse 2', shortCode: 'WH2', address: 'Survey 118, Chakan MIDC, Pune 410501' });
  for (const [name, code] of [
    ['Stock 2', 'Stock2'],
    ['Rack A', 'RackA'],
    ['Rack B', 'RackB'],
    ['Production Floor', 'ProdFloor'],
  ] as const) {
    await createLocation({ name, shortCode: code, warehouse: String(wh._id) });
  }
  const locs = new Map((await Location.find({ type: 'internal' }).lean()).map((l) => [l.fullName, String(l._id)]));
  const stock1 = locs.get('WH/Stock1')!;
  log(`warehouses: WH (${[...locs.keys()].filter((k) => k.startsWith('WH/')).join(', ')}), WH2 (WH2/Stock1)`);

  // Categories, contacts, products
  const cats = new Map((await Category.create(CATEGORIES)).map((c) => [c.name as Cat, c._id]));
  const vendors = new Map((await Contact.create(VENDORS.map((v) => ({ ...v, type: 'vendor' })))).map((c) => [c.name, String(c._id)]));
  const customers = new Map((await Contact.create(CUSTOMERS.map((c) => ({ ...c, type: 'customer' })))).map((c) => [c.name, String(c._id)]));
  const products = new Map(
    (
      await Product.create(
        PRODUCTS.map((p) => ({ name: p.name, sku: p.sku, category: cats.get(p.cat), uom: p.uom, perUnitCost: p.cost, salePrice: p.sale })),
      )
    ).map((p) => [p.sku, String(p._id)]),
  );
  const pid = (sku: string) => products.get(sku)!;
  log(`${cats.size} categories · ${vendors.size} vendors · ${customers.size} customers · ${products.size} products`);

  // Back-dates an operation and its ledger rows (seed only — the API never edits moves).
  const backdate = async (id: string, day: number, hour = 11) => {
    const when = at(day, hour);
    await Operation.collection.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { scheduleDate: when, doneDate: when, createdAt: new Date(when.getTime() - 2 * 3_600_000), updatedAt: when } },
    );
    await StockMove.collection.updateMany({ operation: new Types.ObjectId(id) }, { $set: { date: when, createdAt: when } });
  };

  // Opening stock quantities so that, after the scripted history, totals equal `target`.
  const opening = new Map<string, number>(PRODUCTS.map((p) => [p.sku, p.target]));
  for (const d of DONE_DELIVERIES) for (const [sku, q] of d.lines) opening.set(sku, opening.get(sku)! + q);
  for (const r of LATER_RECEIPTS) for (const [sku, q] of r.lines) opening.set(sku, opening.get(sku)! - q);
  for (const a of ADJUSTMENTS) opening.set(a.sku, opening.get(a.sku)! - a.delta);

  let n = 0;
  const receiveDone = async (vendor: string, lines: Line[], day: number) => {
    const op = await ops.createOperation(
      { type: 'receipt', contact: vendors.get(vendor), destinationLocation: stock1, lines: lines.map(([sku, quantity]) => ({ product: pid(sku), quantity })) },
      pickActor(n++),
    );
    await ops.markTodo(String(op._id));
    await ops.validateOperation(String(op._id), pickActor(n));
    await backdate(String(op._id), day);
  };

  // 1) Opening receipts — one per vendor (day −29)
  const byVendor = new Map<string, Line[]>();
  for (const p of PRODUCTS) {
    const qty = opening.get(p.sku)!;
    if (qty <= 0) continue;
    const v = VENDOR_FOR[p.cat];
    byVendor.set(v, [...(byVendor.get(v) ?? []), [p.sku, qty]]);
  }
  for (const [vendor, lines] of byVendor) await receiveDone(vendor, lines, -29);

  // 2) Chronological history: deliveries, receipts, transfers, adjustments
  type Event = { day: number; run: () => Promise<void> };
  const events: Event[] = [
    ...DONE_DELIVERIES.map((d) => ({
      day: d.day,
      run: async () => {
        const op = await ops.createOperation(
          { type: 'delivery', contact: customers.get(d.customer), sourceLocation: stock1, lines: d.lines.map(([sku, quantity]) => ({ product: pid(sku), quantity })) },
          pickActor(n++),
        );
        const id = String(op._id);
        await ops.checkAvailability(id);
        await ops.setPicked(id, true);
        await ops.setPacked(id, true);
        await ops.validateOperation(id, pickActor(n));
        await backdate(id, d.day, 15);
      },
    })),
    ...LATER_RECEIPTS.map((r) => ({ day: r.day, run: () => receiveDone(r.vendor, r.lines, r.day) })),
    ...DONE_TRANSFERS.map((t) => ({
      day: t.day,
      run: async () => {
        const op = await ops.createOperation(
          { type: 'internal', sourceLocation: locs.get(t.from), destinationLocation: locs.get(t.to), lines: t.lines.map(([sku, quantity]) => ({ product: pid(sku), quantity })) },
          pickActor(n++),
        );
        await ops.markTodo(String(op._id));
        await ops.validateOperation(String(op._id), pickActor(n));
        await backdate(String(op._id), t.day, 13);
      },
    })),
    ...ADJUSTMENTS.map((a) => ({
      day: a.day,
      run: async () => {
        const q = await StockQuant.findOne({ product: pid(a.sku), location: stock1 }).lean();
        const { id } = await ops.applyAdjustment(
          { product: pid(a.sku), location: stock1, countedQty: (q?.onHand ?? 0) + a.delta, reason: a.reason, notes: 'Cycle count' },
          actors[1]!,
        );
        await backdate(id, a.day, 17);
      },
    })),
  ].sort((x, y) => x.day - y.day);
  for (const e of events) await e.run();

  // 3) Canceled operations
  const canceledReceipt = await ops.createOperation(
    { type: 'receipt', contact: vendors.get('Deco Addict'), destinationLocation: stock1, scheduleDate: at(-15), lines: [{ product: pid('MON001'), quantity: 10 }] },
    actors[1]!,
  );
  await ops.cancelOperation(String(canceledReceipt._id));
  const canceledDelivery = await ops.createOperation(
    { type: 'delivery', contact: customers.get('Nimbus Retail'), sourceLocation: stock1, scheduleDate: at(-9), lines: [{ product: pid('KBD001'), quantity: 4 }] },
    actors[2]!,
  );
  await ops.cancelOperation(String(canceledDelivery._id));

  // 4) Open receipts: 4 Ready (1 late, 1 today, 2 upcoming) + 4 Draft (upcoming)
  const openReceipt = async (vendor: string, day: number, lines: Line[], ready: boolean) => {
    const op = await ops.createOperation(
      { type: 'receipt', contact: vendors.get(vendor), destinationLocation: stock1, scheduleDate: at(day), lines: lines.map(([sku, quantity]) => ({ product: pid(sku), quantity })) },
      pickActor(n++),
    );
    if (ready) await ops.markTodo(String(op._id));
  };
  await openReceipt('Tata Steel Distributors', -3, [['STL001', 200]], true);
  await openReceipt('Tata Steel Distributors', 0, [['ROD001', 100]], true);
  await openReceipt('Wood Corner', 2, [['WOD001', 30]], true);
  await openReceipt('Tata Steel Distributors', 5, [['PLY001', 60], ['GLS001', 20]], true);
  await openReceipt('Wood Corner', 1, [['HNG001', 200], ['GLU001', 25]], false);
  await openReceipt('Gemini Furniture', 3, [['CAB001', 20], ['SHF001', 10]], false);
  await openReceipt('Deco Addict', 6, [['LMP001', 30], ['MON001', 8]], false);
  await openReceipt('Office Depot India', 8, [['PPR001', 50], ['STP001', 20]], false);

  // 5) Open deliveries: 4 Ready (1 late, 1 today, 2 upcoming), 2 Waiting, 2 Draft
  const openDelivery = async (customer: string, day: number, lines: Line[], mode: 'draft' | 'check' | 'picked') => {
    const op = await ops.createOperation(
      {
        type: 'delivery',
        contact: customers.get(customer),
        sourceLocation: stock1,
        scheduleDate: at(day, 14),
        lines: lines.map(([sku, quantity]) => ({ product: pid(sku), quantity })),
      },
      pickActor(n++),
    );
    const id = String(op._id);
    if (mode !== 'draft') await ops.checkAvailability(id);
    if (mode === 'picked') await ops.setPicked(id, true);
  };
  await openDelivery('Azure Interior', -2, [['DESK001', 5]], 'picked');
  await openDelivery('Ready Mat', 0, [['CHR001', 8]], 'check');
  await openDelivery('Nimbus Retail', 2, [['BOX001', 50]], 'check');
  await openDelivery('Brandon Freeman', 4, [['MON001', 2]], 'check');
  await openDelivery('Lumber Inc', 3, [['GLS001', 6]], 'check'); // → Waiting (out of stock)
  await openDelivery('Azure Interior', 5, [['GLU001', 10], ['SCR001', 20]], 'check'); // → Waiting (short line)
  await openDelivery('Ready Mat', 6, [['TBL001', 12]], 'draft');
  await openDelivery('Nimbus Retail', 7, [['KBD001', 6], ['MSE001', 6]], 'draft');

  // 6) Open transfers: 1 Ready (reserved), 1 Draft
  const ready = await ops.createOperation(
    { type: 'internal', sourceLocation: stock1, destinationLocation: locs.get('WH/RackB'), scheduleDate: at(1), lines: [{ product: pid('BLT001'), quantity: 50 }] },
    actors[2]!,
  );
  await ops.markTodo(String(ready._id));
  await ops.createOperation(
    { type: 'internal', sourceLocation: locs.get('WH/RackA'), destinationLocation: locs.get('WH/ProdFloor'), scheduleDate: at(2), lines: [{ product: pid('STL001'), quantity: 40 }] },
    actors[2]!,
  );

  // Reorder rules (after history so alerts reflect the final state)
  const rules = PRODUCTS.filter((p) => p.rule).map((p) => ({ product: pid(p.sku), warehouse: wh._id, minQty: p.rule![0], maxQty: p.rule![1] }));
  await ReorderRule.create(rules);

  // Let post-commit side effects (alerts, re-checks) settle, then raise low-stock alerts once.
  await new Promise((r) => setTimeout(r, 1500));
  const { checkStockAlerts } = await import('../services/alert.service');
  await checkStockAlerts(rules.map((r) => ({ product: r.product, warehouse: String(wh._id) })));
  const { checkLateOperations } = await import('../services/jobs.service');
  await checkLateOperations();

  const [opCount, moveCount, notifCount] = await Promise.all([Operation.countDocuments(), StockMove.countDocuments(), Notification.countDocuments()]);
  const summary = await import('../services/dashboard.service').then((m) => m.summary({}));
  log(`${opCount} operations · ${moveCount} ledger moves · ${notifCount} notifications · ${rules.length} reorder rules`);
  log(
    `dashboard → receipts ${summary.receipt.toReceive} to receive / ${summary.receipt.late} late / ${summary.receipt.operations} upcoming · ` +
      `deliveries ${summary.delivery.toDeliver} to deliver / ${summary.delivery.late} late / ${summary.delivery.waiting} waiting / ${summary.delivery.operations} upcoming`,
  );
  log(`stock → ${summary.kpis.lowStock} low · ${summary.kpis.outOfStock} out · value ₹${summary.kpis.stockValue.toLocaleString('en-IN')}`);

  await disconnectDB();
  console.log('✔ Seed complete\n');
}

main().catch(async (err) => {
  console.error('✖ Seed failed:', err instanceof Error ? err.message : err);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
