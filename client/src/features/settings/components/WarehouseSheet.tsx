import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, Warehouse as WarehouseIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Warehouse } from '@/lib/types';
import { warehousesApi } from '../api';
import { INVALIDATES, useSettingsMutation } from '../queries';
import { warehouseSchema, type WarehouseForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';
import { ReferencePreview } from './ReferencePreview';

const FIELDS = ['name', 'shortCode', 'address'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: Warehouse | null;
}

export function WarehouseSheet({ open, onOpenChange, warehouse }: Props) {
  const isEdit = Boolean(warehouse);
  const form = useForm<WarehouseForm>({ resolver: zodResolver(warehouseSchema), defaultValues: { name: '', shortCode: '', address: '' } });
  const { register, handleSubmit, reset, watch, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset({ name: warehouse?.name ?? '', shortCode: warehouse?.shortCode ?? '', address: warehouse?.address ?? '' });
  }, [open, warehouse, reset]);

  const save = useSettingsMutation(
    (body: WarehouseForm) => (warehouse ? warehousesApi.update(warehouse._id, body) : warehousesApi.create(body)),
    INVALIDATES.warehouses,
  );

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved(isEdit ? 'Warehouse saved' : 'Warehouse created', isEdit ? values.name : `${values.name} is ready with Stock1 and virtual partner locations.`);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, FIELDS),
    }),
  );

  const code = watch('shortCode');
  const shortCode = register('shortCode');

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={WarehouseIcon}
      title={isEdit ? 'Edit warehouse' : 'New warehouse'}
      description={isEdit ? 'Update the site details. The short code prefixes new references.' : 'A physical site that holds stock. Its short code prefixes every reference.'}
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create warehouse'}
    >
      <FormRow id="wh-name" label="Name" required error={errors.name?.message}>
        <Input {...fieldA11y('wh-name', errors.name?.message)} placeholder="Main Warehouse" autoComplete="off" {...register('name')} />
      </FormRow>

      <FormRow id="wh-code" label="Short code" required error={errors.shortCode?.message} hint="1–8 letters or digits. Shown in every operation reference.">
        <Input
          {...fieldA11y('wh-code', errors.shortCode?.message, 'hint')}
          placeholder="WH"
          maxLength={8}
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase tracking-wider"
          {...shortCode}
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            void shortCode.onChange(e);
          }}
        />
      </FormRow>

      <div className="rounded-xl border border-dashed bg-muted/30 p-3.5">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Live reference preview
        </div>
        <ReferencePreview code={code} compact />
      </div>

      <FormRow id="wh-address" label="Address" optional error={errors.address?.message}>
        <Textarea {...fieldA11y('wh-address', errors.address?.message)} rows={3} placeholder="Plot 12, Industrial Area, Ludhiana, Punjab" {...register('address')} />
      </FormRow>

      {!isEdit && (
        <p className="text-caption text-muted-foreground">
          We&apos;ll create <span className="font-mono text-foreground/80">{code || 'CODE'}/Stock1</span> plus Partners/Vendor, Partners/Customer and Virtual/Adjustment locations automatically.
        </p>
      )}
    </FormSheet>
  );
}
