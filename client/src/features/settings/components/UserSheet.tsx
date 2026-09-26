import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, UserPlus, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PasswordInput } from '@/features/auth/components/FormBits';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import type { PublicUser, Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '../api';
import { INVALIDATES, useSettingsMutation } from '../queries';
import { userCreateSchema, userEditSchema, type UserCreateForm, type UserEditForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';
import { ROLE_META } from './RoleBadge';

const ROLES: Role[] = ['staff', 'manager', 'admin'];

/** Radio-card role picker with a one-line description of each role. */
function RolePicker<T extends { role: Role }>({ control, disabled }: { control: Control<T>; disabled?: boolean }) {
  return (
    <Controller
      control={control as unknown as Control<{ role: Role }>}
      name="role"
      render={({ field }) => (
        <div role="radiogroup" aria-label="Role" className="grid gap-2">
          {ROLES.map((r) => {
            const m = ROLE_META[r];
            const checked = field.value === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => field.onChange(r)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
                  checked ? 'border-primary/40 bg-primary/[0.06]' : 'hover:bg-accent/50',
                )}
              >
                <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', checked ? 'border-primary' : 'border-input')} aria-hidden>
                  {checked && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium">
                    <m.icon className={cn('size-3.5', checked ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                    {m.label}
                  </span>
                  <span className="block text-caption text-muted-foreground">{m.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    />
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser | null;
  isSelf: boolean;
}

function CreateUserSheet({ open, onOpenChange }: Omit<Props, 'user' | 'isSelf'>) {
  const { register, handleSubmit, reset, setError, control, watch, formState } = useForm<UserCreateForm>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { loginId: '', email: '', name: '', password: '', role: 'staff' },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset({ loginId: '', email: '', name: '', password: '', role: 'staff' });
  }, [open, reset]);

  const save = useSettingsMutation((v: UserCreateForm) => usersApi.create({ ...v, name: v.name || undefined }), INVALIDATES.users);
  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved('User created', `${values.loginId} can now sign in as ${ROLE_META[values.role].label.toLowerCase()}.`);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, ['loginId', 'email', 'name', 'password', 'role']),
    }),
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={UserPlus}
      title="Invite a team member"
      description="Create a login for a colleague and choose what they can do."
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel="Create user"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow id="u-login" label="Login ID" required error={errors.loginId?.message} hint="6–12 characters.">
          <Input {...fieldA11y('u-login', errors.loginId?.message, 'hint')} placeholder="riya.s" maxLength={12} autoComplete="off" spellCheck={false} className="font-mono" {...register('loginId')} />
        </FormRow>
        <FormRow id="u-name" label="Full name" optional error={errors.name?.message}>
          <Input {...fieldA11y('u-name', errors.name?.message)} placeholder="Riya Sharma" autoComplete="off" {...register('name')} />
        </FormRow>
      </div>
      <FormRow id="u-email" label="Email" required error={errors.email?.message}>
        <Input {...fieldA11y('u-email', errors.email?.message)} type="email" inputMode="email" placeholder="riya@company.in" autoComplete="off" {...register('email')} />
      </FormRow>
      <FormRow id="u-password" label="Temporary password" required error={errors.password?.message}>
        <PasswordInput {...fieldA11y('u-password', errors.password?.message)} autoComplete="new-password" {...register('password')} />
      </FormRow>
      <PasswordChecklist value={watch('password')} />
      <div className="space-y-2">
        <div className="text-[13px] font-medium text-foreground/90" aria-hidden>
          Role
        </div>
        <RolePicker control={control} />
      </div>
    </FormSheet>
  );
}

function EditUserSheet({ open, onOpenChange, user, isSelf }: Props) {
  const { register, handleSubmit, reset, setError, control, formState } = useForm<UserEditForm>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { name: '', email: '', role: 'staff', isActive: true },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (open && user) reset({ name: user.name ?? '', email: user.email, role: user.role, isActive: user.isActive });
  }, [open, user, reset]);

  const save = useSettingsMutation(
    (v: UserEditForm) => usersApi.update(user?._id ?? '', isSelf ? { name: v.name, email: v.email } : v),
    INVALIDATES.users,
  );
  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: (res) => {
        if (isSelf && res.data) useAuthStore.getState().setUser(res.data);
        toastSaved('User saved', values.name || user?.loginId);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, ['name', 'email', 'role', 'isActive']),
    }),
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={UserRound}
      title="Edit user"
      description={isSelf ? 'You can’t change your own role or deactivate yourself.' : 'Update details, role or access.'}
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel="Save changes"
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3.5 py-3">
        <div className="min-w-0">
          <div className="caption-label">Login ID</div>
          <div className="truncate font-mono text-sm">{user?.loginId}</div>
        </div>
        <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Read-only" />
      </div>
      <FormRow id="ue-name" label="Full name" optional error={errors.name?.message}>
        <Input {...fieldA11y('ue-name', errors.name?.message)} autoComplete="off" {...register('name')} />
      </FormRow>
      <FormRow id="ue-email" label="Email" required error={errors.email?.message}>
        <Input {...fieldA11y('ue-email', errors.email?.message)} type="email" inputMode="email" autoComplete="off" {...register('email')} />
      </FormRow>
      <div className="space-y-2">
        <div className="text-[13px] font-medium text-foreground/90" aria-hidden>
          Role
        </div>
        <RolePicker control={control} disabled={isSelf} />
      </div>
      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
            <div className="min-w-0">
              <label htmlFor="ue-active" className="text-[13px] font-medium">
                Can sign in
              </label>
              <p className="text-caption text-muted-foreground">Inactive users keep their history but can&apos;t log in.</p>
            </div>
            <Switch id="ue-active" checked={field.value} onCheckedChange={field.onChange} disabled={isSelf} ref={field.ref} />
          </div>
        )}
      />
    </FormSheet>
  );
}

/** Create (no `user`) or edit sheet — both stay mounted so close animations finish. */
export function UserSheet({ open, onOpenChange, user, isSelf }: Props) {
  return (
    <>
      <CreateUserSheet open={open && !user} onOpenChange={onOpenChange} />
      <EditUserSheet open={open && Boolean(user)} onOpenChange={onOpenChange} user={user} isSelf={isSelf} />
    </>
  );
}
