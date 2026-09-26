import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const OPS = [
  { code: 'IN', label: 'Receipt' },
  { code: 'OUT', label: 'Delivery' },
  { code: 'INT', label: 'Transfer' },
  { code: 'ADJ', label: 'Adjustment' },
] as const;

/** "{CODE}/IN/0001 · {CODE}/OUT/0001 …" — how operation references will look for a warehouse. */
export function ReferencePreview({ code, compact, className }: { code: string; compact?: boolean; className?: string }) {
  const prefix = code.trim().toUpperCase() || 'CODE';
  const empty = !code.trim();
  return (
    <div className={cn('min-w-0', className)} aria-label={`References: ${OPS.map((o) => `${prefix}/${o.code}/0001`).join(', ')}`}>
      {!compact && <div className="caption-label mb-2">References</div>}
      <ul className="flex flex-wrap gap-1.5" aria-hidden>
        {OPS.map((o) => (
          <li
            key={o.code}
            title={`${o.label} reference`}
            className={cn(
              'inline-flex items-center rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11.5px] leading-4',
              empty ? 'text-muted-foreground/70' : 'text-foreground/85',
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={prefix}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.15 }}
                className={cn(!empty && 'text-primary')}
              >
                {prefix}
              </motion.span>
            </AnimatePresence>
            <span className="text-muted-foreground">/{o.code}/0001</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
