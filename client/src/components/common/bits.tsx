import { ArrowRight, Building2, Minus, Plus, SlidersHorizontal, Store, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { LocationType } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

/** Small, reusable presentational pieces shared by tables, cards and forms. */

// ── Section card (forms, settings) ─────────────────────────────────────────

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-2xl border bg-card shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            {title && <h2 className="caption-label text-foreground/80">{title}</h2>}
            {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Label + value pair for read-only details. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="caption-label">{label}</div>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

// ── Reference (mono) ────────────────────────────────────────────────────────

export function Reference({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[13px] font-medium text-primary', className)}>{children}</span>;
}

export function Sku({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[11.5px] font-medium text-muted-foreground', className)}>{children}</span>;
}

// ── Locations ───────────────────────────────────────────────────────────────

const LOC_ICON: Record<string, typeof Store> = { vendor: Building2, customer: Truck, adjustment: SlidersHorizontal };

export function LocationChip({ name, type, className }: { name: string; type?: LocationType | ''; className?: string }) {
  const Icon = type ? LOC_ICON[type] : undefined;
  const virtual = type && type !== 'internal';
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 font-mono text-[11.5px]',
        virtual ? 'border-dashed bg-transparent text-muted-foreground' : 'bg-muted/60 text-foreground/90',
        className,
      )}
      title={name}
    >
      {Icon && <Icon className="size-3 shrink-0" aria-hidden />}
      <span className="truncate">{name.replace('Partners/', '').replace('Virtual/', '')}</span>
    </span>
  );
}

export function LocationFlow({ from, fromType, to, toType, className }: { from: string; fromType?: LocationType | ''; to: string; toType?: LocationType | ''; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}>
      <LocationChip name={from} type={fromType} />
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="to" />
      <LocationChip name={to} type={toType} />
    </span>
  );
}

// ── People ──────────────────────────────────────────────────────────────────

const AVATAR_TONES = ['from-indigo-500 to-violet-500', 'from-sky-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500', 'from-violet-500 to-fuchsia-500'];
const toneFor = (name: string) => AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export function ContactAvatar({ name, src, size = 'sm', className }: { name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = { xs: 'size-5 text-[9px]', sm: 'size-6 text-[10px]', md: 'size-8 text-[11px]', lg: 'size-20 text-2xl' }[size];
  return (
    <Avatar className={cn(dims, className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn('bg-gradient-to-br text-white', toneFor(name || '?'))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function ContactName({ name }: { name: string }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ContactAvatar name={name} size="xs" />
      <span className="truncate">{name}</span>
    </span>
  );
}

// ── Quantity stepper & mini progress ────────────────────────────────────────

export function QtyStepper({
  value,
  onChange,
  min = 0,
  step = 1,
  disabled,
  invalid,
  'aria-label': ariaLabel,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
  className?: string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.round(v * 1000) / 1000));
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center rounded-xl border bg-background shadow-xs dark:bg-input/30',
        invalid && 'border-destructive/60',
        disabled && 'opacity-60',
        className,
      )}
    >
      <button type="button" onClick={() => set(value - step)} disabled={disabled || value <= min} aria-label="Decrease" className="flex h-full w-8 items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40">
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        step="any"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onChange={(e) => set(e.target.value === '' ? 0 : Number(e.target.value))}
        className="tabular h-full w-16 border-x bg-transparent text-center font-mono text-sm outline-none focus-visible:bg-accent/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => set(value + step)} disabled={disabled} aria-label="Increase" className="flex h-full w-8 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function MiniProgress({ value, max, tone = 'primary', className, label }: { value: number; max: number; tone?: 'primary' | 'success' | 'warning' | 'destructive'; className?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const bar = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', destructive: 'bg-destructive' }[tone];
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-panel ease-brand', bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Signed quantity with + / − and colour (never colour alone). */
export function SignedQty({ value, unit, neutral, className }: { value: number; unit?: string; neutral?: boolean; className?: string }) {
  const tone = neutral || value === 0 ? 'text-foreground' : value > 0 ? 'text-success' : 'text-destructive';
  const sign = neutral || value === 0 ? '' : value > 0 ? '+' : '−';
  return (
    <span className={cn('tabular font-mono text-sm font-semibold', tone, className)}>
      {sign}
      {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(Math.abs(value))}
      {unit && <span className="ml-1 font-sans text-caption font-normal text-muted-foreground">{unit}</span>}
    </span>
  );
}
