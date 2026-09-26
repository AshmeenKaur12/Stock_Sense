import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SectionCard } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fieldErrors } from '@/lib/api';
import { getErrorMessage } from '@/lib/axios';
import type { PublicUser } from '@/lib/types';
import { useUpdateProfile } from '../queries';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Keep it under 60 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(120),
});
type Values = z.infer<typeof schema>;

export function AccountDetailsCard({ user }: { user: PublicUser }) {
  const update = useUpdateProfile();
  const { register, handleSubmit, reset, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name ?? '', email: user.email },
  });
  const { errors, isDirty } = formState;

  useEffect(() => {
    reset({ name: user.name ?? '', email: user.email });
  }, [user.name, user.email, reset]);

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: () => toast.success('Profile saved', { description: 'Your name and email are up to date.' }),
      onError: (err) => {
        for (const [field, message] of Object.entries(fieldErrors(err))) {
          if (field === 'name' || field === 'email') setError(field, { type: 'server', message }, { shouldFocus: true });
        }
        toast.error('Could not save profile', { description: getErrorMessage(err) });
      },
    }),
  );

  return (
    <SectionCard title="Account details" description="How you appear on operations, moves and notifications.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Full name</Label>
            <Input id="pf-name" autoComplete="name" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'pf-name-error' : undefined} {...register('name')} />
            {errors.name && (
              <p id="pf-name-error" role="alert" className="text-caption font-medium text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-email">Email</Label>
            <Input id="pf-email" type="email" inputMode="email" autoComplete="email" aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? 'pf-email-error' : undefined} {...register('email')} />
            {errors.email && (
              <p id="pf-email-error" role="alert" className="text-caption font-medium text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-login">Login ID</Label>
          <div className="relative">
            <Input id="pf-login" value={user.loginId} readOnly aria-readonly aria-describedby="pf-login-hint" className="cursor-default bg-muted/40 pr-10 font-mono text-muted-foreground focus-visible:ring-0 dark:bg-muted/40" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Login ID is locked">
                  <Lock className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Login IDs can&apos;t be changed.</TooltipContent>
            </Tooltip>
          </div>
          <p id="pf-login-hint" className="text-caption text-muted-foreground">
            Used to sign in. Ask an admin if it needs to change.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={!isDirty || update.isPending} onClick={() => reset()}>
            Discard
          </Button>
          <Button type="submit" variant="gradient" disabled={!isDirty} loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
