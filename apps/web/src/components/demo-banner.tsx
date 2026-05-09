"use client";

import { DEMO_MODE } from "@/lib/demo";

export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="border-b border-primary/30 bg-primary/10">
      <div className="container flex items-center gap-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
        <span className="inline-block h-1.5 w-1.5 animate-blink bg-primary" />
        <span className="text-primary/90">// preview mode</span>
        <span className="text-primary/60">not connected to real money — buttons won&apos;t actually do anything</span>
      </div>
    </div>
  );
}
