import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Warehouse as WarehouseIcon } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Skeleton } from '@/components/ui/skeleton';
import { greeting } from '@/lib/format';
import type { DashboardSummary, Warehouse } from '@/lib/types';

import { fadeUp } from './primitives';

const ALL = '__all__';

interface DashboardHeroProps {
  firstName?: string;
  summary?: DashboardSummary;
  summaryLoading: boolean;
  warehouses: Warehouse[];
  warehousesLoading: boolean;
  warehouse: string;
  onWarehouseChange: (id: string) => void;
}

/* -------------------------------------------------------------------------- */
/*                              Context Summary                               */
/* -------------------------------------------------------------------------- */

function ContextLine({ summary }: { summary: DashboardSummary }) {
  const attention = summary.kpis.lowStock + summary.kpis.outOfStock;
  const late = summary.receipt.late + summary.delivery.late;

  const parts = [
    `${summary.receipt.toReceive} receipt${
      summary.receipt.toReceive === 1 ? '' : 's'
    } ready`,

    `${summary.delivery.toDeliver} deliver${
      summary.delivery.toDeliver === 1 ? 'y' : 'ies'
    } ready`,

    late > 0 ? `${late} running late` : 'nothing late',

    attention > 0
      ? `${attention} product${
          attention === 1 ? '' : 's'
        } need restocking`
      : 'stock levels healthy',
  ];

  return <>{parts.join(' · ')}</>;
}

/* -------------------------------------------------------------------------- */
/*                              Dashboard Hero                                */
/* -------------------------------------------------------------------------- */

export function DashboardHero({
  firstName,
  summary,
  summaryLoading,
  warehouses,
  warehousesLoading,
  warehouse,
  onWarehouseChange,
}: DashboardHeroProps) {
  const active = warehouses.find((w) => w._id === warehouse);

  return (
    <motion.div
      variants={fadeUp}
      className="
        relative
        -mx-4
        -mt-6
        overflow-hidden
        px-4
        pb-2
        pt-6
        sm:-mx-6
        sm:px-6
        lg:-mx-8
        lg:-mt-8
        lg:px-8
        lg:pt-10
      "
    >
      {/* ------------------------------------------------------------------ */}
      {/* Background                                                          */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="bg-grid mask-fade-b pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      />

      <div
        className="
          pointer-events-none
          absolute
          -top-32
          left-1/2
          -z-10
          h-72
          w-[min(720px,100%)]
          -translate-x-1/2
          rounded-full
          bg-brand-gradient
          opacity-[0.13]
          blur-3xl
        "
        aria-hidden
      />

      {/* ------------------------------------------------------------------ */}
      {/* Main Hero Content                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="
          flex
          flex-col
          gap-5
          md:flex-row
          md:items-end
          md:justify-between
        "
      >
        {/* ---------------------------------------------------------------- */}
        {/* Greeting / Summary                                                */}
        {/* ---------------------------------------------------------------- */}

        <div className="min-w-0 space-y-2">
          {/* Dashboard Label */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="caption-label">
              Dashboard
            </span>

            {/* Live Indicator */}
            <span
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-success/25
                bg-success/10
                px-2
                py-0.5
                text-[11px]
                font-medium
                text-success
              "
            >
              <span
                className="relative flex size-1.5"
                aria-hidden
              >
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

              Live
            </span>

            {/* Current Date */}
            <span className="text-caption text-muted-foreground">
              {format(new Date(), 'EEEE, d MMMM')}
            </span>
          </div>

          {/* Greeting */}
          <h1 className="text-h1 sm:text-[30px] sm:leading-9">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>

          {/* Summary */}
          <div className="max-w-2xl text-sm text-muted-foreground">
            {summaryLoading && !summary ? (
              <Skeleton
                className="
                  inline-block
                  h-4
                  w-72
                  max-w-full
                  align-middle
                "
              />
            ) : summary ? (
              <>
                {active ? (
                  <span className="font-medium text-foreground/80">
                    {active.name}:{' '}
                  </span>
                ) : (
                  'Across all warehouses: '
                )}

                <ContextLine summary={summary} />.
              </>
            ) : (
              'A live pulse of stock levels and operations across every warehouse.'
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Warehouse Selector                                                */}
        {/* ---------------------------------------------------------------- */}

        <div
          className="
            w-full
            shrink-0
            md:w-72
          "
        >
          <div
            className="
              rounded-xl
              border
              border-border
              bg-card/70
              p-3
              shadow-sm
              backdrop-blur
            "
          >
            {/* Selector Header */}
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="dashboard-warehouse"
                className="caption-label"
              >
                Warehouse
              </label>

              {active && (
                <span
                  className="
                    rounded-full
                    bg-primary/10
                    px-2
                    py-0.5
                    text-[10px]
                    font-medium
                    text-primary
                  "
                >
                  Active
                </span>
              )}
            </div>

            {/* Warehouse Select */}
            <Select
              value={warehouse || ALL}
              onValueChange={(value) =>
                onWarehouseChange(
                  value === ALL ? '' : value,
                )
              }
              disabled={warehousesLoading}
            >
              <SelectTrigger
                id="dashboard-warehouse"
                className="
                  h-10
                  w-full
                  border-border
                  bg-background/80
                  backdrop-blur
                  transition-colors
                  hover:bg-accent/40
                "
              >
                <span className="flex min-w-0 items-center gap-2">
                  <WarehouseIcon
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />

                  <SelectValue placeholder="All warehouses" />
                </span>
              </SelectTrigger>

              <SelectContent>
                {/* All Warehouses */}
                <SelectItem value={ALL}>
                  All warehouses
                </SelectItem>

                {warehouses.length > 0 && (
                  <SelectSeparator />
                )}

                {/* Individual Warehouses */}
                {warehouses.map((warehouseItem) => (
                  <SelectItem
                    key={warehouseItem._id}
                    value={warehouseItem._id}
                  >
                    <span className="flex items-center">
                      {warehouseItem.name}

                      <span
                        className="
                          ml-1
                          font-mono
                          text-[11px]
                          text-muted-foreground
                        "
                      >
                        {warehouseItem.shortCode}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Small Context Hint */}
            <p className="mt-2 text-[11px] text-muted-foreground">
              View dashboard activity for the selected warehouse.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
