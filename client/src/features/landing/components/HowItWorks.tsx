import { motion, useInView } from 'framer-motion';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, RotateCcw, SlidersHorizontal, Warehouse, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import { EASE, Section, SectionHeader } from '@/features/landing/components/primitives';

interface FlowStep {
  title: string;
  description: string;
  icon: LucideIcon;
  reference: string;
  delta: number;
  stock: number;
}

const STEPS: FlowStep[] = [
  { title: 'Receive', description: 'Validate a vendor receipt.', icon: ArrowDownToLine, reference: 'WH/IN/0007', delta: 100, stock: 100 },
  { title: 'Store', description: 'Put it away in WH/Stock1.', icon: Warehouse, reference: 'WH/Stock1', delta: 0, stock: 100 },
  { title: 'Transfer', description: 'Move to Rack A — total unchanged.', icon: ArrowLeftRight, reference: 'WH/INT/0003', delta: 0, stock: 100 },
  { title: 'Deliver', description: 'Ship 20 units to a customer.', icon: ArrowUpFromLine, reference: 'WH/OUT/0004', delta: -20, stock: 80 },
  { title: 'Adjust', description: 'Count finds 3 damaged units.', icon: SlidersHorizontal, reference: 'Inventory adjustment', delta: -3, stock: 77 },
];

const STEP_MS = 1400;

function formatDelta(d: number) {
  if (d > 0) return `+${d}`;
  if (d < 0) return `−${Math.abs(d)}`;
  return '±0';
}

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [active, setActive] = useState(-1);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers = STEPS.map((_, i) => window.setTimeout(() => setActive(i), 300 + i * STEP_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [inView, run]);

  const stock = useCountUp(active >= 0 ? STEPS[active].stock : 0, 0.8);
  const current = active >= 0 ? STEPS[active] : null;
  const done = active === STEPS.length - 1;

  const replay = () => {
    setActive(-1);
    setRun((r) => r + 1);
  };

  return (
    <Section id="how-it-works" labelledBy="how-title" className="border-y bg-muted/30">
      <SectionHeader
        id="how-title"
        eyebrow="How it works"
        title="One product, five moves, one trustworthy number."
        description="Follow 100 units of Desk Combination through StockSense. Each step is a validated operation; the on-hand quantity is always the sum of the ledger."
      />

      <div ref={ref} className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <ol className="relative grid gap-3 md:grid-cols-5 md:gap-3">
          {/* connector: vertical on mobile, horizontal on desktop */}
          <div className="absolute bottom-6 left-[27px] top-6 w-px bg-border md:hidden" aria-hidden />
          <div className="absolute left-[10%] right-[10%] top-[27px] hidden h-px bg-border md:block" aria-hidden>
            <motion.div
              className="h-full origin-left bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: active < 0 ? 0 : active / (STEPS.length - 1) }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>

          {STEPS.map((s, i) => {
            const reached = i <= active;
            const isActive = i === active;
            return (
              <li key={s.title} className="relative flex gap-4 md:flex-col md:items-center md:gap-3 md:text-center" aria-current={isActive ? 'step' : undefined}>
                <span
                  className={cn(
                    'relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-card shadow-card transition-colors duration-panel ease-brand',
                    reached ? 'border-primary/40 text-primary' : 'text-muted-foreground',
                    isActive && 'ring-4 ring-primary/15',
                  )}
                >
                  <s.icon className="size-5" aria-hidden />
                  <span className="tabular absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-[10px] font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0 pt-1 md:pt-0">
                  <h3 className={cn('text-sm font-semibold transition-colors', reached ? 'text-foreground' : 'text-muted-foreground')}>{s.title}</h3>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{s.description}</p>
                  <span
                    className={cn(
                      'tabular mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                      s.delta > 0 ? 'bg-success/10 text-success' : s.delta < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {formatDelta(s.delta)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border bg-card p-6 shadow-lift">
          <div className="flex items-center justify-between gap-2">
            <span className="caption-label">On hand · Desk Combination</span>
            <Button variant="ghost" size="icon-sm" onClick={replay} disabled={!done} aria-label="Replay stock flow demo">
              <RotateCcw aria-hidden />
            </Button>
          </div>
          <div className="tabular mt-2 text-6xl font-semibold tracking-tight" aria-hidden>
            {Math.round(stock)}
          </div>
          <p className="sr-only" aria-live="polite">
            {current ? `${current.title}: ${formatDelta(current.delta)}, on hand ${current.stock} units.` : ''}
          </p>
          <div className="mt-2 h-5 text-[13px] text-muted-foreground" aria-hidden>
            {current ? (
              <motion.span key={active} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="inline-flex gap-2">
                <span className="font-mono text-primary">{current.reference}</span>
                <span className="tabular">{formatDelta(current.delta)}</span>
              </motion.span>
            ) : (
              'Waiting for the first receipt…'
            )}
          </div>
          <div className="mt-5 flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground" aria-hidden>
            {[100, 100, 80, 77].map((v, i) => {
              const reachedIdx = [0, 2, 3, 4][i];
              return (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-border">→</span>}
                  <span className={cn('tabular', active >= reachedIdx && 'font-semibold text-foreground')}>{v}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
