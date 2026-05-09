"use client";

import { useEffect, useRef, useState } from "react";

/// Animates a numeric value counting up from 0 (or from the previous value)
/// when `value` changes. Uses requestAnimationFrame, easeOutCubic.
export function CountUp({
  value,
  duration = 900,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startedAtRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function tick(t: number) {
      if (startedAtRef.current === null) startedAtRef.current = t;
      const elapsed = t - startedAtRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const out = format ? format(display) : Math.round(display).toLocaleString();
  return <span className={className}>{out}</span>;
}
