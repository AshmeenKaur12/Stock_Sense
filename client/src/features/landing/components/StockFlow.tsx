import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpFromLine, Factory, Store, Warehouse, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const NODES: { label: string; sub: string; icon: LucideIcon; tone: string }[] = [
  { label: 'Vendor', sub: 'Azure Interior', icon: Factory, tone: 'text-muted-foreground' },
  { label: 'WH/Stock1', sub: 'Main warehouse', icon: Warehouse, tone: 'text-primary' },
  { label: 'Customer', sub: 'Deco Addict', icon: Store, tone: 'text-muted-foreground' },
];

const PACKETS = [0, 1, 2];
const DURATION = 2.8;

/** One track between two nodes with small product "packets" travelling along it. */
function Track({ tone, offset, reduce }: { tone: string; offset: number; reduce: boolean }) {
  return (
    <div className="relative mx-1 h-px flex-1 self-center bg-border sm:mx-2">
      <div className="absolute inset-0 border-t border-dashed border-foreground/15" />
      {reduce
        ? [30, 65].map((p) => (
            <span key={p} className={cn('absolute top-1/2 size-2 -translate-y-1/2 rounded-[3px]', tone)} style={{ left: `${p}%` }} />
          ))
        : PACKETS.map((i) => (
            <motion.span
              key={i}
              className={cn('absolute top-1/2 -mt-1 size-2 rounded-[3px] shadow-sm', tone)}
              initial={{ left: '0%', opacity: 0 }}
              animate={{ left: ['0%', '92%'], opacity: [0, 1, 1, 0] }}
              transition={{
                duration: DURATION,
                ease: 'linear',
                repeat: Infinity,
                delay: offset + (i * DURATION) / PACKETS.length,
                opacity: { duration: DURATION, times: [0, 0.12, 0.85, 1], repeat: Infinity, delay: offset + (i * DURATION) / PACKETS.length },
              }}
            />
          ))}
    </div>
  );
}

/** Looping illustration of stock moving Vendor → WH/Stock1 → Customer. Static under reduced motion. */
export function StockFlow({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <figure className={cn('rounded-2xl border bg-card/90 p-4 shadow-lift backdrop-blur-md sm:p-5', className)}>
      <figcaption className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium">Live stock flow</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          Syncing
        </span>
      </figcaption>

      <div className="mt-4 flex items-start" aria-hidden>
        {NODES.map((n, i) => (
          <div key={n.label} className={cn('flex items-start', i < NODES.length - 1 && 'flex-1')}>
            <div className="flex w-14 flex-col items-center text-center xs:w-16 sm:w-20">
              <span className={cn('flex size-10 items-center justify-center rounded-xl border bg-background shadow-card', n.tone)}>
                <n.icon className="size-[18px]" />
              </span>
              <span className="mt-2 w-full truncate font-mono text-[10.5px] font-medium sm:text-[11px]">{n.label}</span>
              <span className="w-full truncate text-[10px] text-muted-foreground">{n.sub}</span>
            </div>
            {i < NODES.length - 1 && (
              <div className="flex h-10 flex-1">
                <Track tone={i === 0 ? 'bg-success' : 'bg-destructive'} offset={i * 0.6} reduce={reduce} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2">
          <ArrowDownToLine className="size-3.5 shrink-0 text-success" aria-hidden />
          <span className="truncate font-mono text-primary">WH/IN/0007</span>
          <span className="tabular ml-auto font-medium text-success">+100</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2">
          <ArrowUpFromLine className="size-3.5 shrink-0 text-destructive" aria-hidden />
          <span className="truncate font-mono text-primary">WH/OUT/0004</span>
          <span className="tabular ml-auto font-medium text-destructive">−20</span>
        </div>
      </div>
      <p className="sr-only">Illustration: products are received from a vendor into WH/Stock1 and delivered on to a customer.</p>
    </figure>
  );
}
