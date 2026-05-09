"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/// LED-segment progress meter. Each cell is a small filled/unfilled rectangle
/// that snaps on as `raised/goal` rises. The "leading" cell (next to be lit)
/// pulses, signalling live progress.
export function ProgressBar({
  raised,
  goal,
  cells = 24,
  compact = false,
  showAmount = true,
}: {
  raised: number;
  goal: number;
  cells?: number;
  compact?: boolean;
  showAmount?: boolean;
}) {
  const pct = goal > 0 ? Math.min(1, raised / goal) : 0;
  const targetLit = Math.round(pct * cells);
  const funded = raised >= goal && goal > 0;

  // Light cells one at a time on mount / change — feels like real hardware.
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (lit === targetLit) return;
    const id = setTimeout(() => {
      setLit((n) => (n < targetLit ? n + 1 : n - 1));
    }, 28);
    return () => clearTimeout(id);
  }, [lit, targetLit]);

  return (
    <div className={cn("space-y-2 font-mono", compact && "space-y-1.5")}>
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="flex flex-1 items-stretch gap-[2px]"
        >
          {Array.from({ length: cells }).map((_, i) => {
            const isLit = i < lit;
            const isLeading = i === lit && !funded;
            return (
              <span
                key={i}
                className={cn(
                  "h-[14px] flex-1 transition-[background-color,box-shadow] duration-200",
                  isLit
                    ? funded
                      ? "bg-primary shadow-[0_0_8px_var(--tw-shadow-color)] shadow-primary/50"
                      : "bg-primary"
                    : isLeading
                      ? "anim-pulse-yellow bg-primary/40"
                      : "bg-muted-foreground/15",
                )}
              />
            );
          })}
        </div>
        <span
          className={cn(
            "min-w-[3.5em] text-right font-mono text-[11px] uppercase tracking-widest tabular-nums",
            funded ? "text-primary" : "text-muted-foreground",
          )}
        >
          {Math.round(pct * 100)}%
        </span>
      </div>
      {showAmount && (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
          <span className={funded ? "text-primary" : "text-foreground"}>
            {formatUsd(raised)}
          </span>
          <span className="text-muted-foreground">of {formatUsd(goal)}</span>
        </div>
      )}
    </div>
  );
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: amount >= 1_000_000 ? "compact" : "standard",
  }).format(amount);
}
