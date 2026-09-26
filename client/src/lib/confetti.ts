import confetti from 'canvas-confetti';

/** Small, brand-coloured burst for successful validations. Skipped under reduced motion. */
export function celebrate(origin?: { x: number; y: number }) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  void confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 32,
    scalar: 0.8,
    ticks: 140,
    origin: origin ?? { x: 0.5, y: 0.25 },
    colors: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'],
    disableForReducedMotion: true,
  });
}
