import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const stagger = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

export const NAV_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it Works' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'operations', label: 'Operations' },
  { id: 'contact', label: 'Contact' },
] as const;

export type SectionId = (typeof NAV_LINKS)[number]['id'];

/** Smooth-scrolls to an on-page section, updates the hash and moves focus for keyboard users. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
  el.focus({ preventScroll: true });
}

/** Fades + rises its children into view once. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li';
}) {
  const Comp = as === 'li' ? motion.li : motion.div;
  return (
    <Comp
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: fadeUp.hidden, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay } } }}
      className={className}
    >
      {children}
    </Comp>
  );
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={stagger(0.08)}
      className={cn('flex max-w-2xl flex-col gap-3', align === 'center' ? 'mx-auto items-center text-center' : 'items-start', className)}
    >
      <motion.span
        variants={fadeUp}
        className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground"
      >
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        {eyebrow}
      </motion.span>
      <motion.h2 variants={fadeUp} id={id} className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </motion.h2>
      {description && (
        <motion.p variants={fadeUp} className="text-pretty text-base leading-relaxed text-muted-foreground">
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}

/** Shared section wrapper: landmark + heading link + scroll offset for the sticky header. */
export function Section({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      tabIndex={id ? -1 : undefined}
      className={cn('relative scroll-mt-20 py-20 focus-visible:ring-0 focus-visible:ring-offset-0 sm:py-28', className)}
    >
      <div className="container">{children}</div>
    </section>
  );
}
