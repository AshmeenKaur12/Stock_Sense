import { useEffect, useRef } from 'react';
import { isTypingTarget } from '@/lib/utils';

export interface Hotkey {
  /** Single key (`/`, `n`), modifier combo (`mod+k`) or a two-key sequence (`g d`). */
  combo: string;
  handler: (e: KeyboardEvent) => void;
  /** Fire even while typing in an input (only sensible for modifier combos). */
  allowInInputs?: boolean;
}

const SEQUENCE_TIMEOUT = 900;

function matchesCombo(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop();
  const wantMod = parts.includes('mod');
  const wantShift = parts.includes('shift');
  const hasMod = e.metaKey || e.ctrlKey;
  return e.key.toLowerCase() === key && wantMod === hasMod && wantShift === e.shiftKey && !e.altKey;
}

/** Tiny global keyboard-shortcut hook supporting combos and `g then d` style sequences. */
export function useHotkeys(hotkeys: Hotkey[]) {
  const ref = useRef(hotkeys);
  ref.current = hotkeys;

  useEffect(() => {
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const typing = isTypingTarget(e.target);

      for (const hk of ref.current) {
        const seq = hk.combo.split(' ');
        if (typing && !hk.allowInInputs) continue;

        if (seq.length === 2) {
          if (pending === seq[0] && matchesCombo(e, seq[1]!)) {
            e.preventDefault();
            pending = null;
            hk.handler(e);
            return;
          }
        } else if (matchesCombo(e, hk.combo)) {
          e.preventDefault();
          hk.handler(e);
          return;
        }
      }

      // Arm a sequence prefix (e.g. "g") if some hotkey starts with it.
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (ref.current.some((hk) => hk.combo.split(' ').length === 2 && hk.combo.startsWith(`${key} `))) {
          pending = key;
          clearTimeout(timer);
          timer = setTimeout(() => (pending = null), SEQUENCE_TIMEOUT);
          return;
        }
      }
      pending = null;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, []);
}
