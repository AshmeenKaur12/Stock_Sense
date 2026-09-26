import { motion } from 'framer-motion';
import { Eye, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RoleGate } from '@/components/common/guards';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Muted "View only" chip shown in place of write actions for read-only roles. */
export function ViewOnlyHint({ role }: { role: Role }) {
  const who = role === 'admin' ? 'an admin' : 'a manager';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed px-3 text-[12.5px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Eye className="size-3.5" aria-hidden />
          View only
        </span>
      </TooltipTrigger>
      <TooltipContent>Ask {who} to make changes here.</TooltipContent>
    </Tooltip>
  );
}

interface SettingsPageProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  /** Primary action, rendered only for `writeRole` and above. */
  action?: ReactNode;
  writeRole: Role;
  /** Filters / search row rendered above the content. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Scaffold shared by every settings page: header, role-gated action, toolbar, content. */
export function SettingsPage({ icon: Icon, title, description, action, writeRole, toolbar, children, className }: SettingsPageProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      aria-labelledby="settings-page-title"
      className={cn('min-w-0 space-y-5', className)}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card shadow-card">
            <Icon className="size-[18px] text-primary" strokeWidth={1.9} aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 id="settings-page-title" className="text-h2 sm:text-xl">
              {title}
            </h2>
            <p className="max-w-2xl text-[13.5px] leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        {action && (
          <div className="flex shrink-0 items-center gap-2 sm:pt-1">
            <RoleGate min={writeRole} fallback={<ViewOnlyHint role={writeRole} />}>
              {action}
            </RoleGate>
          </div>
        )}
      </header>
      {toolbar && <div className="flex min-w-0 flex-wrap items-center gap-2">{toolbar}</div>}
      {children}
    </motion.section>
  );
}
