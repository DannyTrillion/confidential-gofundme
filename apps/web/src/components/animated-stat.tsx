"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/// A stat cell with motion variants:
/// - "count": animates from 0 → `value` on scroll into view (suffix supports "%")
/// - "zero":  stays at 0 forever, gently pulses yellow (heartbeat for "zero exposures")
/// - "literal": renders `display` verbatim, no count
export function AnimatedStat({
  value,
  suffix = "",
  display,
  variant = "count",
  label,
  caption,
  accent = false,
  className,
}: {
  value?: number;
  suffix?: string;
  display?: string;
  variant?: "count" | "zero" | "literal";
  label: string;
  caption?: string;
  accent?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number>(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (variant !== "count" || !ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [variant, started]);

  useEffect(() => {
    if (!started || variant !== "count" || value === undefined) return;
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, variant]);

  let valueNode: React.ReactNode;
  if (variant === "literal") {
    valueNode = display ?? "";
  } else if (variant === "zero") {
    valueNode = <span className="anim-pulse-yellow">0</span>;
  } else {
    valueNode = (
      <span className="tabular-nums">
        {shown}
        {suffix}
      </span>
    );
  }

  return (
    <div ref={ref} className={cn("border border-border bg-card/60 p-4 sm:p-5", className)}>
      <div
        className={cn(
          "font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl lg:text-4xl",
          accent || variant === "zero" ? "text-primary" : "text-foreground",
        )}
      >
        {valueNode}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </div>
      {caption && (
        <div className="mt-2 text-[11px] leading-snug text-muted-foreground/80 sm:mt-3 sm:text-xs">
          {caption}
        </div>
      )}
    </div>
  );
}
