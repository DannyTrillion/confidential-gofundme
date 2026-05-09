"use client";

import { cn } from "@/lib/utils";

export function SectionMarker({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary sm:gap-3 sm:text-[11px] sm:tracking-[0.18em]",
        className,
      )}
    >
      <span className="text-muted-foreground">//</span>
      <span className="truncate">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
