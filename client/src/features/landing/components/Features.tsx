
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  BellRing,
  History,
  ShieldCheck,
  SlidersHorizontal,
  ArrowUpFromLine,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Sparkline } from '@/components/common/Sparkline';
import { cn } from '@/lib/utils';

import {
  fadeUp,
  Section,
  SectionHeader,
  stagger,
} from '@/features/landing/components/primitives';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  className?: string;
  visual?: ReactNode;
}

/* -------------------------------------------------------------------------- */
/*                              Live Inventory                                */
/* -------------------------------------------------------------------------- */

function LiveVisual() {
  return (
    <div
      className="
        mt-6
        flex
        items-end
        justify-between
        gap-4
        rounded-xl
        border
        bg-background/60
        p-4
        transition-colors
        duration-200
        group-hover:border-foreground/10
      "
      aria-hidden
    >
      <div className="min-w-0">
        <div className="caption-label">
          On hand · all locations
        </div>

        <div className="tabular mt-1 text-2xl font-semibold tracking-tight">
          12,480
        </div>

        <div className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-success">
          <span className="relative flex size-1.5">
            <span
              className="
                absolute
                inline-flex
                size-full
                animate-ping
                rounded-full
                bg-success
                opacity-60
                motion-reduce:hidden
              "
            />

            <span
              className="
                relative
                inline-flex
                size-1.5
                rounded-full
                bg-success
              "
            />
          </span>

          Updated just now
        </div>

        <div className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Warehouse className="size-3" aria-hidden />
          Across 2 warehouses, 6 locations
        </div>
      </div>

      <Sparkline
        data={[
          30,
          34,
          31,
          38,
          36,
          42,
          40,
          47,
          45,
          52,
          50,
          56,
        ]}
        width={160}
        height={48}
        className="hidden max-w-full xs:block"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Ledger Visual                                 */
/* -------------------------------------------------------------------------- */

function LedgerVisual() {
  const rows = [
    {
      ref: 'WH/IN/0007',
      qty: '+100',
      tone: 'text-success',
    },
    {
      ref: 'WH/INT/0003',
      qty: '±0',
      tone: 'text-muted-foreground',
    },
    {
      ref: 'WH/OUT/0004',
      qty: '−20',
      tone: 'text-destructive',
    },
  ];

  return (
    <ul
      className="
        mt-6
        divide-y
        rounded-xl
        border
        bg-background/60
        text-[12px]
        transition-colors
        duration-200
        group-hover:border-foreground/10
      "
      aria-hidden
    >
      {rows.map((row) => (
        <li
          key={row.ref}
          className="
            flex
            items-center
            justify-between
            px-3
            py-2
          "
        >
          <span className="font-mono text-primary">
            {row.ref}
          </span>

          <span
            className={cn(
              'tabular font-medium',
              row.tone,
            )}
          >
            {row.qty}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Roles Visual                                  */
/* -------------------------------------------------------------------------- */

function RolesVisual() {
  const roles = [
    {
      name: 'Admin',
      scope: 'Everything, incl. users & settings',
    },
    {
      name: 'Manager',
      scope: 'Operations, stock & reports',
    },
    {
      name: 'Staff',
      scope: 'Day-to-day receipts & picks',
    },
  ];

  return (
    <ul
      className="
        mt-6
        grid
        gap-2
        sm:grid-cols-3
        md:grid-cols-1
        lg:grid-cols-3
      "
      aria-hidden
    >
      {roles.map((role) => (
        <li
          key={role.name}
          className="
            rounded-xl
            border
            bg-background/60
            px-3
            py-2.5
            transition-colors
            duration-200
            group-hover:border-foreground/10
          "
        >
          <div className="text-[12.5px] font-medium">
            {role.name}
          </div>

          <div className="text-[11px] leading-4 text-muted-foreground">
            {role.scope}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Features                                    */
/* -------------------------------------------------------------------------- */

const FEATURES: Feature[] = [
  {
    title: 'Real-time inventory',
    description:
      'Every validated move updates stock instantly for everyone — no refresh, no end-of-day sync.',
    icon: Activity,
    tone: 'text-primary',
    className: 'md:col-span-2',
    visual: <LiveVisual />,
  },
  {
    title: 'Warehouse management',
    description:
      'Model warehouses, zones and racks, and see stock per location.',
    icon: Warehouse,
    tone: 'text-info',
  },
  {
    title: 'Receipt management',
    description:
      'Receive vendor goods against planned receipts and flag late arrivals.',
    icon: ArrowDownToLine,
    tone: 'text-success',
  },
  {
    title: 'Delivery management',
    description:
      'Pick, pack and ship customer orders with availability checked first.',
    icon: ArrowUpFromLine,
    tone: 'text-destructive',
  },
  {
    title: 'Internal transfers',
    description:
      'Move stock between locations or warehouses with a full audit trail.',
    icon: ArrowLeftRight,
    tone: 'text-info',
  },
  {
    title: 'Stock adjustments',
    description:
      'Reconcile physical counts; the difference is posted as its own move.',
    icon: SlidersHorizontal,
    tone: 'text-warning',
  },
  {
    title: 'Move history',
    description:
      'An append-only ledger of every quantity change — who, what, where and when.',
    icon: History,
    tone: 'text-primary',
    className: 'lg:col-span-2',
    visual: <LedgerVisual />,
  },
  {
    title: 'Low-stock alerts',
    description:
      'Reorder rules raise alerts before a product runs out.',
    icon: BellRing,
    tone: 'text-warning',
  },
  {
    title: 'Role-based access',
    description:
      'Admin, manager and staff roles decide who can view, validate and configure.',
    icon: ShieldCheck,
    tone: 'text-success',
    className: 'lg:col-span-2',
    visual: <RolesVisual />,
  },
];

/* -------------------------------------------------------------------------- */
/*                              Features Section                              */
/* -------------------------------------------------------------------------- */

export function Features() {
  return (
    <Section
      id="features"
      labelledBy="features-title"
    >
      <SectionHeader
        id="features-title"
        eyebrow="Features"
        title={
          <>
            Everything your stock room needs, nothing it
            doesn&apos;t.
          </>
        }
        description="From the loading dock to the ledger, StockSense covers the full inventory lifecycle."
      />

      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{
          once: true,
          amount: 0.1,
        }}
        variants={stagger(0.06)}
        className="
          mt-14
          grid
          gap-4
          md:grid-cols-2
          lg:grid-cols-3
        "
      >
        {FEATURES.map((feature) => (
          <motion.li
            key={feature.title}
            variants={fadeUp}
            className={cn(
              `
                group
                relative
                flex
                flex-col
                overflow-hidden
                rounded-2xl
                border
                bg-card
                p-6
                shadow-card
                transition-[transform,box-shadow,border-color]
                duration-panel
                ease-brand
                hover:-translate-y-1
                hover:border-foreground/15
                hover:shadow-lift
              `,
              feature.className,
            )}
          >
            {/* Subtle top accent on hover */}
            <span
              className="
                pointer-events-none
                absolute
                inset-x-0
                top-0
                h-0.5
                origin-left
                scale-x-0
                bg-primary
                transition-transform
                duration-200
                group-hover:scale-x-100
              "
              aria-hidden
            />

            <div className="relative flex flex-1 flex-col">
              {/* Icon */}
              <span
                className={cn(
                  `
                    flex
                    size-10
                    items-center
                    justify-center
                    rounded-xl
                    border
                    bg-muted/60
                    transition-transform
                    duration-200
                    group-hover:scale-105
                  `,
                  feature.tone,
                )}
              >
                <feature.icon
                  className="size-5"
                  aria-hidden
                />
              </span>

              {/* Title */}
              <h3 className="mt-5 text-base font-semibold tracking-tight">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>

              {/* Optional Visual */}
              {feature.visual && (
                <div className="mt-auto">
                  {feature.visual}
                </div>
              )}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
