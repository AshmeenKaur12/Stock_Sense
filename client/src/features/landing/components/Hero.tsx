```tsx
import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { AuthActions } from '@/features/landing/components/AuthActions';
import { OperationCard } from '@/features/landing/components/DashboardPreview';
import {
  EASE,
  fadeUp,
  stagger,
} from '@/features/landing/components/primitives';
import { StockFlow } from '@/features/landing/components/StockFlow';

/** Compact dashboard preview displayed behind the stock-flow card. */
function FloatingMock() {
  const receiptStats = [
    { label: '1 Late', className: 'font-medium text-destructive' },
    { label: '6 operations' },
  ];

  const deliveryStats = [
    { label: '1 Late', className: 'font-medium text-destructive' },
    { label: '2 waiting', className: 'text-warning' },
    { label: '6 operations' },
  ];

  return (
    <div
      className="dark rounded-2xl border border-white/10 bg-zinc-950/85 p-1.5 text-foreground shadow-[0_30px_80px_-24px_rgba(20,20,40,0.55)] dark:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]"
      aria-hidden
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className="size-2 rounded-full bg-white/15"
          />
        ))}

        <span className="ml-2 font-mono text-[10px] text-zinc-500">
          Dashboard
        </span>
      </div>

      <div className="grid gap-2.5 rounded-xl border border-white/[0.06] bg-background p-2.5 sm:grid-cols-2">
        <OperationCard
          title="Receipt"
          subtitle="WH · Main warehouse"
          icon={ArrowDownToLine}
          tone="text-success"
          action="4 to receive"
          stats={receiptStats}
          progress={66}
        />

        <OperationCard
          title="Delivery"
          subtitle="WH · Main warehouse"
          icon={ArrowUpFromLine}
          tone="text-destructive"
          action="4 to Deliver"
          stats={deliveryStats}
          progress={42}
        />
      </div>
    </div>
  );
}

export function Hero() {
  const isAuthenticated =
    useAuthStore((state) => state.status) === 'authenticated';

  const heroAnimation = stagger(0.08, 0.05);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pt-20"
    >
      {/* Subtle gradient mesh and background grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="bg-grid mask-radial absolute inset-0" />

        <div className="absolute -top-48 left-[10%] h-[420px] w-[60%] rounded-full bg-brand-from/[0.14] blur-[120px]" />

        <div className="absolute -top-24 right-[5%] h-[360px] w-[45%] rounded-full bg-brand-via/[0.10] blur-[120px]" />

        <div className="absolute bottom-0 right-[20%] h-[260px] w-[35%] rounded-full bg-brand-to/[0.07] blur-[120px]" />
      </div>

      <div className="container grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 xl:gap-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={heroAnimation}
          className="flex min-w-0 flex-col items-start"
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-[12.5px] text-muted-foreground shadow-card"
          >
            <span
              className="size-1.5 shrink-0 rounded-full bg-success"
              aria-hidden
            />

            <span className="truncate">
              Inventory management for growing warehouses
            </span>
          </motion.span>

          <motion.h1
            variants={fadeUp}
            id="hero-title"
            className="mt-6 text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.04em] xs:text-6xl lg:text-[4.25rem] xl:text-7xl"
          >
            <span className="block">Inventory,</span>
            <span className="text-gradient block pb-1">
              in real time.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            StockSense manages your products, stock and warehouses in one
            place. Every receipt, delivery, internal transfer and stock
            adjustment is recorded in a complete stock history — so the
            numbers on screen match the shelf.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 w-full"
          >
            <AuthActions
              primaryFirst
              size="lg"
              secondaryLabel="View Demo"
              secondaryVariant="outline"
              className="flex-col items-stretch gap-3 xs:flex-row xs:items-center"
            />

            {/* Demo credentials are displayed only during development. */}
            {!isAuthenticated && import.meta.env.DEV && (
              <p className="mt-3 text-caption text-muted-foreground">
                Demo login:{' '}
                <span className="font-mono text-foreground">
                  admin01
                </span>{' '}
                /{' '}
                <span className="font-mono text-foreground">
                  Admin@1234
                </span>
              </p>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.25,
            ease: EASE,
          }}
          className="relative mx-auto w-full min-w-0 max-w-xl lg:max-w-none"
        >
          <div
            className="lg:pl-6"
            style={{ perspective: 1400 }}
          >
            <div
              style={{
                transform:
                  'rotateX(8deg) rotateY(-10deg) rotateZ(1deg)',
              }}
            >
              <FloatingMock />
            </div>
          </div>

          <StockFlow
            className="relative z-10 mx-auto -mt-10 w-[94%] xs:-mt-14 sm:ml-0 sm:w-[82%] lg:-ml-4"
          />
        </motion.div>
      </div>
    </section>
  );
}
```

**Isme working same hai:**

* `FloatingMock` same
* Receipt/Delivery cards same
* Authentication check same
* Demo credentials same
* Animations same
* `AuthActions` same
* `StockFlow` same
* Routes/links par koi change nahi
* UI ka actual behavior same

Bas ab Git mein **meaningful code-level changes** show honge.
