import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SectionCard } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/features/auth/components/FormBits';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { passwordSchema } from '@/features/auth/schema';
import { fieldErrors } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import { useChangePassword } from '../queries';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Re-enter the new password'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.password !== v.currentPassword, { path: ['password'], message: 'Choose a password different from the current one' });
type Values = z.infer<typeof schema>;
const FIELDS: (keyof Values)[] = ['currentPassword', 'password', 'confirmPassword'];

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-caption font-medium text-destructive">
      {message}
    </p>
  );
}

export function PasswordCard() {
  const change = useChangePassword();
  const { register, handleSubmit, reset, setError, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });
  const errors = formState.errors;
  const [password, confirm] = watch(['password', 'confirmPassword']);
  const matches = confirm.length > 0 && confirm === password;

  const onSubmit = handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: (res) => {
        toast.success('Password changed', { description: res.message ?? 'Other devices were signed out.' });
        reset();
      },
      onError: (err) => {
        const errs = fieldErrors(err);
        let focus = true;
        for (const f of FIELDS) {
          if (errs[f]) {
            setError(f, { type: 'server', message: errs[f] }, { shouldFocus: focus });
            focus = false;
          }
        }
        toast.error('Could not change password', { description: getErrorMessage(err) });
      },
    }),
  );

  const a11y = (id: string, error?: string) => ({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined });

  return (
    <SectionCard
      title="Change password"
      description="Changing it signs you out on your other devices."
      actions={<KeyRound className="size-4 text-muted-foreground" aria-hidden />}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Current password</Label>
          <PasswordInput {...a11y('pw-current', errors.currentPassword?.message)} autoComplete="current-password" {...register('currentPassword')} />
          <ErrorText id="pw-current-error" message={errors.currentPassword?.message} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New password</Label>
            <PasswordInput {...a11y('pw-new', errors.password?.message)} autoComplete="new-password" {...register('password')} />
            <ErrorText id="pw-new-error" message={errors.password?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <PasswordInput {...a11y('pw-confirm', errors.confirmPassword?.message)} autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword ? (
              <ErrorText id="pw-confirm-error" message={errors.confirmPassword.message} />
            ) : (
              confirm && (
                <p className={matches ? 'text-caption font-medium text-success' : 'text-caption text-muted-foreground'} aria-live="polite">
                  {matches ? '✓ Passwords match' : 'Passwords don’t match yet'}
                </p>
              )
            )}
          </div>
        </div>
        <div className="rounded-xl border bg-muted/20 p-3.5">
          <PasswordChecklist value={password} />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={!formState.isDirty || change.isPending} onClick={() => reset()}>
            Clear
          </Button>
          <Button type="submit" variant="gradient" loading={change.isPending}>
            Update password
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
