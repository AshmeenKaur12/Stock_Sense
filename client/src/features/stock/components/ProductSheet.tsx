import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, PackagePlus } from 'lucide-react';
import { forwardRef, useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';
import { LocationSelect } from '@/components/common/pickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { categoryPaths, useCategories } from '@/features/master/queries';
import { fieldErrors } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import { formatCurrency, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCreateProduct } from '../queries';
import { PRODUCT_DEFAULTS, productSchema, UOM_OPTIONS, type ProductFormValues } from '../schema';

const NO_CATEGORY = '__none';

const SERVER_FIELD: Record<string, FieldPath<ProductFormValues>> = {
  name: 'name',
  sku: 'sku',
  category: 'category',
  uom: 'uom',
  perUnitCost: 'perUnitCost',
  salePrice: 'salePrice',
  'initialStock.quantity': 'initialQty',
  'initialStock.location': 'initialLocation',
  initialStock: 'initialQty',
};

interface ProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "New Product" side sheet: catalog fields plus optional opening stock. */
export function ProductSheet({ open, onOpenChange }: ProductSheetProps) {
  const uid = useId();
  const create = useCreateProduct();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const paths = categoryPaths(categories);
  const categoryOptions = [...paths.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: PRODUCT_DEFAULTS, mode: 'onTouched' });

  useEffect(() => {
    if (!open) {
      reset(PRODUCT_DEFAULTS);
      setFormError(null);
    }
  }, [open, reset]);

  const [cost, qty, uom] = watch(['perUnitCost', 'initialQty', 'uom']);
  const openingValue = (Number.isFinite(cost) ? cost : 0) * (Number.isFinite(qty) ? qty : 0);

  const onSubmit = handleSubmit((v) => {
    setFormError(null);
    create.mutate(
      {
        name: v.name,
        sku: v.sku,
        category: v.category || null,
        uom: v.uom,
        perUnitCost: v.perUnitCost,
        salePrice: v.salePrice,
        ...(v.initialQty > 0 ? { initialStock: { quantity: v.initialQty, location: v.initialLocation } } : {}),
      },
      {
        onSuccess: ({ data }) => {
          toast.success('Product created', {
            description: `[${data.sku}] ${data.name}${v.initialQty > 0 ? ` · ${formatNumber(v.initialQty)} ${v.uom} in stock` : ''}`,
          });
          onOpenChange(false);
        },
        onError: (err) => {
          const fields = fieldErrors(err);
          let mapped = false;
          for (const [key, message] of Object.entries(fields)) {
            const target = SERVER_FIELD[key];
            if (target) {
              setError(target, { type: 'server', message }, { shouldFocus: !mapped });
              mapped = true;
            }
          }
          if (!mapped) setFormError(getErrorMessage(err, 'Could not create the product'));
        },
      },
    );
  });

  const id = (name: string) => `${uid}-${name}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 sm:max-w-[480px]" aria-describedby={id('desc')}>
        <SheetHeader className="pr-12">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-brand-gradient-soft text-primary">
              <PackagePlus className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <SheetTitle>New product</SheetTitle>
              <SheetDescription id={id('desc')} className="text-[13px]">
                Add it to the catalog and optionally record opening stock.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form id={id('form')} onSubmit={onSubmit} noValidate className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4" aria-labelledby={id('s1')}>
            <h3 id={id('s1')} className="caption-label">
              Information
            </h3>
            <FormField label="Name" htmlFor={id('name')} error={errors.name?.message}>
              <Input id={id('name')} autoFocus placeholder="e.g. Office Desk" aria-invalid={!!errors.name} {...register('name')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="SKU / Code" htmlFor={id('sku')} error={errors.sku?.message}>
                <Input
                  id={id('sku')}
                  placeholder="DESK001"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="font-mono uppercase placeholder:normal-case"
                  aria-invalid={!!errors.sku}
                  {...register('sku')}
                />
              </FormField>
              <FormField label="Unit of measure" htmlFor={id('uom')} error={errors.uom?.message}>
                <Controller
                  control={control}
                  name="uom"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={id('uom')} aria-invalid={!!errors.uom} onBlur={field.onBlur}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UOM_OPTIONS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
            <FormField label="Category" htmlFor={id('category')} error={errors.category?.message} optional>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value || NO_CATEGORY} onValueChange={(v) => field.onChange(v === NO_CATEGORY ? '' : v)} disabled={categoriesLoading}>
                    <SelectTrigger id={id('category')} aria-invalid={!!errors.category} onBlur={field.onBlur}>
                      <SelectValue placeholder={categoriesLoading ? 'Loading…' : 'No category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>
                        <span className="text-muted-foreground">No category</span>
                      </SelectItem>
                      {categoryOptions.map(([cid, path]) => (
                        <SelectItem key={cid} value={cid}>
                          {path}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </section>

          <section className="space-y-4" aria-labelledby={id('s2')}>
            <h3 id={id('s2')} className="caption-label">
              Pricing
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Per unit cost" htmlFor={id('cost')} error={errors.perUnitCost?.message}>
                <MoneyInput id={id('cost')} invalid={!!errors.perUnitCost} {...register('perUnitCost', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Sale price" htmlFor={id('price')} error={errors.salePrice?.message}>
                <MoneyInput id={id('price')} invalid={!!errors.salePrice} {...register('salePrice', { valueAsNumber: true })} />
              </FormField>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-dashed bg-muted/20 p-4" aria-labelledby={id('s3')}>
            <div>
              <h3 id={id('s3')} className="caption-label">
                Initial stock <span className="normal-case tracking-normal">(optional)</span>
              </h3>
              <p className="mt-1 text-caption text-muted-foreground">Posts a WH/ADJ adjustment so the ledger starts balanced.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <FormField label="Quantity" htmlFor={id('qty')} error={errors.initialQty?.message}>
                <div className="relative">
                  <Input
                    id={id('qty')}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="tabular pr-12 font-mono"
                    aria-invalid={!!errors.initialQty}
                    {...register('initialQty', { setValueAs: (v: string | number) => (v === '' ? 0 : Number(v)) })}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted-foreground">{uom}</span>
                </div>
              </FormField>
              <FormField label="Location" htmlFor={id('loc')} error={errors.initialLocation?.message}>
                <Controller
                  control={control}
                  name="initialLocation"
                  render={({ field }) => (
                    <LocationSelect id={id('loc')} value={field.value} onChange={field.onChange} invalid={!!errors.initialLocation} disabled={!(qty > 0)} />
                  )}
                />
              </FormField>
            </div>
            {qty > 0 && openingValue > 0 && (
              <p className="text-caption text-muted-foreground">
                Opening value <span className="tabular font-mono font-medium text-foreground">{formatCurrency(openingValue)}</span>
              </p>
            )}
          </section>

          <AnimatePresence initial={false}>
            {formError && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <span className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {formError}
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </form>

        <SheetFooter className="mt-0 bg-card/60">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={id('form')} variant="gradient" loading={create.isPending}>
            Create product
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FormField({ label, htmlFor, error, optional, children }: { label: string; htmlFor: string; error?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type MoneyInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(({ invalid, className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>
      ₹
    </span>
    <Input ref={ref} type="number" inputMode="decimal" min={0} step="any" aria-invalid={invalid || undefined} className={cn('tabular pl-7 font-mono', className)} {...props} />
  </div>
));
MoneyInput.displayName = 'MoneyInput';
