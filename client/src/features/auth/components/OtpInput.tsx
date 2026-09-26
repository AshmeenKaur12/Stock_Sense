import { motion } from 'framer-motion';
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  success?: boolean;
}

/**
 * 6-box OTP entry: auto-advance, backspace to previous, arrow navigation and
 * full-code paste. Flashes emerald on success and shakes on error.
 */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled, invalid, success }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length && !joined.includes('')) onComplete?.(joined);
  };

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) setAt(i, '');
      else if (i > 0) {
        setAt(i - 1, '');
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const code = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!code) return;
    e.preventDefault();
    onChange(code);
    focus(code.length);
    if (code.length === length) onComplete?.(code);
  };

  return (
    <motion.div
      role="group"
      aria-label="Verification code"
      className="flex justify-between gap-2"
      animate={invalid ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          onPaste={onPaste}
          onKeyDown={(e) => onKeyDown(i, e)}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            if (!digit) return;
            setAt(i, digit);
            if (i < length - 1) focus(i + 1);
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            'tabular size-12 rounded-xl border border-input bg-background text-center font-mono text-xl font-semibold shadow-xs outline-none transition-all duration-micro xs:size-14 dark:bg-input/30',
            'focus:border-transparent focus:shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_4px_hsl(var(--brand-via))]',
            d && 'border-primary/40',
            invalid && 'border-destructive/70 text-destructive',
            success && 'border-success bg-success/10 text-success',
          )}
        />
      ))}
    </motion.div>
  );
}
