import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface AnimatedPurseAmountProps {
  value: number;
  className?: string;
}

export default function AnimatedPurseAmount({ value, className }: AnimatedPurseAmountProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    if (from === to) return;

    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      setDisplayValue(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn('font-mono', className)}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatter.format(displayValue)}
    </span>
  );
}
