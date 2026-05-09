"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/// Privacy-first LED progress meter. The contract exposes 4 publicly
/// decryptable bucket flags (past25 / past50 / past75 / past100); the
/// precise running total stays encrypted to the beneficiary. So instead
/// of "73%" we render the highest crossed bucket, snapping cells to one
/// of {0, 6, 12, 18, 24} of `cells`.
///
/// `bucketsLit` is the count of `true` buckets (0-4). `goalUsd` is the
/// public goal, shown for context. We deliberately do not show "raised"
/// — that information is no longer public, by design.
export function ProgressBar({
  bucketsLit,
  goalUsd,
  cells = 24,
  compact = false,
  showGoal = true,
}: {
  bucketsLit: 0 | 1 | 2 | 3 | 4;
  goalUsd: number;
  cells?: number;
  compact?: boolean;
  showGoal?: boolean;
}) {
  const targetLit = Math.round((bucketsLit / 4) * cells);
  const funded = bucketsLit >= 4;

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
          aria-valuenow={bucketsLit}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuetext={bucketLabel(bucketsLit)}
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
            "min-w-[5em] text-right font-mono text-[10px] uppercase tracking-widest",
            funded ? "text-primary" : "text-muted-foreground",
          )}
        >
          {bucketLabel(bucketsLit)}
        </span>
      </div>
      {showGoal && (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
          <span className="text-muted-foreground">
            // amounts encrypted · per-donor totals private
          </span>
          <span className="text-muted-foreground">goal {formatUsd(goalUsd)}</span>
        </div>
      )}
    </div>
  );
}

function bucketLabel(bucketsLit: number): string {
  switch (bucketsLit) {
    case 0:
      return "< 25%";
    case 1:
      return "≥ 25%";
    case 2:
      return "≥ 50%";
    case 3:
      return "≥ 75%";
    case 4:
      return "GOAL REACHED";
    default:
      return "—";
  }
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: amount >= 1_000_000 ? "compact" : "standard",
  }).format(amount);
}
