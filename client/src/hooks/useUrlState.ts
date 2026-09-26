import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Typed URL-query state: filters, search, view mode and page live in the URL so
 * they survive refreshes and can be shared. Values equal to their default are
 * omitted from the URL. Changing any key other than `page` resets `page`.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const v = params.get(key as string);
      if (v !== null) out[key] = v as T[keyof T];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const touchesOther = Object.keys(patch).some((k) => k !== 'page');
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '' || v === defaults[k]) next.delete(k);
            else next.set(k, String(v));
          }
          if (touchesOther && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  return [state, update, reset] as const;
}
