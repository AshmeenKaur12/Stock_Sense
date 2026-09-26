import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWarehouses } from '@/features/master/queries';
import type { Location } from '@/lib/types';
import { locationsApi } from '../api';
import { INVALIDATES, useSettingsMutation } from '../queries';
import { locationSchema, type LocationForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';

const FIELDS = ['name', 'shortCode', 'warehouse'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  defaultWarehouse?: string;
}

export function LocationSheet({ open, onOpenChange, location, defaultWarehouse }: Props) {
  const isEdit = Boolean(location);
  const { data: warehouses = [] } = useWarehouses();
  const { register, handleSubmit, reset, watch, setError, control, formState } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', shortCode: '', warehouse: '' },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset({
      name: location?.name ?? '',
      shortCode: location?.shortCode ?? '',
      warehouse: location?.warehouse._id ?? defaultWarehouse ?? (warehouses.length === 1 ? warehouses[0]!._id : ''),
    });
    // Only re-seed when the sheet opens for a record, not when lookups refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location, defaultWarehouse, reset]);

  const save = useSettingsMutation(
    (v: LocationForm) => (location ? locationsApi.update(location._id, { name: v.name, shortCode: v.shortCode }) : locationsApi.create(v)),
    INVALIDATES.locations,
  );

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved(isEdit ? 'Location saved' : 'Location created', values.name);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, FIELDS),
    }),
  );

  const whId = watch('warehouse');
  const code = watch('shortCode');
  const whCode = warehouses.find((w) => w._id === whId)?.shortCode ?? location?.warehouse.shortCode;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={MapPin}
      title={isEdit ? 'Edit location' : 'New location'}
      description="A room, rack, shelf or floor inside a warehouse where stock is kept."
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create location'}
    >
      <FormRow id="loc-name" label="Name" required error={errors.name?.message}>
        <Input {...fieldA11y('loc-name', errors.name?.message)} placeholder="Rack A" autoComplete="off" {...register('name')} />
      </FormRow>

      <FormRow id="loc-code" label="Short code" required error={errors.shortCode?.message} hint="1–16 letters, digits, dash or underscore.">
        <Input
          {...fieldA11y('loc-code', errors.shortCode?.message, 'hint')}
          placeholder="RackA"
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          {...register('shortCode')}
        />
      </FormRow>

      <FormRow
        id="loc-warehouse"
        label="Warehouse"
        required
        error={errors.warehouse?.message}
        hint={isEdit ? 'A location cannot move between warehouses.' : undefined}
      >
        <Controller
          control={control}
          name="warehouse"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
              <SelectTrigger {...fieldA11y('loc-warehouse', errors.warehouse?.message, isEdit ? 'hint' : undefined)} onBlur={field.onBlur} ref={field.ref}>
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

      <div className="rounded-xl border border-dashed bg-muted/30 px-3.5 py-3">
        <div className="caption-label mb-1.5">Full name</div>
        <span className="font-mono text-sm">
          <span className="text-primary">{whCode || 'WH'}</span>
          <span className="text-muted-foreground">/</span>
          <span className={code ? 'text-foreground' : 'text-muted-foreground/70'}>{code || 'CODE'}</span>
        </span>
      </div>
    </FormSheet>
  );
}
