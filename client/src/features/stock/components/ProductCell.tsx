import { Sku } from '@/components/common/bits';
import type { StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';

const TILE_TONES = [
  'from-indigo-500/20 to-violet-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/20',
  'from-sky-500/20 to-indigo-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  'from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  'from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  'from-rose-500/20 to-pink-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  'from-violet-500/20 to-fuchsia-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
];

const toneFor = (key: string) => TILE_TONES[[...key].reduce((s, c) => s + c.charCodeAt(0), 0) % TILE_TONES.length];

function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '··';
}

/** Deterministic tinted monogram tile standing in for a product image. */
export function ProductTile({ name, sku, className }: { name: string; sku: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br text-[12px] font-semibold tracking-tight',
        toneFor(sku || name),
        className,
      )}
    >
      {monogram(name)}
    </span>
  );
}

export function ProductCell({ row }: { row: StockRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductTile name={row.name} sku={row.sku} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sku className="shrink-0 text-primary/90">[{row.sku}]</Sku>
          <span className="truncate font-medium">{row.name}</span>
        </div>
        <div className="truncate text-caption text-muted-foreground">{row.category?.name ?? 'Uncategorised'}</div>
      </div>
    </div>
  );
}
