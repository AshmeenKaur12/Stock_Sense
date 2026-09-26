import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { fieldErrors } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';

/**
 * Maps server field errors (409/422) onto the form and toasts the server message.
 * `rename` translates server paths (e.g. `initialStock.quantity`) to form fields.
 */
export function handleSaveError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  rename: Record<string, Path<T>> = {},
) {
  const errs = fieldErrors(error);
  let focused = false;
  for (const [serverField, message] of Object.entries(errs)) {
    const field = rename[serverField] ?? (serverField as Path<T>);
    if (!fields.includes(field)) continue;
    setError(field, { type: 'server', message }, { shouldFocus: !focused });
    focused = true;
  }
  toast.error('Could not save', { description: getErrorMessage(error, 'Please check the form and try again.') });
}

export function toastSaved(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}
