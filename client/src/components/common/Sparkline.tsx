import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  className?: string;
  /** Tailwind text-* class; the line uses currentColor. */
  colorClassName?: string;
  width?: number;
  height?: number;
}

/** Dependency-free SVG sparkline with a soft gradient fill. */
export function Sparkline({ data, className, colorClassName = 'text-primary', width = 96, height = 32 }: SparklineProps) {
  const id = useId().replace(/:/g, '');
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const step = width / (data.length - 1);
    const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)] as const);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { line: d, area: `${d} L${width},${height} L0,${height} Z` };
  }, [data, width, height]);

  if (!line) return <div className={cn('h-8 w-24', className)} />;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn(colorClassName, className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
