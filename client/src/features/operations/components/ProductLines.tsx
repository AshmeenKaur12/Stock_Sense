import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { QtyStepper } from '@/components/common/bits';
import { ProductCombobox, type ProductOption } from '@/components/common/pickers';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { OperationLine } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useFreeAt } from '../queries';

export interface LineDraft {
  key: string;
  product: ProductOption | null;
  quantity: number;
  /** Server line (when saved) — carries availability / short flags. */
  saved?: OperationLine;
}

interface ProductLinesProps {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  editable: boolean;
  /** Show the "Available" column (deliveries / transfers). */
  showAvailability: boolean;
  sourceLocation?: string;
  done?: boolean;
}

let seq = 0;
export const newLine = (product: ProductOption | null = null, quantity = 1): LineDraft => ({ key: `new-${++seq}`, product, quantity });

function Availability({ line, sourceLocation }: { line: LineDraft; sourceLocation?: string }) {
  const unchanged = line.saved && line.saved.product?._id === line.product?._id;
  const live = useFreeAt(!unchanged || line.saved?.available == null ? line.product?._id : undefined, sourceLocation);
  const available = unchanged && line.saved?.available != null ? line.saved.available : live.data;
  if (!line.product) return <span className="text-muted-foreground">—</span>;
  if (available === undefined || available === null) return <span className="text-caption text-muted-foreground">…</span>;
  const short = line.quantity > available || (unchanged && line.saved?.isShort && line.quantity > available);
  return (
    <span className={cn('tabular inline-flex items-center gap-1.5 font-mono text-[13px]', short ? 'font-semibold text-destructive' : 'text-success')}>
      {short ? <AlertTriangle className="size-3.5" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
      {formatNumber(available)}
      <span className="sr-only">{short ? 'insufficient' : 'available'}</span>
    </span>
  );
}

function ShortNotice({ line, sourceLocation }: { line: LineDraft; sourceLocation?: string }) {
  const unchanged = line.saved && line.saved.product?._id === line.product?._id;
  const live = useFreeAt(!unchanged || line.saved?.available == null ? line.product?._id : undefined, sourceLocation);
  const available = unchanged && line.saved?.available != null ? line.saved.available : live.data;
  if (!line.product || available == null || line.quantity <= available) return null;
  return (
    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-1.5 pt-1.5 text-caption font-medium text-destructive" role="status">
      <AlertTriangle className="size-3.5" />
      Short by {formatNumber(line.quantity - available)} · Only {formatNumber(available)} available
    </motion.p>
  );
}

/** Editable product lines grid: `[SKU] Name` combobox, qty stepper, live availability, dashed add row. */
export function ProductLines({ lines, onChange, editable, showAvailability, sourceLocation, done }: ProductLinesProps) {
  const update = (key: string, patch: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));
  const used = lines.map((l) => l.product?._id).filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      <div className={cn('hidden grid-cols-[minmax(0,1fr)_150px_110px_40px] items-center gap-4 px-3 md:grid', !showAvailability && 'md:grid-cols-[minmax(0,1fr)_150px_40px]')}>
        <span className="caption-label">Product</span>
        <span className="caption-label">{done ? 'Done qty' : 'Quantity'}</span>
        {showAvailability && <span className="caption-label">Available</span>}
        <span />
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {lines.map((line, i) => {
            const short = showAvailability && !done && (line.saved?.isShort ?? false);
            return (
              <motion.li
                key={line.key}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className={cn('rounded-xl border bg-background/50 p-3 transition-colors', short && 'border-destructive/30 bg-destructive/[0.05]')}
              >
                <div className={cn('grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_150px_110px_40px] md:gap-4', !showAvailability && 'md:grid-cols-[minmax(0,1fr)_150px_40px]')}>
                  <div className="min-w-0">
                    {editable ? (
                      <ProductCombobox value={line.product} onChange={(p) => update(line.key, { product: p })} excludeIds={used} autoFocus={!line.product && i === lines.length - 1} invalid={!line.product} />
                    ) : line.product ? (
                      <div className="min-w-0">
                        <span className="font-mono text-[11.5px] text-primary">[{line.product.sku}]</span> <span className="font-medium">{line.product.name}</span>
                        <p className="text-caption text-muted-foreground">
                          {formatCurrency(line.product.perUnitCost)} / {line.product.uom}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Deleted product</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="caption-label md:hidden">Quantity</span>
                    {editable ? (
                      <QtyStepper value={line.quantity} onChange={(v) => update(line.key, { quantity: v })} min={0} invalid={line.quantity <= 0} aria-label={`Quantity for ${line.product?.name ?? 'line'}`} />
                    ) : (
                      <span className="tabular font-mono text-sm font-semibold">
                        {formatNumber(done ? line.saved?.doneQty || line.quantity : line.quantity)} <span className="font-sans text-caption font-normal text-muted-foreground">{line.product?.uom}</span>
                      </span>
                    )}
                  </div>
                  {showAvailability && (
                    <div className="flex items-center justify-between gap-3 md:block">
                      <span className="caption-label md:hidden">Available</span>
                      {done ? <span className="text-muted-foreground">—</span> : <Availability line={line} sourceLocation={sourceLocation} />}
                    </div>
                  )}
                  <div className="flex justify-end">
                    {editable && (
                      <Button variant="ghost-danger" size="icon-sm" onClick={() => remove(line.key)} aria-label={`Remove ${line.product?.name ?? 'line'}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
                {showAvailability && !done && <ShortNotice line={line} sourceLocation={sourceLocation} />}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {editable && (
        <button
          type="button"
          onClick={() => onChange([...lines, newLine()])}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed text-[13px] font-medium text-muted-foreground transition-colors duration-micro hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" /> New Product
        </button>
      )}
      {!editable && lines.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No products on this operation.</p>}
    </div>
  );
}
