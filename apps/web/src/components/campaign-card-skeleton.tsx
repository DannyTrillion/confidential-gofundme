"use client";

/// Wireframe skeleton matching CampaignCard's silhouette while real cards load.
/// Same chrome (border, padding, cover aspect) so there's zero layout shift.
export function CampaignCardSkeleton() {
  return (
    <div
      className="relative flex h-full flex-col border border-transparent bg-background/60"
      aria-hidden
    >
      {/* cover */}
      <div className="aspect-[5/2] w-full animate-pulse border-b border-border bg-card/50" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="h-3 w-20 animate-pulse bg-muted/60" />
          <span className="h-3 w-12 animate-pulse bg-muted/40" />
        </div>

        {/* title */}
        <div className="mt-2 h-5 w-3/4 animate-pulse bg-muted/60" />
        {/* meta */}
        <div className="h-3 w-1/2 animate-pulse bg-muted/40" />

        {/* progress bar */}
        <div className="mt-4 space-y-2">
          <div className="h-1.5 w-full animate-pulse bg-muted/40" />
          <div className="grid grid-cols-4 gap-1.5">
            <div className="h-1.5 animate-pulse bg-muted/30" />
            <div className="h-1.5 animate-pulse bg-muted/30" />
            <div className="h-1.5 animate-pulse bg-muted/30" />
            <div className="h-1.5 animate-pulse bg-muted/30" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-5 font-mono text-[10px] uppercase tracking-widest">
          <span className="h-2 w-16 animate-pulse bg-muted/40" />
          <span className="sr-only">Loading…</span>
        </div>
      </div>
    </div>
  );
}
