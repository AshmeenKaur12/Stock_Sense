import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Rendered right after the title (count, status badge…). */
  titleAdornment?: ReactNode;
  className?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
        {items.map((c, i) => (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" aria-hidden />}
            <li>
              {c.to && i < items.length - 1 ? (
                <Link to={c.to} className="rounded transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={i === items.length - 1 ? 'page' : undefined} className={i === items.length - 1 ? 'text-foreground/80' : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, eyebrow, breadcrumbs, titleAdornment, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0 space-y-1.5">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && !breadcrumbs && <div className="caption-label">{eyebrow}</div>}
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h1 className="truncate text-h1 sm:text-[26px] sm:leading-8">{title}</h1>
          {titleAdornment}
        </div>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
