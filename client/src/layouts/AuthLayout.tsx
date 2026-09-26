import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, Boxes, Check, Quote, TriangleAlert, Truck } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { Sparkline } from '@/components/common/Sparkline';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const BLOBS = [
  { className: 'left-[-10%] top-[-10%] size-[55%] bg-[#6366F1]', x: [0, 60, -20, 0], y: [0, 40, 80, 0] },
  { className: 'right-[-15%] top-[10%] size-[50%] bg-[#8B5CF6]', x: [0, -50, 20, 0], y: [0, 60, -30, 0] },
  { className: 'bottom-[-20%] left-[15%] size-[60%] bg-[#0EA5E9]', x: [0, 40, -40, 0], y: [0, -50, 10, 0] },
  { className: 'bottom-[-10%] right-[-5%] size-[40%] bg-[#EC4899]', x: [0, -30, 30, 0], y: [0, -20, 40, 0] },
];

function GradientMesh() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b0b14]" aria-hidden>
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full opacity-50 blur-[90px] ${b.className}`}
          animate={reduce ? undefined : { x: b.x, y: b.y }}
          transition={{ duration: 18 + i * 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="absolute inset-0 mask-radial"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="bg-noise absolute inset-0 opacity-[0.08] mix-blend-overlay" />
    </div>
  );
}

const PREVIEW_ROWS = [
  { ref: 'WH/IN/0001', partner: 'Azure Interior', status: 'ready' as const },
  { ref: 'WH/OUT/0002', partner: 'Nimbus Retail', status: 'waiting' as const },
  { ref: 'WH/INT/0003', partner: 'Stock1 → ProdFloor', status: 'done' as const },
];

const FEATURES = [
  'Receipts, deliveries, transfers and adjustments in one flow',
  'Transactional stock ledger — never negative, always auditable',
  'Live low-stock alerts across every warehouse and rack',
];

/** A static, stylised glimpse of the product for the marketing panel. */
function ProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 8, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotateX: 4, rotate: -2 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="dark w-full max-w-[520px] rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-foreground shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      style={{ transformPerspective: 1200 }}
    >
      <div className="mb-4 flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 h-5 flex-1 rounded-md bg-white/5" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'In stock', value: '12,480', icon: Boxes, tone: 'text-primary', data: [4, 6, 5, 8, 7, 9, 11] },
          { label: 'Receipts', value: '18', icon: ArrowDownToLine, tone: 'text-success', data: [3, 2, 4, 3, 5, 6, 5] },
          { label: 'Low stock', value: '7', icon: TriangleAlert, tone: 'text-warning', data: [9, 8, 8, 6, 7, 5, 4] },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <k.icon className={`size-4 ${k.tone}`} />
              <Sparkline data={k.data} width={52} height={20} colorClassName={k.tone} />
            </div>
            <div className="mt-3 text-[10.5px] text-zinc-400">{k.label}</div>
            <div className="tabular text-lg font-semibold tracking-tight text-white">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-[11px] font-medium text-zinc-400">
          <Truck className="size-3.5" /> Recent operations
        </div>
        {PREVIEW_ROWS.map((r) => (
          <div key={r.ref} className="flex items-center justify-between px-3 py-2 text-[12px] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-white/[0.04]">
            <span className="font-mono text-indigo-300">{r.ref}</span>
            <span className="hidden truncate px-3 text-zinc-400 sm:block">{r.partner}</span>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring" aria-label="StockSense home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[400px] rounded-2xl border bg-card p-6 shadow-card sm:p-8"
          >
            <Outlet />
          </motion.div>
        </div>
        <p className="text-center text-caption text-muted-foreground">© {new Date().getFullYear()} StockSense · Inventory, in real time.</p>
      </div>

      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-10 lg:p-12" aria-hidden>
        <GradientMesh />
        <div className="relative z-10 flex w-full flex-col items-center gap-10">
          <ProductPreview />
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
            className="w-full max-w-[520px] space-y-2.5"
          >
            {FEATURES.map((f) => (
              <motion.li
                key={f}
                variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                className="flex items-center gap-3 text-[13.5px] text-white/85"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Check className="size-3 text-emerald-300" />
                </span>
                {f}
              </motion.li>
            ))}
          </motion.ul>
          <motion.figure
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
            className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-white backdrop-blur-md"
          >
            <Quote className="size-5 text-white/40" />
            <blockquote className="mt-2 text-[15px] leading-relaxed text-white/90">
              We replaced four spreadsheets and a paper register in a week. Every receipt, transfer and count now lands in one ledger our
              whole floor trusts.
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-semibold">
                PK
              </span>
              <span>
                <span className="block text-[13px] font-medium">Priya Kapoor</span>
                <span className="block text-caption text-white/60">Head of Operations, Meridian Fabrication</span>
              </span>
            </figcaption>
          </motion.figure>
        </div>
      </aside>
    </div>
  );
}
