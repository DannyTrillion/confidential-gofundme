"use client";

import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryPill({
  category,
  className,
}: {
  category: number;
  className?: string;
}) {
  const c = getCategory(category);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      <span className="inline-block h-1 w-1 bg-primary" />
      {c.label}
    </span>
  );
}
