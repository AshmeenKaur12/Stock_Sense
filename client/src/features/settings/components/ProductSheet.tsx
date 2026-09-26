import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Package, RefreshCcw } from 'lucide-react';
import { forwardRef, useEffect, useMemo, type InputHTMLAttributes } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { categoryPaths, useCategories, useLocations } from '@/features/master/queries';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Location, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { UOMS, productsApi, type ProductBody } from '../api';
import { INVALIDATES, useProductDetail, useSettingsMutation } from '../queries';
import { productSchema, type ProductForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';

const FIELDS = ['name', 'sku', 'category', 'uom', 'perUnitCost', 'salePrice', 'isActive', 'initialQuantity', 'initialLocation'] as const;
const NONE = '__none__';

const EMPTY: ProductForm = {
  name: '',
  sku: '',
  category: '',
  uom: 'Units',
  perUnitCost: 0,
  salePrice: 0,
  isActive: true,
  withInitialStock: false,
  initialQuantity: 0,
  initialLocation: '',
};

const MoneyInput = forwardRef<HTMLInputElement, { id: string; error?: string } & InputHTMLAttributes<HTMLInputElement>>(({ id, error, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>
      ₹
    </span>
    <Input ref={ref} {...fieldA11y(id, error)} type="number" inputMode="decimal" step="0.01" min={0} className="tabular pl-7 font-mono" {...props} />
  </div>
));
MoneyInput.displayName = 'MoneyInput';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductSheet({ open, onOpenChange, product }: Props) {
  const isEdit = Boolean(product);
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations({ type: 'internal' });
  const detail = useProductDetail(open && product ? product._id : null);
  const { register, handleSubmit, reset, watch, setError, control, formState } = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: EMPTY });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            ...EMPTY,
            name: product.name,
            sku: product.sku,
            category: product.category?._id ?? '',
            uom: (UOMS as readonly string[]).includes(product.uom) ? (product.uom as ProductForm['uom']) : 'Units',
            perUnitCost: product.perUnitCost,
            salePrice: product.salePrice,
            isActive: product.isActive,
          }
        : EMPTY,
    );
  }, [open, product, reset]);

  const categoryOptions = useMemo(() => {
    const paths = categoryPaths(categories);
    return categories.map((c) => ({ id: c._id, label: paths.get(c._id) ?? c.name })).sort((a, b) => a.label.localeCompare(b.label));
  }, [categories]);

  const locationGroups = useMemo(() => {
    const map = new Map<string, { name: string; items: Location[] }>();
    for (const l of locations) {
      const g = map.get(l.warehouse._id) ?? { name: `${l.warehouse.shortCode} · ${l.warehouse.name}`, items: [] };
      g.items.push(l);
      map.set(l.warehouse._id, g);
    }
    return [...map.entries()];
  }, [locations]);

  const save = useSettingsMutation((v: ProductForm) => {
    const body: ProductBody = {
      name: v.name,
      sku: v.sku,
      category: v.category || null,
      uom: v.uom,
      perUnitCost: v.perUnitCost,
      salePrice: v.salePrice,
      isActive: v.isActive,
    };
    if (product) return productsApi.update(product._id, body);
    return productsApi.create(v.withInitialStock ? { ...body, initialStock: { quantity: v.initialQuantity, location: v.initialLocation } } : body);
  }, INVALIDATES.products);

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved(isEdit ? 'Product saved' : 'Product created', `[${values.sku}] ${values.name}`);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, FIELDS, { 'initialStock.quantity': 'initialQuantity', 'initialStock.location': 'initialLocation' }),
    }),
  );

  const [cost, price, withStock, uom] = watch(['perUnitCost', 'salePrice', 'withInitialStock', 'uom']);
  const margin = Number.isFinite(cost) && Number.isFinite(price) ? price - cost : 0;
  const marginPct = cost > 0 && Number.isFinite(price) ? (margin / cost) * 100 : null;
  const sku = register('sku');
  const rules = detail.data?.reorderRules ?? [];

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={Package}
      title={isEdit ? 'Edit product' : 'New product'}
      description="Catalogue details used on receipts, deliveries and stock valuation."
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create product'}
    >
      <FormRow id="p-name" label="Name" required error={errors.name?.message}>
        <Input {...fieldA11y('p-name', errors.name?.message)} placeholder="Office Desk" autoComplete="off" {...register('name')} />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow id="p-sku" label="SKU" required error={errors.sku?.message} hint="2–20 letters, digits or dashes.">
          <Input
            {...fieldA11y('p-sku', errors.sku?.message, 'hint')}
            placeholder="DESK-001"
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
            {...sku}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
              void sku.onChange(e);
            }}
          />
        </FormRow>
        <FormRow id="p-uom" label="Unit of measure" required error={errors.uom?.message}>
          <Controller
            control={control}
            name="uom"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...fieldA11y('p-uom', errors.uom?.message)} ref={field.ref} onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOMS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormRow>
      </div>

      <FormRow id="p-category" label="Category" optional error={errors.category?.message}>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? '' : v)}>
              <SelectTrigger {...fieldA11y('p-category', errors.category?.message)} ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder="Uncategorised" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-muted-foreground">Uncategorised</span>
                </SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow id="p-cost" label="Cost per unit" required error={errors.perUnitCost?.message}>
          <MoneyInput id="p-cost" error={errors.perUnitCost?.message} {...register('perUnitCost', { valueAsNumber: true })} />
        </FormRow>
        <FormRow id="p-price" label="Sale price" required error={errors.salePrice?.message}>
          <MoneyInput id="p-price" error={errors.salePrice?.message} {...register('salePrice', { valueAsNumber: true })} />
        </FormRow>
      </div>
      <p className="-mt-2 text-caption text-muted-foreground" aria-live="polite">
        Margin{' '}
        <span className={cn('tabular font-mono font-medium', margin > 0 ? 'text-success' : margin < 0 ? 'text-destructive' : 'text-foreground')}>
          {margin < 0 ? '−' : ''}
          {formatCurrency(Math.abs(margin))}
        </span>
        {marginPct !== null && <span className="tabular"> ({formatNumber(marginPct)}%)</span>} per {uom}
      </p>

      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
            <div className="min-w-0">
              <label htmlFor="p-active" className="text-[13px] font-medium">
                Active
              </label>
              <p className="text-caption text-muted-foreground">Archived products are hidden from operation pickers.</p>
            </div>
            <Switch id="p-active" checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
          </div>
        )}
      />

      {!isEdit && (
        <div className="rounded-xl border">
          <Controller
            control={control}
            name="withInitialStock"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <label htmlFor="p-initial" className="text-[13px] font-medium">
                    Add initial stock
                  </label>
                  <p className="text-caption text-muted-foreground">Books an opening adjustment into a location.</p>
                </div>
                <Switch id="p-initial" checked={field.value} onCheckedChange={field.onChange} ref={field.ref} />
              </div>
            )}
          />
          <AnimatePresence initial={false}>
            {withStock && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <FormRow id="p-qty" label="Quantity" error={errors.initialQuantity?.message}>
                    <Input {...fieldA11y('p-qty', errors.initialQuantity?.message)} type="number" inputMode="decimal" min={0} step="any" className="tabular font-mono" {...register('initialQuantity', { valueAsNumber: true })} />
                  </FormRow>
                  <FormRow id="p-loc" label="Location" error={errors.initialLocation?.message}>
                    <Controller
                      control={control}
                      name="initialLocation"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger {...fieldA11y('p-loc', errors.initialLocation?.message)} ref={field.ref} onBlur={field.onBlur}>
                            <SelectValue placeholder="Choose location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locationGroups.map(([id, g]) => (
                              <SelectGroup key={id}>
                                <SelectLabel>{g.name}</SelectLabel>
                                {g.items.map((l) => (
                                  <SelectItem key={l._id} value={l._id}>
                                    <span className="font-mono text-[12px]">{l.fullName}</span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormRow>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isEdit && (
        <div className="rounded-xl border border-dashed px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="caption-label flex items-center gap-1.5">
              <RefreshCcw className="size-3.5" aria-hidden />
              Reorder rules
            </span>
            <Link
              to={`/settings/reorder-rules?product=${product?._id ?? ''}`}
              className="inline-flex items-center gap-1 rounded text-[12.5px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Manage
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          {detail.isLoading ? (
            <p className="mt-2 text-caption text-muted-foreground">Loading rules…</p>
          ) : rules.length ? (
            <ul className="mt-2 space-y-1">
              {rules.map((r) => (
                <li key={r._id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-mono text-[12px] text-primary">{typeof r.warehouse === 'string' ? r.warehouse : r.warehouse.shortCode}</span>
                  <span className="tabular font-mono text-muted-foreground">
                    min <span className="text-foreground">{formatNumber(r.minQty)}</span> · max <span className="text-foreground">{formatNumber(r.maxQty)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-caption text-muted-foreground">No thresholds yet — this product won&apos;t raise low-stock alerts.</p>
          )}
        </div>
      )}
    </FormSheet>
  );
}
