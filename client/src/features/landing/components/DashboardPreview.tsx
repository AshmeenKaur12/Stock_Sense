import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Bell, Boxes, MoreHorizontal, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { LogoMark } from '@/components/common/Logo';
import { Sparkline } from '@/components/common/Sparkline';
import { StatusBadge, type OperationStatus } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';
import { EASE } from '@/features/landing/components/primitives';

const NAV = ['Dashboard', 'Operations', 'Stock', 'Move History', 'Settings'] as const;

const KPIS: { label: string; value: string; delta: string; icon: LucideIcon; tone: string; data: number[] }[] = [
  { label: 'Products in stock', value: '1,284', delta: '+4.2%', icon: Boxes, tone: 'text-primary', data: [8, 9, 8, 11, 10, 12, 13, 12, 15] },
  { label: 'Low / out of stock', value: '7', delta: '−2', icon: TriangleAlert, tone: 'text-warning', data: [11, 10, 12, 9, 9, 8, 8, 7, 7] },
  { label: 'Pending receipts', value: '4', delta: '1 late', icon: ArrowDownToLine, tone: 'text-success', data: [3, 5, 4, 6, 5, 4, 6, 5, 4] },
  { label: 'Transfers scheduled', value: '3', delta: 'today', icon: ArrowLeftRight, tone: 'text-info', data: [1, 2, 2, 3, 2, 4, 3, 3, 3] },
];

const ROWS: { ref: string; contact: string; date: string; route: string; status: OperationStatus }[] = [
  { ref: 'WH/IN/0001', contact: 'Azure Interior', date: 'Today, 10:30', route: 'Vendors → WH/Stock', status: 'ready' },
  { ref: 'WH/OUT/0002', contact: 'Azure Interior', date: 'Today, 14:00', route: 'WH/Stock → Customers', status: 'waiting' },
  { ref: 'WH/IN/0003', contact: 'Gemini Furniture', date: 'Yesterday', route: 'Vendors → WH/Stock', status: 'done' },
  { ref: 'WH/INT/0004', contact: 'Internal', date: 'Tomorrow', route: 'WH/Stock → Rack A', status: 'draft' },
  { ref: 'WH/OUT/0005', contact: 'Deco Addict', date: 'Today, 16:15', route: 'WH/Stock → Customers', status: 'ready' },
];

