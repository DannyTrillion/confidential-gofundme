"use client";

import { cn } from "@/lib/utils";

export function CoverImage({
  src,
  alt = "",
  className,
  aspectClass = "aspect-[5/2]",
}: {
  src?: string;
  alt?: string;
  className?: string;
  aspectClass?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden border border-border bg-card/50",
          aspectClass,
          className,
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
          // no cover
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border border-border bg-card/50",
        aspectClass,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* corner brackets */}
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-primary/70" />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-primary/70" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-primary/70" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-primary/70" />
    </div>
  );
}
