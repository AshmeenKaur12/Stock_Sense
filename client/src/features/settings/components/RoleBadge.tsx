import { Shield, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';

export const ROLE_META: Record<Role, { label: string; description: string; icon: LucideIcon; className: string }> = {
  staff: {
    label: 'Staff',
    description: 'Runs operations: receipts, deliveries, transfers and counts.',
    icon: UserRound,
    className: 'border-border bg-muted text-muted-foreground',
  },
  manager: {
    label: 'Manager',
    description: 'Everything staff can do, plus products, contacts and reorder rules.',
    icon: Shield,
    className: 'border-info/25 bg-info/10 text-info',
  },
  admin: {
    label: 'Admin',
    description: 'Full access, including warehouses, locations and team members.',
    icon: ShieldCheck,
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const m = ROLE_META[role];
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-4', m.className, className)}>
      <m.icon className="size-3" aria-hidden />
      {m.label}
    </span>
  );
}
