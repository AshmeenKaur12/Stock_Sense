import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Animates from the previous value to `target` (ease-out). Jumps instantly under reduced motion. */
export function useCountUp(target: number, duration = 0.9): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const from = useRef(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      from.current = target;
      return;
    }
    const controls = animate(from.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    from.current = target;
    return () => controls.stop();
  }, [target, duration, reduce]);

  return value;
}
