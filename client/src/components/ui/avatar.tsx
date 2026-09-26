import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as React from 'react';
import { cn } from '@/lib/utils';

type AvatarStatus = 'online' | 'offline' | 'busy';

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    status?: AvatarStatus;
  }
>(({ className, status, children, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex size-8 shrink-0 overflow-hidden rounded-full',
      className,
    )}
    {...props}
  >
    {children}
    {status && (
      <span
        aria-label={status}
        className={cn(
          'absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background',
          status === 'online' && 'bg-success',
          status === 'offline' && 'bg-muted-foreground',
          status === 'busy' && 'bg-warning',
        )}
      />
    )}
  </AvatarPrimitive.Root>
));

Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square size-full object-cover', className)}
    {...props}
  />
));

AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white',
      className,
    )}
    {...props}
  />
));

AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
