import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, History, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, QtyStepper, SectionCard, SignedQty } from '@/components/common/bits';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { LocationSelect, ProductCombobox, type ProductOption } from '@/components/common/pickers';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getData } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import { celebrate } from '@/lib/confetti';
import { formatDateTime, formatNumber } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { REASON_LABEL, type AdjustmentReason, type StockLocationRow } from '@/lib/types';
import { useHasRole } from '@/store/auth';
import { useApplyAdjustment, useOperation } from '../queries';

const REASONS: Exclude<AdjustmentReason, 'initial_stock'>[] = ['damaged', 'lost', 'count_correction', 'expired'];

/** Product + location → recorded qty → counted qty → live difference → reason → Apply. */
export default function AdjustmentPage({ id }: { id?: string }) {
  return id ? <AdjustmentDetail id={id} /> : <NewAdjustment />;
}

function NewAdjustment() {
  const navigate = useNavigate();
  const canAdjust = useHasRole('manager');
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [location, setLocation] = useState('');
  const [counted, setCounted] = useState<number | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('count_correction');
  const [notes, setNotes] = useState('');
  const apply = useApplyAdjustment();

  const recordedQ = useQuery({
    queryKey: [...queryKeys.stock.locations(product?._id ?? ''), 'recorded', location],
    queryFn: async () => {
      const res = await getData<{ locations: StockLocationRow[] }>(`/stock/${product!._id}/locations`);
      return res.locations.find((l) => l.location._id === location) ?? null;
    },
    enabled: !!product && !!location,
  });
  const recorded = recordedQ.data?.onHand ?? 0;
  const reserved = recordedQ.data?.reserved ?? 0;
  const countedValue = counted ?? recorded;
  const diff = countedValue - recorded;
  const ready = !!product && !!location && recordedQ.isSuccess && diff !== 0 && countedValue >= reserved;

  const submit = () => {
    if (!product || !ready) return;
    apply.mutate(
      { product: product._id, location, countedQty: countedValue, reason, notes },
      {
        onSuccess: ({ data }) => {
          celebrate();
          toast.success(`${data.reference} applied`, { description: `${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))} ${product.name} · ${REASON_LABEL[reason]}` });
          navigate(`/operations/adjustments/${data._id}`, { replace: true });
        },
        onError: (err) => toast.error('Adjustment failed', { description: getErrorMessage(err) }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations' }, { label: 'Inventory Adjustments', to: '/operations/adjustments' }, { label: 'New' }]}
        title="New adjustment"
        description="Count the physical stock; the difference is posted to Virtual/Adjustment and logged in Move History."
      />
      {!canAdjust && (
        <div className="flex items-center gap-2 rounded-2xl border border-warning/25 bg-warning/[0.06] px-4 py-3 text-[13px]">
          <Lock className="size-4 text-warning" /> Only managers and admins can post adjustments.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="Count">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Product</Label>
              <ProductCombobox value={product} onChange={(p) => { setProduct(p); setCounted(null); }} autoFocus disabled={!canAdjust} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="loc">Location</Label>
              <LocationSelect id="loc" value={location} onChange={(v) => { setLocation(v); setCounted(null); }} disabled={!canAdjust} />
            </div>
            <Field label="Recorded quantity">
              <span className="tabular font-mono text-2xl font-semibold">{product && location ? (recordedQ.isLoading ? '…' : formatNumber(recorded)) : '—'}</span>
              {reserved > 0 && <p className="text-caption text-muted-foreground">{formatNumber(reserved)} reserved</p>}
            </Field>
            <div className="space-y-2">
              <Label>Counted quantity</Label>
              <QtyStepper value={countedValue} onChange={setCounted} disabled={!product || !location || !canAdjust} aria-label="Counted quantity" invalid={countedValue < reserved} />
              {countedValue < reserved && <p className="text-caption text-destructive">Can't be below the {formatNumber(reserved)} reserved units.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)} disabled={!canAdjust}>
                <SelectTrigger id="reason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r} value={r}>{REASON_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 3 kg rusted during storage" disabled={!canAdjust} />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Difference" className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-center gap-3 py-4 font-mono text-lg">
            <span className="tabular text-muted-foreground">{formatNumber(recorded)}</span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="tabular font-semibold">{formatNumber(countedValue)}</span>
          </div>
          <div className="rounded-xl border bg-muted/40 py-5 text-center">
            <SignedQty value={diff} unit={product?.uom} className="text-3xl" />
            <p className="mt-1 text-caption text-muted-foreground">{diff === 0 ? 'No difference yet' : diff > 0 ? 'Stock will increase' : 'Stock will decrease'}</p>
          </div>
          <Button variant="gradient" size="lg" className="mt-4 w-full" disabled={!ready || !canAdjust} loading={apply.isPending} onClick={submit}>
            {!apply.isPending && <Check />} Apply
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}

function AdjustmentDetail({ id }: { id: string }) {
  const { data: op, isLoading, error, refetch } = useOperation(id);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !op) return <LoadingState variant="form" />;
  const line = op.lines[0];
  const diff = (line?.countedQty ?? 0) - (line?.recordedQty ?? 0);
  const location = op.sourceLocation.type === 'internal' ? op.sourceLocation : op.destinationLocation;
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations' }, { label: 'Inventory Adjustments', to: '/operations/adjustments' }, { label: op.reference }]}
        title={<span className="font-mono text-primary">{op.reference}</span>}
        titleAdornment={<StatusBadge status={op.status} />}
        description={`Applied ${formatDateTime(op.doneDate)} by ${op.responsible?.name ?? '—'}`}
        actions={
          <Button variant="outline" asChild>
            <Link to={`/move-history?search=${encodeURIComponent(op.reference)}`}><History /> View ledger move</Link>
          </Button>
        }
      />
      <SectionCard title="Adjustment">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Product">
            <span className="font-mono text-[12px] text-primary">[{line?.product?.sku}]</span> {line?.product?.name}
          </Field>
          <Field label="Location"><span className="font-mono">{location.fullName}</span></Field>
          <Field label="Reason">{op.reason ? REASON_LABEL[op.reason] : '—'}</Field>
          <Field label="Recorded"><span className="tabular font-mono">{formatNumber(line?.recordedQty ?? 0)}</span></Field>
          <Field label="Counted"><span className="tabular font-mono">{formatNumber(line?.countedQty ?? 0)}</span></Field>
          <Field label="Difference"><SignedQty value={diff} unit={line?.product?.uom} /></Field>
          {op.notes && <Field label="Notes" className="sm:col-span-2 lg:col-span-3">{op.notes}</Field>}
        </div>
      </SectionCard>
    </div>
  );
}
