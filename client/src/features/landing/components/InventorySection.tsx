import { motion } from 'framer-motion';
import { Gauge, History, MapPin, PackageCheck } from 'lucide-react';
import { StockStatusBadge } from '@/components/common/StatusBadge';
import { fadeUp, Reveal, Section, SectionHeader, stagger } from '@/features/landing/components/primitives';

const POINTS = [
  {
    icon: MapPin,
    title: 'Per-location stock',
    body: 'Quantities live on locations — warehouse, zone, rack — so you always know exactly where each unit sits.',
  },
  {
    icon: PackageCheck,
    title: 'Free to use vs on hand',
    body: 'On hand is what is physically there; free to use subtracts what is already reserved for outgoing operations.',
  },
  {
    icon: Gauge,
    title: 'Reorder rules',
    body: 'Set a minimum and maximum per product. Drop below the minimum and it is flagged as low stock.',
  },
  {
    icon: History,
    title: 'Append-only ledger',
    body: 'Every stock movement is recorded permanently — nothing can be edited or deleted, so the history always matches reality.',
  },
];
const LOCATIONS = [
  { location: 'WH/Stock/Rack A', onHand: 50, reserved: 20 },
  { location: 'WH/Stock/Rack B', onHand: 18, reserved: 0 },
  { location: 'WH2/Stock', onHand: 9, reserved: 6 },
];

const MIN = 20;
const MAX = 100;

export function InventorySection() {
  const totalOnHand = LOCATIONS.reduce((a, l) => a + l.onHand, 0);
  const totalFree = LOCATIONS.reduce((a, l) => a + l.onHand - l.reserved, 0);

  return (
    <Section id="inventory" labelledBy="inventory-title" className="border-y bg-muted/30">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeader
            id="inventory-title"
            align="left"
            eyebrow="Real-time inventory"
            title="Know what you have, and what you can promise."
            description="StockSense keeps a live quantity for every product in every location, derived from the move ledger rather than typed in by hand."
          />
          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger(0.08)}
            className="mt-8 space-y-5"
          >
            {POINTS.map((p) => (
              <motion.li key={p.title} variants={fadeUp} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-card">
                  <p.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <Reveal delay={0.1}>
          <figure className="overflow-hidden rounded-2xl border bg-card shadow-lift">
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
              <div>
                <div className="caption-label">Product</div>
                <div className="text-sm font-semibold">
                  Desk Combination <span className="font-mono text-caption font-normal text-muted-foreground">[FURN_7800]</span>
                </div>
              </div>
              <StockStatusBadge status="in" />
            </figcaption>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[340px] text-sm">
                <caption className="sr-only">Example stock per location for Desk Combination</caption>
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th scope="col" className="caption-label px-5 py-2 text-left">
                      Location
                    </th>
                    <th scope="col" className="caption-label px-3 py-2 text-right">
                      On hand
                    </th>
                    <th scope="col" className="caption-label px-5 py-2 text-right">
                      Free to use
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LOCATIONS.map((l) => (
                    <tr key={l.location} className="border-b last:border-0">
                      <th scope="row" className="px-5 py-2.5 text-left font-mono text-[12.5px] font-normal">
                        {l.location}
                      </th>
                      <td className="tabular px-3 py-2.5 text-right">{l.onHand}</td>
                      <td className="tabular px-5 py-2.5 text-right font-medium text-success">{l.onHand - l.reserved}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <th scope="row" className="px-5 py-2.5 text-left">
                      Total
                    </th>
                    <td className="tabular px-3 py-2.5 text-right">{totalOnHand}</td>
                    <td className="tabular px-5 py-2.5 text-right text-success">{totalFree}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="border-t px-5 py-4">
              <div className="flex items-center justify-between text-caption">
                <span className="font-medium">Reorder rule</span>
                <span className="tabular text-muted-foreground">
                  min {MIN} · max {MAX}
                </span>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-muted" aria-hidden>
                <div className="absolute inset-y-0 left-0 rounded-full bg-warning/30" style={{ width: `${(MIN / MAX) * 100}%` }} />
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(totalOnHand / MAX, 1) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                />
              </div>
              <p className="mt-2 text-caption text-muted-foreground">
                {totalOnHand} on hand — comfortably above the minimum of {MIN}.
              </p>
            </div>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}
