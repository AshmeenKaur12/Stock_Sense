import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { useHotkeys } from '@/hooks/useHotkeys';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  /** Called after the user stops typing for `debounceMs`. */
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  /** Bind the global `/` shortcut to focus this input (one per page). */
  shortcut?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Debounced search field that widens on focus, with a clear button and `/` shortcut. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  shortcut = true,
  className,
  'aria-label': ariaLabel,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep in sync when the URL (source of truth) changes externally.
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChangeRef.current(draft.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [draft, value, debounceMs]);

  useHotkeys(shortcut ? [{ combo: '/', handler: () => inputRef.current?.focus() }] : []);

  return (
    <div className={cn('group relative w-full sm:w-64 sm:transition-[width] sm:duration-panel sm:ease-brand sm:focus-within:w-80', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (draft) setDraft('');
            else inputRef.current?.blur();
          }
          if (e.key === 'Enter') onChangeRef.current(draft.trim());
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-9 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-micro placeholder:text-muted-foreground/80 focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:ring-offset-0 dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onChangeRef.current('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        shortcut && <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 group-focus-within:hidden">/</Kbd>
      )}
    </div>
  );
}
