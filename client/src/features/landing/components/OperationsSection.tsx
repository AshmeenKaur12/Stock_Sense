import { motion, useInView } from 'framer-motion';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Check, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { EASE, fadeUp, Section, SectionHeader, stagger } from '@/features/landing/components/primitives';

const CHEVRON = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)';
const CHEVRON_FIRST = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';

/** Odoo-style chevron status bar; lights up step by step once in view. */
function ChevronStepper({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <ol ref={ref} aria-label={label} className="flex w-full">
      {steps.map((s, i) => {
        const reached = i <= current;
        const isCurrent = i === current;
        return (
          <li key={s} className={cn('relative min-w-0 flex-1', i > 0 && '-ml-1.5')} aria-current={isCurrent ? 'step' : undefined}>
            <div
              className="relative flex h-10 items-center justify-center overflow-hidden bg-border px-3 sm:px-4"
              style={{ clipPath: i === 0 ? CHEVRON_FIRST : CHEVRON }}
            >
              <div
                className="absolute inset-px flex items-center justify-center bg-card"
                style={{ clipPath: i === 0 ? CHEVRON_FIRST : CHEVRON }}
              />
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: inView && reached ? 1 : 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.35 }}
                className={cn('absolute inset-0', isCurrent ? 'bg-primary' : 'bg-primary/10')}
              />
              <span
                className={cn(
                  'relative z-10 flex min-w-0 items-center gap-1 pl-1 text-[11px] xs:text-[11.5px] font-medium sm:text-[13px]',
                  isCurrent ? 'text-primary-foreground' : reached ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {reached && !isCurrent && <Check className="hidden size-3.5 shrink-0 xs:block" aria-hidden />}
                <span className="truncate">{s}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface Workflow {
  title: string;
  icon: LucideIcon;
  tone: string;
  steps: string[];
  current: number;
  reference: string;
  body: string;
}

const WORKFLOWS: Workflow[] = [
  {
    title: 'Receipts',
    icon: ArrowDownToLine,
    tone: 'text-success',
    steps: ['Draft', 'Ready', 'Done'],
    current: 1,
    reference: 'WH/IN/0001',
    body: 'Plan an incoming shipment as a draft, mark it ready when it is expected, and validate on arrival to add stock.',
  },
  {
    title: 'Deliveries',
    icon: ArrowUpFromLine,
    tone: 'text-destructive',
    steps: ['Draft', 'Waiting', 'Ready', 'Done'],
    current: 2,
    reference: 'WH/OUT/0002',
    body: 'A delivery waits until enough stock is free to use, becomes ready once reserved, and deducts stock when done.',
  },
  {
    title: 'Internal transfers',
    icon: ArrowLeftRight,
    tone: 'text-info',
    steps: ['Draft', 'Ready', 'Done'],
    current: 2,
    reference: 'WH/INT/0003',
    body: 'Move stock between racks or warehouses. The total never changes — only where it lives.',
  },
];

export function OperationsSection() {
  return (
    <Section id="operations" labelledBy="operations-title">
      <SectionHeader
        id="operations-title"
        eyebrow="Operations"
        title="Clear workflows, from draft to done."
        description="Every operation moves through explicit states. Stock only changes when an operation is validated — and each validation runs as a single transaction."
      />

      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger(0.08)}
        className="mx-auto mt-14 grid max-w-5xl gap-4"
      >
        {WORKFLOWS.map((w) => (
          <motion.li
            key={w.title}
            variants={fadeUp}
            className="grid gap-5 rounded-2xl border bg-card p-5 shadow-card sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center lg:gap-10"
          >
            <div className="flex gap-4">
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/60', w.tone)}>
                <w.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight">{w.title}</h3>
                  <span className="font-mono text-caption text-primary">{w.reference}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
              </div>
            </div>
            <ChevronStepper steps={w.steps} current={w.current} label={`${w.title} workflow: ${w.steps.join(', then ')}`} />
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
