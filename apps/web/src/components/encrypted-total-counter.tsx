"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "0123456789ABCDEF";
const TICK_MS = 75;
const REVEAL_PROBABILITY = 0.7;

/// Above-the-fold proof: protocol-wide total raised, rendered as a giant
/// flickering number on a 3D-tilted control panel. Cursor parallax, visible
/// thickness via a translated back face, glowing spine along the top edge,
/// accent-tinted drop shadow that lifts on hover.
export function EncryptedTotalCounter() {
  const [total, setTotal] = useState(186_420);
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // 3D state
  const panelRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    function schedule() {
      const delay = 4000 + Math.random() * 5000;
      timeoutId = setTimeout(() => {
        setTotal((t) => t + Math.floor(Math.random() * 200) + 25);
        setLastUpdate(Date.now());
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), TICK_MS);
    return () => clearInterval(id);
  }, []);

  function handleMouseMove(e: React.MouseEvent) {
    const node = panelRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    // Wide panel — keep tilt subtle (max ±3°)
    setTilt({ x: -dy * 3, y: dx * 3 });
  }

  function handleMouseLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  const formatted = `$${total.toLocaleString("en-US")}`;
  const secondsAgo =
    mounted && lastUpdate
      ? Math.max(1, Math.floor((Date.now() - lastUpdate) / 1000))
      : 0;

  // Default forward tilt — like a control panel angled toward the viewer.
  const baseX = -2;
  const transform = `rotateX(${baseX + tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${hovered ? 14 : 0}px)`;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary/70">
            [ 01 / proof ]
          </span>
          <h2 className="font-display text-base font-medium uppercase tracking-tight text-foreground">
            protocol total
          </h2>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          // last updated {secondsAgo > 0 ? `${secondsAgo}s ago` : "—"}
        </span>
      </div>

      {/* 3D stage — perspective lives on the wrapper, panel rotates inside */}
      <div
        className="relative px-2 py-6 sm:px-6 sm:py-8"
        style={{ perspective: "1800px" }}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={panelRef}
          className="counter-panel relative overflow-hidden border border-border bg-card/40"
          style={{
            transformStyle: "preserve-3d",
            transform,
            transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            boxShadow:
              "0 32px 80px -20px hsla(49, 100%, 50%, 0.4), 0 12px 32px -10px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* BACK FACE — visible thickness when the panel is rotated */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 border border-primary/15 bg-card"
            style={{ transform: "translateZ(-22px)" }}
          />

          {/* TOP SPINE — bright bar with stacked glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 h-[3px] bg-primary"
            style={{
              boxShadow:
                "0 0 16px hsla(49, 100%, 50%, 0.7), 0 0 32px hsla(49, 100%, 50%, 0.35)",
            }}
          />
          {/* Bottom shadow line */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
          />

          {/* Surface lighting — radial gradient implying light from top */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 30% 0%, hsla(49, 100%, 50%, 0.12), transparent 65%)",
            }}
          />

          {/* Existing aurora + scanline layers */}
          <div className="counter-aurora pointer-events-none absolute inset-0" aria-hidden />
          <div className="counter-scan pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

          {/* Corner brackets */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-primary/70"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-primary/70"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-primary/70"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-primary/70"
          />

          {/* Top status strip */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-border/60 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
              <span className="text-primary">live · all campaigns</span>
            </span>
            <span className="hidden text-muted-foreground/70 sm:inline">
              test mode
            </span>
          </div>

          {/* Body — the giant number */}
          <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16">
            <div className="font-display text-4xl font-medium leading-none tracking-tight tabular-nums sm:text-6xl md:text-7xl lg:text-8xl">
              <FlickerNumber text={formatted} tick={tick} mounted={mounted} />
            </div>

            {/* Privacy meter */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex flex-1 items-stretch gap-[2px]" aria-hidden>
                {Array.from({ length: 32 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-[10px] flex-1 bg-primary"
                    style={{ opacity: 0.55 + (i / 32) * 0.45 }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary tabular-nums">
                100% private
              </span>
            </div>

            {/* Three explainer columns */}
            <div className="mt-8 grid gap-3 border-t border-border/60 pt-5 font-mono text-[10px] uppercase tracking-widest sm:grid-cols-3">
              <div>
                <div className="text-primary">total raised</div>
                <div className="mt-1 text-muted-foreground/80">
                  visible · provably accurate
                </div>
              </div>
              <div>
                <div className="text-primary">individual amounts</div>
                <div className="mt-1 text-muted-foreground/80">
                  encrypted · unseen by anyone
                </div>
              </div>
              <div>
                <div className="text-primary">recipient wallet</div>
                <div className="mt-1 text-muted-foreground/80">
                  public · verifiable on Etherscan
                </div>
              </div>
            </div>
          </div>

          {/* Bottom status strip */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-t border-border/60 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>↳ public total · per-donor amounts encrypted</span>
            <span className="hidden text-primary/60 md:inline">
              // no fee · network costs only
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlickerNumber({
  text,
  tick,
  mounted,
}: {
  text: string;
  tick: number;
  mounted: boolean;
}) {
  if (!mounted) return <span>{text}</span>;
  return (
    <span className="inline-flex">
      {[...text].map((ch, i) => {
        if (ch === "$" || ch === "," || ch === " " || ch === ".") {
          return <span key={i}>{ch}</span>;
        }
        const r = ((i * 1103515245 + tick * 12345) >>> 0) / 0xffffffff;
        if (r < REVEAL_PROBABILITY) return <span key={i}>{ch}</span>;
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        return (
          <span key={i} className="text-primary/65">
            {g}
          </span>
        );
      })}
    </span>
  );
}
