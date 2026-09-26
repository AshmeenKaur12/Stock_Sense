import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Stacked-cube glyph filled with the brand gradient, with a live "pulse" dot. */
export function LogoMark({ className, pulse = true }: { className?: string; pulse?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={cn('relative inline-flex size-8 shrink-0', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="size-full drop-shadow-[0_4px_12px_hsl(var(--brand-via)/0.45)]">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366F1" />
            <stop offset="0.55" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        {/* top face */}
        <path d="M16 3 27 9.2 16 15.4 5 9.2z" fill={`url(#${id}-g)`} />
        {/* left face */}
        <path d="M5 11.4 15 17v11.6L5 23z" fill={`url(#${id}-g)`} opacity={0.72} />
        {/* right face */}
        <path d="M27 11.4 17 17v11.6L27 23z" fill={`url(#${id}-g)`} opacity={0.5} />
        <path d="M16 3 27 9.2 16 15.4 5 9.2z" fill="none" stroke="white" strokeOpacity={0.35} strokeWidth={0.8} strokeLinejoin="round" />
      </svg>
      {pulse && (
        <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full border-2 border-background bg-success" />
        </span>
      )}
    </span>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {showText && <span className="text-[15px] font-semibold tracking-tight">StockSense</span>}
    </span>
  );
}