export function OperationCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  action,
  stats,
  progress,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string;
  action: string;
  stats: { label: string; className?: string }[];
  progress: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn('flex size-9 items-center justify-center rounded-lg border bg-muted/60', tone)}>
            <Icon className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-[11.5px] text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground">
          {action}
        </span>
        <ul className="space-y-0.5 text-right text-[11.5px] leading-4">
          {stats.map((s) => (
            <li key={s.label} className={cn('tabular text-muted-foreground', s.className)}>
              {s.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/80" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/** A large, stylised (static) replica of the StockSense dashboard for the hero. */
export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.25'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [14, 4]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-6xl" style={{ perspective: 1600 }} aria-hidden>
      {/* glow */}
      <div className="pointer-events-none absolute inset-x-[10%] top-[15%] h-2/3 rounded-full bg-primary/15 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease: EASE }}
        style={reduce ? { rotateX: 4, transformOrigin: 'center top' } : { rotateX, scale, transformOrigin: 'center top' }}
        className="dark relative rounded-2xl border border-white/10 bg-zinc-950/80 p-1.5 text-foreground shadow-[0_40px_120px_-30px_rgba(24,24,60,0.55)] ring-1 ring-black/5 backdrop-blur-xl sm:p-2 dark:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-2.5 py-2">
          <span className="size-2.5 rounded-full bg-[#FF5F57]/80" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]/80" />
          <span className="size-2.5 rounded-full bg-[#28C840]/80" />
          <span className="mx-auto hidden h-5 w-64 items-center justify-center rounded-md bg-white/5 font-mono text-[10.5px] text-zinc-500 sm:flex">
            app.stocksense.io/dashboard
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-background">
          {/* app top nav */}
          <div className="flex h-12 items-center gap-3 border-b px-3 sm:px-4">
            <LogoMark className="size-6" pulse={false} />
            <nav className="flex min-w-0 items-center gap-0.5 overflow-hidden text-[12.5px]">
              {NAV.map((n, i) => (
                <span
                  key={n}
                  className={cn(
                    'whitespace-nowrap rounded-md px-2.5 py-1 text-muted-foreground',
                    i === 0 && 'bg-accent font-medium text-foreground',
                    i > 2 && 'hidden sm:inline',
                  )}
                >
                  {n}
                </span>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden h-7 w-44 items-center gap-2 rounded-md border bg-muted/50 px-2 text-[11.5px] text-muted-foreground lg:flex">
                <Search className="size-3.5" /> Search…
                <kbd className="ml-auto rounded border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
              </span>
              <Bell className="hidden size-4 text-muted-foreground xs:block" />
              <span className="flex size-7 items-center justify-center rounded-full border bg-muted text-[10.5px] font-semibold text-foreground">
                AK
              </span>
            </div>
          </div>

          <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="caption-label">Dashboard</div>
                <div className="text-lg font-semibold tracking-tight sm:text-xl">Good morning, Anjali</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                <span className="size-1.5 rounded-full bg-success" /> Live
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <OperationCard
                title="Receipt"
                subtitle="WH · Main warehouse"
                icon={ArrowDownToLine}
                tone="text-success"
                action="4 to receive"
                stats={[{ label: '1 Late', className: 'font-medium text-destructive' }, { label: '6 operations' }]}
                progress={66}
              />
              <OperationCard
                title="Delivery"
                subtitle="WH · Main warehouse"
                icon={ArrowUpFromLine}
                tone="text-destructive"
                action="4 to Deliver"
                stats={[
                  { label: '1 Late', className: 'font-medium text-destructive' },
                  { label: '2 waiting', className: 'text-warning' },
                  { label: '6 operations' },
                ]}
                progress={42}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {KPIS.map((k) => (
                <div key={k.label} className="rounded-xl border bg-card p-3 shadow-card sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <k.icon className={cn('size-4', k.tone)} />
                    <Sparkline data={k.data} width={64} height={22} colorClassName={k.tone} />
                  </div>
                  <div className="mt-3 truncate text-[11px] text-muted-foreground">{k.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="tabular text-xl font-semibold tracking-tight">{k.value}</span>
                    <span className="tabular truncate text-[10.5px] text-muted-foreground">{k.delta}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-[12.5px] font-medium">Operations</span>
                <span className="text-[11px] text-muted-foreground">6 of 12</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1.1fr)_auto] gap-x-3 border-b bg-muted/40 px-4 py-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_auto]">
                <span className="caption-label text-[10.5px]">Reference</span>
                <span className="caption-label hidden text-[10.5px] sm:block">Contact</span>
                <span className="caption-label hidden text-[10.5px] md:block">Route</span>
                <span className="caption-label hidden text-[10.5px] md:block">Scheduled</span>
                <span className="caption-label text-right text-[10.5px]">Status</span>
              </div>
              {ROWS.map((r) => (
                <div
                  key={r.ref}
                  className="grid grid-cols-[minmax(0,1.1fr)_auto] items-center gap-x-3 px-4 py-2.5 text-[12px] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_auto] [&:not(:last-child)]:border-b"
                >
                  <span className="truncate font-mono text-[11.5px] text-primary">{r.ref}</span>
                  <span className="hidden truncate sm:block">{r.contact}</span>
                  <span className="hidden truncate text-muted-foreground md:block">{r.route}</span>
                  <span className="tabular hidden truncate text-muted-foreground md:block">{r.date}</span>
                  <span className="flex justify-end">
                    <StatusBadge status={r.status} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* fade into the page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
