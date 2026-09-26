import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Contact as ContactIcon, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Contact } from '@/lib/types';
import { contactsApi } from '../api';
import { INVALIDATES, useSettingsMutation } from '../queries';
import { contactSchema, type ContactForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';
import { Segmented } from './Segmented';

const FIELDS = ['name', 'type', 'email', 'phone', 'address'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  defaultType: 'vendor' | 'customer';
}

export function ContactSheet({ open, onOpenChange, contact, defaultType }: Props) {
  const isEdit = Boolean(contact);
  const { register, handleSubmit, reset, setError, control, watch, formState } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', type: defaultType, email: '', phone: '', address: '' },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset({
      name: contact?.name ?? '',
      type: contact?.type ?? defaultType,
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      address: contact?.address ?? '',
    });
  }, [open, contact, defaultType, reset]);

  const save = useSettingsMutation((v: ContactForm) => (contact ? contactsApi.update(contact._id, v) : contactsApi.create(v)), INVALIDATES.contacts);

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved(isEdit ? 'Contact saved' : `${values.type === 'vendor' ? 'Vendor' : 'Customer'} added`, values.name);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, FIELDS),
    }),
  );

  const type = watch('type');

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={ContactIcon}
      title={isEdit ? 'Edit contact' : 'New contact'}
      description={type === 'vendor' ? 'Vendors supply the goods you receive.' : 'Customers receive the goods you deliver.'}
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create contact'}
    >
      <div className="space-y-1.5">
        <div className="text-[13px] font-medium leading-none text-foreground/90" aria-hidden>
          Type
        </div>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Segmented
              aria-label="Contact type"
              size="md"
              className="flex w-full"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'vendor', label: 'Vendor', icon: Building2 },
                { value: 'customer', label: 'Customer', icon: Truck },
              ]}
            />
          )}
        />
      </div>

      <FormRow id="c-name" label="Name" required error={errors.name?.message}>
        <Input {...fieldA11y('c-name', errors.name?.message)} placeholder={type === 'vendor' ? 'Acme Supplies Pvt Ltd' : 'Riya Sharma'} autoComplete="off" {...register('name')} />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow id="c-email" label="Email" optional error={errors.email?.message}>
          <Input {...fieldA11y('c-email', errors.email?.message)} type="email" inputMode="email" placeholder="orders@acme.in" autoComplete="off" {...register('email')} />
        </FormRow>
        <FormRow id="c-phone" label="Phone" optional error={errors.phone?.message}>
          <Input {...fieldA11y('c-phone', errors.phone?.message)} type="tel" inputMode="tel" placeholder="+91 98765 43210" autoComplete="off" {...register('phone')} />
        </FormRow>
      </div>

      <FormRow id="c-address" label="Address" optional error={errors.address?.message} hint={type === 'customer' ? 'Used as the default delivery address.' : undefined}>
        <Textarea {...fieldA11y('c-address', errors.address?.message, type === 'customer' ? 'hint' : undefined)} rows={3} placeholder="Street, city, state, PIN" {...register('address')} />
      </FormRow>
    </FormSheet>
  );
}
