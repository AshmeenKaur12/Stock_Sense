import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { fadeUp, stagger } from '@/features/landing/components/primitives';

const STATS = [
  { value: 4, prefix: '', suffix: '', label: 'operation types', detail: 'Receipts, deliveries, transfers and adjustments' },
  { value: 100, prefix: '', suffix: '%', label: 'ledger-backed moves', detail: 'Every quantity change is an auditable move' },
  { value: 1, prefix: '< ', suffix: 's', label: 'live updates', detail: 'Validated moves appear for everyone instantly' },
  { value: 3, prefix: '', suffix: '', label: 'roles', detail: 'Admin, manager and staff permissions' },
];

function Stat({ stat, run }: { stat: (typeof STATS)[number]; run: boolean }) {
  const n = useCountUp(run ? stat.value : 0, 1.2);
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-1 bg-card px-5 py-6 sm:px-6">
      <dt className="order-2 text-sm font-medium">{stat.label}</dt>
      <dd className="tabular order-1 text-4xl font-semibold tracking-tight sm:text-5xl">
        <span className="sr-only">
          {stat.prefix}
          {stat.value}
          {stat.suffix}
        </span>
        <span aria-hidden>
          {stat.prefix}
          {Math.round(n)}
          {stat.suffix}
        </span>
      </dd>
      <dd className="order-3 text-caption text-muted-foreground">{stat.detail}</dd>
    </motion.div>
  );
}

/** Honest, product-capability numbers with count-up on first view. */
export function Stats() {
  const ref = useRef<HTMLDListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <motion.dl
      ref={ref}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={stagger(0.08)}
      className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border shadow-card xs:grid-cols-2 lg:grid-cols-4"
    >
      {STATS.map((s) => (
        <Stat key={s.label} stat={s} run={inView} />
      ))}
    </motion.dl>
  );
}
