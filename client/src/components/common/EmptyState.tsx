import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-brand-gradient opacity-20 blur-2xl" />
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-card shadow-card">
          <Icon className="size-6 text-primary" strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
