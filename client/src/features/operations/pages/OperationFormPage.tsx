import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Ban, Check, Copy, History, Lock, PackageCheck, PackageOpen, Printer, Save, ScanSearch, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ContactAvatar, Field, SectionCard } from '@/components/common/bits';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/common/PageHeader';
import { ContactCombobox, LocationSelect } from '@/components/common/pickers';
import { LateBadge, StatusBadge } from '@/components/common/StatusBadge';
import { StatusStepper } from '@/components/common/StatusStepper';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocations } from '@/features/master/queries';
import { downloadFile, fieldErrors, getData } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import { celebrate } from '@/lib/confetti';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { DELIVERY_KIND_LABEL, type DeliveryKind, type OperationDetail, type Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { newLine, ProductLines, type LineDraft } from '../components/ProductLines';
import { OPERATION_CONFIG, type OperationConfig, type OperationSegment } from '../config';
import { useOperation, useOperationAction, useSaveOperation, type OperationAction } from '../queries';
import AdjustmentPage from './AdjustmentPage';

interface FormState {
  contact: string | null;
  contactLabel: string;
  sourceLocation: string;
  destinationLocation: string;
  scheduleDate: string;
  deliveryAddress: string;
  operationType: DeliveryKind;
  notes: string;
  lines: LineDraft[];
}

const toDateInput = (d?: string | Date | null) => format(d ? new Date(d) : new Date(), 'yyyy-MM-dd');

function fromOperation(op: OperationDetail): FormState {
  return {
    contact: op.contact?._id ?? null,
    contactLabel: op.contact?.name ?? '',
    sourceLocation: op.sourceLocation?._id ?? '',
    destinationLocation: op.destinationLocation?._id ?? '',
    scheduleDate: toDateInput(op.scheduleDate),
    deliveryAddress: op.deliveryAddress ?? '',
    operationType: op.operationType ?? 'delivery_order',
    notes: op.notes ?? '',
    lines: op.lines.map((l) => ({
      key: l._id,
      product: l.product ? { _id: l.product._id, sku: l.product.sku, name: l.product.name, uom: l.product.uom, perUnitCost: l.product.perUnitCost } : null,
      quantity: l.quantity,
      saved: l,
    })),
  };
}

const snapshot = (f: FormState) =>
  JSON.stringify({ ...f, lines: f.lines.map((l) => [l.product?._id ?? null, l.quantity]) });

export default function OperationFormPage() {
  const { type: segment, id } = useParams<{ type: OperationSegment; id?: string }>();
  const config = segment ? OPERATION_CONFIG[segment] : undefined;
  if (!config) return <Navigate to="/operations/receipts" replace />;
  if (config.type === 'adjustment') return <AdjustmentPage id={id === 'new' ? undefined : id} />;
  return <OperationForm key={`${segment}-${id ?? 'new'}`} config={config} id={id === 'new' ? undefined : id} />;
}

function OperationForm({ config, id }: { config: OperationConfig; id?: string }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { data: op, isLoading, error, refetch } = useOperation(id);
  const { data: locations = [] } = useLocations();
  const save = useSaveOperation();
  const act = useOperationAction();

  const defaultStock = useMemo(() => locations.find((l) => l.fullName.endsWith('/Stock1')) ?? locations[0], [locations]);
  const [form, setForm] = useState<FormState | null>(null);
  const [baseline, setBaseline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<null | 'validate' | 'cancel'>(null);

  // Initialise from the server (edit) or defaults (new).
  useEffect(() => {
    if (id && op) {
      const f = fromOperation(op);
      setForm(f);
      setBaseline(snapshot(f));
    }
  }, [id, op]);

  useEffect(() => {
    if (id || form || !defaultStock) return;
    const f: FormState = {
      contact: null,
      contactLabel: '',
      sourceLocation: config.type === 'receipt' ? '' : defaultStock._id,
      destinationLocation: config.type === 'delivery' ? '' : config.type === 'receipt' ? defaultStock._id : '',
      scheduleDate: toDateInput(),
      deliveryAddress: '',
      operationType: 'delivery_order',
      notes: '',
      lines: [newLine()],
    };
    setForm(f);
    setBaseline('');
    // Prefill a product (e.g. "Create Receipt" from a low-stock alert).
    const productId = search.get('product');
    if (productId) {
      getData<Product>(`/products/${productId}`)
        .then((p) =>
          setForm((cur) =>
            cur ? { ...cur, lines: [newLine({ _id: p._id, sku: p.sku, name: p.name, uom: p.uom, perUnitCost: p.perUnitCost }, Math.max(1, (p.reorderRules?.[0]?.maxQty ?? 10) - 0))] } : cur,
          ),
        )
        .catch(() => undefined);
    }
  }, [id, form, defaultStock, config.type, search]);

  if (id && error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if ((id && isLoading) || !form) return <LoadingState variant="form" />;

  const status = op?.status ?? 'draft';
  const locked = status === 'done' || status === 'canceled';
  const linesEditable = !locked && (status === 'draft' || status === 'waiting');
  const headerEditable = !locked;
  const dirty = snapshot(form) !== baseline;
  const isDelivery = config.type === 'delivery';
  const isTransfer = config.type === 'internal';
  const showAvailability = isDelivery || isTransfer;
  const busy = save.isPending || act.isPending;
  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const totalQty = form.lines.reduce((s, l) => s + (l.product ? l.quantity : 0), 0);
  const totalValue = form.lines.reduce((s, l) => s + (l.product ? l.quantity * l.product.perUnitCost : 0), 0);

  const buildBody = () => {
    const lines = form.lines.filter((l) => l.product && l.quantity > 0).map((l) => ({ product: l.product!._id, quantity: l.quantity }));
    const header = {
      scheduleDate: form.scheduleDate,
      notes: form.notes,
      ...(config.contactType ? { contact: form.contact } : {}),
      ...(isDelivery ? { deliveryAddress: form.deliveryAddress, operationType: form.operationType } : {}),
    };
    if (!linesEditable && id) return header;
    return {
      ...header,
      ...(config.type !== 'receipt' ? { sourceLocation: form.sourceLocation } : {}),
      ...(config.type !== 'delivery' ? { destinationLocation: form.destinationLocation } : {}),
      lines,
    };
  };

  /** Saves if needed; returns the operation id. */
  const persist = async (): Promise<string | null> => {
    if (id && !dirty) return id;
    setErrors({});
    try {
      const body = id ? buildBody() : { type: config.type, ...buildBody() };
      const res = await save.mutateAsync({ id, body });
      const f = fromOperation(res.data);
      setForm(f);
      setBaseline(snapshot(f));
      if (!id) {
        toast.success(`${res.data.reference} created`);
        navigate(`/operations/${config.segment}/${res.data._id}`, { replace: true });
      }
      return res.data._id;
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not save', { description: getErrorMessage(err) });
      return null;
    }
  };

  const run = async (action: OperationAction, value?: boolean) => {
    const opId = await persist();
    if (!opId) return;
    try {
      const res = await act.mutateAsync({ id: opId, action, value });
      const updated = res.data;
      const f = fromOperation(updated);
      setForm(f);
      setBaseline(snapshot(f));
      if (!id) navigate(`/operations/${config.segment}/${opId}`, { replace: true });

      if (action === 'validate') {
        celebrate();
        const first = updated.lines[0];
        const qty = updated.lines.reduce((s, l) => s + l.doneQty, 0);
        const sign = config.type === 'receipt' ? '+' : config.type === 'delivery' ? '−' : '';
        toast.success(`${updated.reference} validated`, {
          description: `${sign}${formatNumber(qty)} ${first?.product?.name ?? ''}${updated.lines.length > 1 ? ` +${updated.lines.length - 1} more` : ''} · ${updated.sourceLocation.fullName} → ${updated.destinationLocation.fullName}`,
          action: { label: 'View moves', onClick: () => navigate(`/move-history?search=${encodeURIComponent(updated.reference)}`) },
        });
      } else if (action === 'check-availability') {
        if (updated.status === 'waiting') {
          const short = updated.lines.filter((l) => l.isShort);
          toast.error('Not enough stock — delivery is Waiting', {
            description: short.map((l) => `${l.product?.name}: only ${formatNumber(l.availableQty ?? 0)} available`).join(' · '),
          });
        } else toast.success('All products available — stock reserved', { description: 'Pick and pack to validate.' });
      } else if (action === 'todo') toast.success(`${updated.reference} is Ready`);
      else if (action === 'cancel') toast.success(`${updated.reference} canceled`, { description: 'Reservations were released.' });
    } catch (err) {
      toast.error('Action failed', { description: getErrorMessage(err) });
      void refetch();
    }
  };

  const print = async () => {
    if (!op) return;
    try {
      await downloadFile(`/operations/${op._id}/print`, undefined, `${op.reference.replace(/\//g, '-')}.pdf`, true);
    } catch (err) {
      toast.error('Print failed', { description: getErrorMessage(err) });
    }
  };

  const copyRef = () => {
    if (!op) return;
    void navigator.clipboard?.writeText(op.reference).then(() => toast.success('Reference copied'));
  };

  // ── Action row ────────────────────────────────────────────────────────────
  const primary = (() => {
    if (locked) return null;
    if (config.type === 'receipt' || isTransfer) {
      if (status === 'draft') return { label: 'To Do', icon: Sparkles, onClick: () => void run('todo') };
      if (status === 'ready') return { label: 'Validate', icon: Check, onClick: () => setConfirm('validate') };
    }
    if (isDelivery) {
      if (status === 'draft' || status === 'waiting') return { label: 'Check Availability', icon: ScanSearch, onClick: () => void run('check-availability') };
      if (status === 'ready') return { label: 'Validate', icon: Check, onClick: () => setConfirm('validate'), disabled: !op?.picked || !op?.packed, hint: 'Pick and pack first' };
    }
    return null;
  })();

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {primary && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="gradient" onClick={primary.onClick} disabled={busy || primary.disabled} loading={act.isPending && act.variables?.action !== 'pick' && act.variables?.action !== 'pack'}>
                {!act.isPending && <primary.icon />}
                {primary.label}
              </Button>
            </span>
          </TooltipTrigger>
          {primary.disabled && primary.hint && <TooltipContent>{primary.hint}</TooltipContent>}
        </Tooltip>
      )}
      {!locked && dirty && id && (
        <Button variant="outline" onClick={() => void persist()} loading={save.isPending}>
          {!save.isPending && <Save />} Save
        </Button>
      )}
      {!id && (
        <Button variant="outline" onClick={() => void persist()} loading={save.isPending}>
          {!save.isPending && <Save />} Save draft
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" onClick={() => void print()} disabled={status !== 'done'} aria-label={status === 'done' ? 'Print PDF' : 'Print (available once Done)'}>
              {status === 'done' ? <Printer /> : <Lock />} Print
            </Button>
          </span>
        </TooltipTrigger>
        {status !== 'done' && <TooltipContent>Print is available once the operation is Done</TooltipContent>}
      </Tooltip>
      {id && !locked && (
        <Button variant="ghost-danger" onClick={() => setConfirm('cancel')} disabled={busy}>
          <Ban /> Cancel
        </Button>
      )}
    </div>
  );

  const responsibleName = op?.responsible?.name || op?.responsible?.loginId || user?.name || user?.loginId || '—';

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <PageHeader
        breadcrumbs={[{ label: 'Operations' }, { label: config.title, to: `/operations/${config.segment}` }, { label: op?.reference ?? 'New' }]}
        title={
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">{config.singular}</span>
            {op && <span className="font-mono text-[22px] font-semibold tracking-tight text-primary sm:text-[24px]">{op.reference}</span>}
            {!op && <span>· New</span>}
          </span>
        }
        titleAdornment={
          <>
            {op && (
              <Button variant="ghost" size="icon-sm" onClick={copyRef} aria-label="Copy reference">
                <Copy />
              </Button>
            )}
            <StatusBadge status={status} />
            {op?.isLate && <LateBadge />}
          </>
        }
      />

      {/* Action row + stepper (mockup: actions left, stepper right) */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="hidden md:block">{actions}</div>
        {isDelivery && status === 'ready' && op && (
          <div className="flex items-center gap-4 rounded-xl border bg-muted/40 px-3 py-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
              <Checkbox checked={op.picked} onCheckedChange={(v) => void run('pick', v === true)} disabled={busy} aria-label="Picked" />
              <PackageOpen className="size-4 text-muted-foreground" /> Pick
            </label>
            <label className={cn('flex items-center gap-2 text-[13px] font-medium', op.picked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50')}>
              <Checkbox checked={op.packed} onCheckedChange={(v) => void run('pack', v === true)} disabled={busy || !op.picked} aria-label="Packed" />
              <PackageCheck className="size-4 text-muted-foreground" /> Pack
            </label>
          </div>
        )}
        <StatusStepper steps={config.steps} current={status} className="w-full lg:w-auto lg:min-w-[360px]" />
      </div>

      {locked && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={cn('flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-[13px]', status === 'done' ? 'border-success/25 bg-success/[0.06]' : 'border-destructive/25 bg-destructive/[0.05]')} role="status">
          <Lock className={cn('size-4', status === 'done' ? 'text-success' : 'text-destructive')} />
          <span className="font-medium">{status === 'done' ? `Done on ${formatDateTime(op?.doneDate)} — this operation is locked and read-only.` : 'Canceled — this operation is read-only.'}</span>
          {status === 'done' && op && (
            <Link to={`/move-history?search=${encodeURIComponent(op.reference)}`} className="ml-auto inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <History className="size-4" /> View ledger moves
            </Link>
          )}
        </motion.div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title={`${config.singular} information`}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Reference">
                <span className="font-mono text-base font-semibold text-primary">{op?.reference ?? `${defaultStock?.fullName.split('/')[0] ?? 'WH'}/${config.code}/####`}</span>
              </Field>

              <div className="space-y-2">
                <Label htmlFor="scheduleDate">Schedule Date</Label>
                <Input id="scheduleDate" type="date" value={form.scheduleDate} onChange={(e) => set({ scheduleDate: e.target.value })} disabled={!headerEditable} className="tabular [color-scheme:light] dark:[color-scheme:dark]" />
              </div>

              {config.contactType && (
                <div className="space-y-2">
                  <Label htmlFor="contact">{config.contactLabel}</Label>
                  <ContactCombobox
                    id="contact"
                    type={config.contactType}
                    value={form.contact}
                    valueLabel={form.contactLabel}
                    autoFocus={!id}
                    invalid={!!errors.contact}
                    disabled={!headerEditable}
                    onChange={(cid, c) => set({ contact: cid, contactLabel: c?.name ?? '', ...(isDelivery && c && !form.deliveryAddress ? { deliveryAddress: c.address } : {}) })}
                  />
                  {errors.contact && <p className="text-caption text-destructive">{errors.contact}</p>}
                </div>
              )}

              {isDelivery && (
                <div className="space-y-2">
                  <Label htmlFor="operationType">Operation type</Label>
                  <Select value={form.operationType} onValueChange={(v) => set({ operationType: v as DeliveryKind })} disabled={!headerEditable}>
                    <SelectTrigger id="operationType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DELIVERY_KIND_LABEL) as DeliveryKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {DELIVERY_KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {config.type !== 'receipt' && (
                <div className="space-y-2">
                  <Label htmlFor="source">{isTransfer ? 'From location' : 'Source location'}</Label>
                  <LocationSelect id="source" value={form.sourceLocation} onChange={(v) => set({ sourceLocation: v })} disabled={!linesEditable} invalid={!!errors.sourceLocation} excludeId={isTransfer ? form.destinationLocation : undefined} />
                  {errors.sourceLocation && <p className="text-caption text-destructive">{errors.sourceLocation}</p>}
                </div>
              )}

              {config.type !== 'delivery' && (
                <div className="space-y-2">
                  <Label htmlFor="destination">{isTransfer ? 'To location' : 'Destination location'}</Label>
                  <LocationSelect id="destination" value={form.destinationLocation} onChange={(v) => set({ destinationLocation: v })} disabled={!linesEditable} invalid={!!errors.destinationLocation} excludeId={isTransfer ? form.sourceLocation : undefined} />
                  {errors.destinationLocation && <p className="text-caption text-destructive">{errors.destinationLocation}</p>}
                </div>
              )}

              {isDelivery && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Textarea id="deliveryAddress" rows={2} value={form.deliveryAddress} onChange={(e) => set({ deliveryAddress: e.target.value })} disabled={!headerEditable} placeholder="Street, city, PIN" />
                </div>
              )}

              <Field label="Responsible">
                <span className="inline-flex items-center gap-2 rounded-full border bg-muted/40 py-1 pl-1 pr-3">
                  <ContactAvatar name={responsibleName} src={op?.responsible?.avatarUrl ?? (op ? null : user?.avatarUrl)} size="sm" />
                  <span className="text-[13px] font-medium">{responsibleName}</span>
                </span>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Products"
            description={showAvailability && !locked ? 'Availability is live free-to-use stock at the source location.' : undefined}
          >
            <ProductLines
              lines={form.lines}
              onChange={(lines) => set({ lines })}
              editable={linesEditable}
              showAvailability={showAvailability}
              sourceLocation={form.sourceLocation}
              done={status === 'done'}
            />
            {errors.lines && <p className="mt-2 text-caption text-destructive">{errors.lines}</p>}
          </SectionCard>

          <SectionCard title="Notes">
            <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} disabled={!headerEditable} placeholder="Internal notes (optional)" rows={3} />
          </SectionCard>
        </div>

        {/* Summary */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <SectionCard title="Summary">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Products</dt>
                <dd className="tabular font-medium">{form.lines.filter((l) => l.product).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total quantity</dt>
                <dd className="tabular font-mono font-medium">{formatNumber(totalQty)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Value at cost</dt>
                <dd className="tabular font-medium">{formatCurrency(totalValue)}</dd>
              </div>
              {op && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="tabular text-muted-foreground">{formatDateTime(op.createdAt)}</dd>
                  </div>
                  {op.doneDate && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Done</dt>
                      <dd className="tabular text-muted-foreground">{formatDateTime(op.doneDate)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            {dirty && !locked && <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-caption font-medium text-warning">Unsaved changes — they'll be saved before any action.</p>}
          </SectionCard>
        </aside>
      </div>

      {/* Sticky mobile action bar */}
      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 md:hidden">{actions}</div>

      <ConfirmDialog
        open={confirm === 'validate'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Validate ${op?.reference ?? ''}?`}
        description={
          config.type === 'receipt'
            ? `Stock increases by ${formatNumber(totalQty)} at ${op?.destinationLocation.fullName}. Done operations are locked.`
            : isDelivery
              ? `Stock decreases by ${formatNumber(totalQty)} at ${op?.sourceLocation.fullName}. Done operations are locked.`
              : `${formatNumber(totalQty)} units move ${op?.sourceLocation.fullName} → ${op?.destinationLocation.fullName}. Total stock is unchanged.`
        }
        confirmLabel="Validate"
        loading={act.isPending}
        onConfirm={() => {
          setConfirm(null);
          void run('validate');
        }}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Cancel ${op?.reference ?? ''}?`}
        description="The operation will be canceled and any reserved stock released. This can't be undone."
        confirmLabel="Cancel operation"
        cancelLabel="Keep it"
        tone="destructive"
        loading={act.isPending}
        onConfirm={() => {
          setConfirm(null);
          void run('cancel');
        }}
      />
    </div>
  );
}
