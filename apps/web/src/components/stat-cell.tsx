"use client";

import { cn } from "@/lib/utils";

export function StatCell({
  value,
  label,
  caption,
  accent = false,
  className,
}: {
  value: React.ReactNode;
  label: string;
  caption?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("border border-border bg-card/60 p-5", className)}>
      <div
        className={cn(
          "font-mono text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {caption && (
        <div className="mt-3 text-xs text-muted-foreground/80">{caption}</div>
      )}
    </div>
  );
}
