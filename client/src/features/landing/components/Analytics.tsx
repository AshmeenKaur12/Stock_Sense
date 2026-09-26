import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EASE,
  Reveal,
  Section,
  SectionHeader,
} from '@/features/landing/components/primitives';

const IN = [42, 55, 48, 62, 58, 70, 66, 74, 69, 80, 76, 88, 84, 92];
const OUT = [30, 38, 44, 40, 52, 49, 58, 55, 63, 60, 67, 64, 72, 70];

const W = 560;
const H = 180;
const MAX = 100;

function toPath(data: number[]) {
  const step = W / (data.length - 1);

  const pts = data.map(
    (value, index) =>
      [index * step, H - (value / MAX) * (H - 12)] as const,
  );

  const line = pts
    .map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return {
    line,
    area: `${line} L${W},${H} L0,${H} Z`,
  };
}

const CATEGORIES = [
  {
    name: 'Furniture',
    share: 42,
    stroke: 'stroke-primary',
    dot: 'bg-primary',
  },
  {
    name: 'Office supplies',
    share: 26,
    stroke: 'stroke-info',
    dot: 'bg-info',
  },
  {
    name: 'Storage',
    share: 18,
    stroke: 'stroke-success',
    dot: 'bg-success',
  },
  {
    name: 'Lighting',
    share: 14,
    stroke: 'stroke-warning',
    dot: 'bg-warning',
  },
];

function InOutChart() {
  const inP = toPath(IN);
  const outP = toPath(OUT);

  return (
    <figure className="min-w-0 rounded-2xl border bg-card p-5 shadow-card sm:p-6">
      <figcaption className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Stock moves</div>
          <div className="text-caption text-muted-foreground">
            Units in vs out · last 14 days (sample data)
          </div>
        </div>

        <div className="flex items-center gap-4 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            In
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-destructive" aria-hidden />
            Out
          </span>
        </div>
      </figcaption>

      <div className="relative mt-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-44 w-full overflow-visible sm:h-52"
          role="img"
          aria-label="Area chart: incoming units trend slightly above outgoing units over 14 days."
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              x2={W}
              y1={H * f}
              y2={H * f}
              className="stroke-border"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line
            x1={0}
            x2={W}
            y1={H}
            y2={H}
            className="stroke-border"
            vectorEffect="non-scaling-stroke"
          />

          <motion.path
            d={inP.area}
            className="fill-success/10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />

          <motion.path
            d={outP.area}
            className="fill-destructive/10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />

          <motion.path
            d={inP.line}
            fill="none"
            className="stroke-success"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: EASE }}
          />

          <motion.path
            d={outP.line}
            fill="none"
            className="stroke-destructive"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 1.2,
              ease: EASE,
              delay: 0.1,
            }}
          />
        </svg>

        <div
          className="mt-2 flex justify-between text-[11px] text-muted-foreground"
          aria-hidden
        >
          <span>14 days ago</span>
          <span>7 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </figure>
  );
}

function CategoryDonut() {
  const R = 40;
  let offset = 0;

  return (
    <figure className="min-w-0 rounded-2xl border bg-card p-5 shadow-card sm:p-6">
      <figcaption>
        <div className="text-sm font-semibold">Stock by category</div>
        <div className="text-caption text-muted-foreground">
          Share of on-hand units (sample data)
        </div>
      </figcaption>

      <div className="mt-6 flex flex-col items-center gap-6 xs:flex-row lg:flex-col xl:flex-row">
        <div className="relative size-40 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="size-full -rotate-90"
            aria-hidden
          >
            <circle
              cx={50}
              cy={50}
              r={R}
              fill="none"
              className="stroke-muted"
              strokeWidth={12}
            />

            {CATEGORIES.map((category) => {
              const start = offset;
              offset += category.share;

              return (
                <motion.circle
                  key={category.name}
                  cx={50}
                  cy={50}
                  r={R}
                  fill="none"
                  pathLength={100}
                  strokeWidth={12}
                  className={category.stroke}
                  strokeDashoffset={-start}
                  initial={{ strokeDasharray: '0 100' }}
                  whileInView={{
                    strokeDasharray: `${Math.max(
                      category.share - 1,
                      0,
                    )} ${100 - category.share + 1}`,
                  }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.9,
                    ease: EASE,
                    delay: 0.2,
                  }}
                />
              );
            })}
          </svg>

          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            aria-hidden
          >
            <span className="tabular text-2xl font-semibold tracking-tight">
              12,480
            </span>
            <span className="text-[11px] text-muted-foreground">
              units
            </span>
          </div>
        </div>

        <ul className="w-full space-y-2.5 text-sm">
          {CATEGORIES.map((category) => (
            <li
              key={category.name}
              className="flex items-center gap-2.5"
            >
              <span
                className={cn(
                  'size-2.5 shrink-0 rounded-sm',
                  category.dot,
                )}
                aria-hidden
              />

              <span className="min-w-0 flex-1 truncate">
                {category.name}
              </span>

              <span className="tabular font-medium text-muted-foreground">
                {category.share}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export function Analytics() {
  return (
    <Section id="analytics" labelledBy="analytics-title">
      <SectionHeader
        id="analytics-title"
        eyebrow="Analytics"
        title="See the trend, not just the total."
        description="Track what comes in and what goes out, spot which categories tie up your stock, and export any report to CSV or PDF."
      />

      <Reveal className="mx-auto mt-14 grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <InOutChart />
        <CategoryDonut />
      </Reveal>

      <p className="mt-6 flex items-center justify-center gap-2 text-caption text-muted-foreground">
        <Download className="size-3.5" aria-hidden />
        Every table and report exports to CSV and PDF.
      </p>
    </Section>
  );
}
