"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrivacyBadge({
  label = "ENCRYPTED",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary",
        className,
      )}
    >
      <Lock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
