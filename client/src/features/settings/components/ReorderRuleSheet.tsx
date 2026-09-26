import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, PackageX, RefreshCcw } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { QtyStepper } from '@/components/common/bits';
import { ProductCombobox, type ProductOption } from '@/components/common/pickers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWarehouses } from '@/features/master/queries';
import { formatNumber } from '@/lib/format';
import { reorderRulesApi, type ReorderRuleRow } from '../api';
import { INVALIDATES, useSettingsMutation } from '../queries';
import { reorderRuleSchema, type ReorderRuleForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';

const FIELDS = ['product', 'warehouse', 'minQty', 'maxQty'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ReorderRuleRow | null;
  defaults?: { warehouse?: string; product?: ProductOption };
}

export function ReorderRuleSheet({ open, onOpenChange, rule, defaults }: Props) {
  const isEdit = Boolean(rule);
  const { data: warehouses = [] } = useWarehouses();
  const { handleSubmit, reset, setError, control, watch, formState } = useForm<ReorderRuleForm>({
    resolver: zodResolver(reorderRuleSchema),
    defaultValues: { product: null, warehouse: '', minQty: 0, maxQty: 0 },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset({
      product: rule?.product ? { ...rule.product, perUnitCost: 0 } : (defaults?.product ?? null),
      warehouse: rule?.warehouse?._id ?? defaults?.warehouse ?? (warehouses.length === 1 ? warehouses[0]!._id : ''),
      minQty: rule?.minQty ?? 0,
      maxQty: rule?.maxQty ?? 0,
    });
    // Re-seed only when the sheet opens for a record, not when lookups refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule, reset]);

  const save = useSettingsMutation((v: ReorderRuleForm) => {
    if (rule) return reorderRulesApi.update(rule._id, { minQty: v.minQty, maxQty: v.maxQty });
    return reorderRulesApi.create({ product: v.product?._id ?? '', warehouse: v.warehouse, minQty: v.minQty, maxQty: v.maxQty });
  }, INVALIDATES.reorderRules);

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved(isEdit ? 'Reorder rule saved' : 'Reorder rule created', values.product ? `[${values.product.sku}] ${values.product.name}` : undefined);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, FIELDS),
    }),
  );

  const [product, min, max] = watch(['product', 'minQty', 'maxQty']);
  const uom = product?.uom ?? 'units';

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={RefreshCcw}
      title={isEdit ? 'Edit reorder rule' : 'New reorder rule'}
      description="Thresholds for one product in one warehouse."
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create rule'}
    >
      <FormRow id="rr-product" label="Product" required error={errors.product?.message} hint={isEdit ? 'Product and warehouse are fixed for an existing rule.' : undefined}>
        <Controller
          control={control}
          name="product"
          render={({ field }) => (
            <ProductCombobox value={field.value} onChange={field.onChange} disabled={isEdit} invalid={Boolean(errors.product)} />
          )}
        />
      </FormRow>

      <FormRow id="rr-warehouse" label="Warehouse" required error={errors.warehouse?.message}>
        <Controller
          control={control}
          name="warehouse"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
              <SelectTrigger {...fieldA11y('rr-warehouse', errors.warehouse?.message)} ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder="Choose a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w._id} value={w._id}>
                    <span className="font-mono text-[11.5px] text-primary">{w.shortCode}</span>
                    <span className="ml-2">{w.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormRow>

      <div className="grid grid-cols-2 gap-4">
        <FormRow id="rr-min" label="Minimum" required error={errors.minQty?.message}>
          <Controller
            control={control}
            name="minQty"
            render={({ field }) => <QtyStepper value={field.value} onChange={field.onChange} aria-label="Minimum quantity" invalid={Boolean(errors.minQty)} className="w-full [&>input]:flex-1" />}
          />
        </FormRow>
        <FormRow id="rr-max" label="Maximum" required error={errors.maxQty?.message}>
          <Controller
            control={control}
            name="maxQty"
            render={({ field }) => <QtyStepper value={field.value} onChange={field.onChange} aria-label="Maximum quantity" invalid={Boolean(errors.maxQty)} className="w-full [&>input]:flex-1" />}
          />
        </FormRow>
      </div>

      <div className="space-y-2.5 rounded-xl border border-dashed bg-muted/30 p-3.5 text-[13px]" aria-live="polite">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
          <span>
            <span className="font-medium">Low stock</span> when free to use is at or below <span className="tabular font-mono font-medium">{formatNumber(min || 0)}</span> {uom}.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <PackageX className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
          <span>
            <span className="font-medium">Out of stock</span> at <span className="tabular font-mono font-medium">0</span> or below.
          </span>
        </p>
        <p className="text-caption text-muted-foreground">
          Replenish up to <span className="tabular font-mono text-foreground">{formatNumber(max || 0)}</span> {uom} — suggested order{' '}
          <span className="tabular font-mono text-foreground">{formatNumber(Math.max(0, (max || 0) - (min || 0)))}</span> when the alert fires.
        </p>
      </div>
    </FormSheet>
  );
}
