import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CircleAlert, Equal, Pencil, TrendingDown, TrendingUp } from 'lucide-react';
import { useId, useState, type FormEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { QtyStepper, Sku } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocations } from '@/features/master/queries';
import { fieldErrors } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import { formatNumber, formatSigned } from '@/lib/format';
import { REASON_LABEL, type StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { ManualAdjustmentReason } from '../api';
import { useAdjustStock, useStockLocations } from '../queries';
import { ADJUST_REASONS } from '../schema';

const stop = (e: SyntheticEvent) => e.stopPropagation();

interface StockAdjustPopoverProps {
  row: StockRow;
  warehouse?: string;
  /** Always visible (touch / mobile cards) instead of revealed on row hover. */
  alwaysVisible?: boolean;
}

/** Pencil button that opens an inline "counted quantity" adjustment for one product. */
export function StockAdjustPopover({ row, warehouse, alwaysVisible }: StockAdjustPopoverProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Update stock for ${row.name}`}
          onClick={stop}
          onKeyDown={stop}
          className={cn(
            'text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground',
            !alwaysVisible &&
              'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          <Pencil />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-[min(360px,calc(100vw-2rem))] p-0"
        onClick={stop}
        onKeyDown={stop}
      >
        {open && <AdjustForm row={row} warehouse={warehouse} onDone={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
}

function AdjustForm({ row, warehouse, onDone }: { row: StockRow; warehouse?: string; onDone: () => void }) {
  const uid = useId();
  const navigate = useNavigate();
  const { data, isLoading } = useStockLocations(row._id, true, warehouse);
  const { data: allLocations = [], isLoading: locationsLoading } = useLocations(warehouse ? { warehouse } : {});
  const adjust = useAdjustStock(row._id);

  const stocked = [...(data?.locations ?? [])].sort((a, b) => b.onHand - a.onHand);
  const stockedIds = new Set(stocked.map((l) => l.location._id));
  const others = allLocations.filter((l) => l.type === 'internal' && !stockedIds.has(l._id));

  const [locationId, setLocationId] = useState('');
  const [counted, setCounted] = useState<number | null>(null);
  const [reason, setReason] = useState<ManualAdjustmentReason>('count_correction');
  const [notes, setNotes] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const effectiveLocation = locationId || stocked[0]?.location._id || '';
  const current = stocked.find((l) => l.location._id === effectiveLocation);
  const locationName = current?.location.fullName ?? others.find((l) => l._id === effectiveLocation)?.fullName ?? '';
  const recorded = current?.onHand ?? 0;
  const reserved = current?.reserved ?? 0;
  const countedValue = counted ?? recorded;
  const diff = Math.round((countedValue - recorded) * 1000) / 1000;
  const belowReserved = countedValue < reserved;
  const canSubmit = !!effectiveLocation && diff !== 0 && !belowReserved && !adjust.isPending;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSubmit) return;
    setServerError(null);
    adjust.mutate(
      { location: effectiveLocation, countedQty: countedValue, reason, notes: notes.trim() || undefined },
      {
        onSuccess: ({ data: result }) => {
          const reference = result.operation?.reference;
          toast.success(`Stock updated · ${row.name} ${formatSigned(result.difference)} at ${locationName}`, {
            description: `${formatNumber(result.recorded)} → ${formatNumber(result.counted)} ${row.uom} · ${REASON_LABEL[reason]}${reference ? ` · ${reference}` : ''}`,
            action: { label: 'View', onClick: () => navigate(`/operations/adjustments/${result.id}`) },
          });
          onDone();
        },
        onError: (err) => {
          const fields = fieldErrors(err);
          setServerError(fields.countedQty ? `${getErrorMessage(err)} (${fields.countedQty})` : getErrorMessage(err, 'Could not update stock'));
        },
      },
    );
  };

  const loading = isLoading || locationsLoading;

  return (
    <form onSubmit={onSubmit} aria-labelledby={`${uid}-title`} noValidate>
      <div className="border-b px-4 py-3">
        <h3 id={`${uid}-title`} className="text-[13.5px] font-semibold">
          Update stock
        </h3>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <Sku className="text-primary/90">[{row.sku}]</Sku>
          <span className="truncate">{row.name}</span>
        </p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-loc`}>Location</Label>
          {loading ? (
            <Skeleton className="h-9 w-full rounded-xl" />
          ) : (
            <Select
              value={effectiveLocation || undefined}
              onValueChange={(v) => {
                setLocationId(v);
                setCounted(null);
                setServerError(null);
              }}
            >
              <SelectTrigger id={`${uid}-loc`} className="font-mono text-[13px]">
                <SelectValue placeholder="Choose location" />
              </SelectTrigger>
              <SelectContent onKeyDown={stop}>
                {stocked.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Stocked here</SelectLabel>
                    {stocked.map((l) => (
                      <SelectItem key={l.location._id} value={l.location._id} className="font-mono">
                        {l.location.fullName} · {formatNumber(l.onHand)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {others.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Other locations</SelectLabel>
                    {others.map((l) => (
                      <SelectItem key={l._id} value={l._id} className="font-mono">
                        {l.fullName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium leading-none text-foreground/90">Current → New</span>
            <DiffChip diff={diff} uom={row.uom} />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 min-w-[4.5rem] flex-col justify-center rounded-xl border border-dashed bg-muted/40 px-2.5">
              <span className="sr-only">Current quantity</span>
              <span className="tabular font-mono text-sm font-semibold leading-4 text-muted-foreground">{formatNumber(recorded)}</span>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <QtyStepper
              value={countedValue}
              onChange={(v) => {
                setCounted(v);
                setServerError(null);
              }}
              invalid={belowReserved}
              disabled={!effectiveLocation}
              aria-label="Counted quantity"
              className="[&_input]:w-20"
            />
            <span className="text-caption text-muted-foreground">{row.uom}</span>
          </div>
          {reserved > 0 && (
            <p className={cn('flex items-center gap-1.5 text-caption', belowReserved ? 'text-destructive' : 'text-muted-foreground')}>
              {belowReserved && <CircleAlert className="size-3.5 shrink-0" aria-hidden />}
              {formatNumber(reserved)} reserved for deliveries{belowReserved ? ` — count can't go below ${formatNumber(reserved)}` : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-reason`}>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ManualAdjustmentReason)}>
              <SelectTrigger id={`${uid}-reason`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent onKeyDown={stop}>
                {ADJUST_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-notes`}>
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id={`${uid}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Cycle count…" />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {serverError && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <span className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] font-medium text-destructive">
                <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                {serverError}
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" size="sm" disabled={!canSubmit} loading={adjust.isPending}>
          Confirm
        </Button>
      </div>
    </form>
  );
}

function DiffChip({ diff, uom }: { diff: number; uom: string }) {
  const tone =
    diff > 0 ? 'border-success/25 bg-success/10 text-success' : diff < 0 ? 'border-destructive/25 bg-destructive/10 text-destructive' : 'border-border bg-muted text-muted-foreground';
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Equal;
  return (
    <motion.span
      key={Math.sign(diff)}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      aria-live="polite"
      className={cn('tabular inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11.5px] font-semibold', tone)}
    >
      <Icon className="size-3" aria-hidden />
      {diff === 0 ? <span className="font-sans font-medium">No change</span> : `${formatSigned(diff)} ${uom}`}
    </motion.span>
  );
}
