"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Donor = { name: string; amount: string; time: string };

const DONORS: Donor[] = [
  { name: "Sarah K.", amount: "$250", time: "2h ago" },
  { name: "Anonymous", amount: "$100", time: "5h ago" },
  { name: "Mike Johnson", amount: "$500", time: "1d ago" },
  { name: "Linda P.", amount: "$50", time: "1d ago" },
  { name: "Daniel A.", amount: "$150", time: "2d ago" },
  { name: "Akira T.", amount: "$350", time: "2d ago" },
];

/// A/B comparison rendered as two physical-feeling 3D cards. They lean
/// toward each other by default, follow the cursor with a subtle parallax
/// tilt, and have visible thickness via a translated back face + a glowing
/// spine on the outer edge (red for exposed, yellow for encrypted).
export function ComparisonSplit() {
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary/70">
            [ 02 / contrast ]
          </span>
          <h2 className="font-display text-base font-medium uppercase tracking-tight text-foreground">
            before / after
          </h2>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          // identical campaign · two platforms
        </span>
      </div>

      <div className="space-y-5">
        <h3 className="font-display text-2xl font-medium uppercase leading-tight tracking-tight sm:text-3xl">
          The same fundraiser,{" "}
          <span className="text-primary">before and after privacy</span>.
        </h3>
        <p className="max-w-2xl text-sm text-muted-foreground">
          On a normal fundraising platform, every donor&apos;s name and exact amount sits on
          a public leaderboard. On Confidential GoFundMe, individual donation amounts are encrypted
          on-chain — donors aren&apos;t named in a leaderboard, and only the running total
          is publicly visible.
        </p>
      </div>

      {/* 3D stage — perspective is shared so both cards live in the same space */}
      <div
        className="relative grid items-stretch gap-8 px-2 py-10 md:grid-cols-2 md:gap-10 md:px-6 md:py-16"
        style={{ perspective: "1600px" }}
      >
        <ComparisonCard variant="exposed" />
        <ComparisonCard variant="private" />

        {/* Floating transformation chip at the seam */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <div className="flex flex-col items-center gap-1 border-2 border-primary bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-primary shadow-[0_0_28px_hsla(49,100%,50%,0.45)]">
            <span className="text-base leading-none">→</span>
            <span>encrypt</span>
          </div>
        </div>
      </div>

      {/* Tradeoff captions */}
      <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
        <div className="bg-background p-4 font-mono text-[10px] uppercase tracking-widest text-destructive/80">
          ↳ donor names, exact amounts, leaderboard rank — all visible to anyone
        </div>
        <div className="bg-background p-4 font-mono text-[10px] uppercase tracking-widest text-primary">
          ↳ only the running total · individual amounts encrypted on-chain
        </div>
      </div>
    </section>
  );
}

function ComparisonCard({ variant }: { variant: "exposed" | "private" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const isPrivate = variant === "private";
  // Default lean: cards angle toward each other.
  const baseY = isPrivate ? -5 : 5;

  function handleMouseMove(e: React.MouseEvent) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    // Up to ±5° additional tilt from cursor parallax
    setTilt({ x: -dy * 5, y: dx * 5 });
  }

  function handleMouseLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  const transform = `rotateY(${baseY + tilt.y}deg) rotateX(${tilt.x}deg) translateZ(${hovered ? 18 : 0}px)`;
  const exposedFields = isPrivate
    ? "1 number"
    : `${DONORS.length} names · ${DONORS.length} amounts · 1 number`;

  return (
    <div
      ref={ref}
      className="relative h-full"
      style={{ transformStyle: "preserve-3d", perspective: "inherit" }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* The 3D card */}
      <div
        className={cn(
          "relative h-full bg-card/92 transition-transform duration-300",
          isPrivate ? "ring-1 ring-primary/40" : "ring-1 ring-destructive/30",
        )}
        style={{
          transformStyle: "preserve-3d",
          transform,
          transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          boxShadow: isPrivate
            ? "0 24px 60px -20px hsla(49, 100%, 50%, 0.45), 0 8px 24px -10px rgba(0, 0, 0, 0.6)"
            : "0 24px 60px -20px hsla(0, 75%, 55%, 0.35), 0 8px 24px -10px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* BACK FACE — translated backward to create visible card thickness on the angled edges */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 border bg-card",
            isPrivate ? "border-primary/15" : "border-destructive/15",
          )}
          style={{ transform: "translateZ(-18px)" }}
        />

        {/* SPINE — bright bar on the OUTER edge (away from the seam) */}
        <span
          aria-hidden
          className={cn(
            "absolute top-0 bottom-0 w-[3px]",
            isPrivate ? "right-0 bg-primary" : "left-0 bg-destructive",
          )}
          style={{
            boxShadow: isPrivate
              ? "0 0 14px hsla(49, 100%, 50%, 0.7), 0 0 28px hsla(49, 100%, 50%, 0.35)"
              : "0 0 10px hsla(0, 75%, 55%, 0.5)",
          }}
        />

        {/* Top thin highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0 h-px"
          style={{
            background: isPrivate
              ? "linear-gradient(to right, transparent, hsla(49, 100%, 50%, 0.6), transparent)"
              : "linear-gradient(to right, transparent, hsla(0, 75%, 55%, 0.45), transparent)",
          }}
        />
        {/* Bottom thin shadow */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        />

        {/* Surface lighting — subtle gradient across the face */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: isPrivate
              ? "radial-gradient(80% 60% at 30% 0%, hsla(49, 100%, 50%, 0.10), transparent 60%)"
              : "radial-gradient(80% 60% at 30% 0%, hsla(0, 75%, 55%, 0.08), transparent 60%)",
          }}
        />

        {/* Corner brackets — kept from prior design but re-tinted */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t",
            isPrivate ? "border-primary/70" : "border-destructive/60",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t",
            isPrivate ? "border-primary/70" : "border-destructive/60",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l",
            isPrivate ? "border-primary/70" : "border-destructive/60",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r",
            isPrivate ? "border-primary/70" : "border-destructive/60",
          )}
        />

        {/* CONTENT */}
        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {isPrivate ? "Confidential GoFundMe" : "Traditional platform"}
              </span>
              <h3 className="mt-1 font-display text-lg font-medium uppercase tracking-tight sm:text-xl">
                Maria&apos;s medical fund
              </h3>
            </div>
            <span
              className={cn(
                "border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest",
                isPrivate
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              {isPrivate ? "encrypted" : "fully public"}
            </span>
          </div>

          {/* Public data row */}
          <div
            className={cn(
              "mt-5 flex items-baseline justify-between border px-3 py-2",
              isPrivate
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              public data
            </span>
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest tabular-nums",
                isPrivate ? "text-primary" : "text-destructive",
              )}
            >
              {exposedFields}
            </span>
          </div>

          {/* Goal/raised */}
          <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-border">
            <div className="bg-card/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Goal
              </div>
              <div className="mt-1 font-mono text-lg font-medium">$5,000</div>
            </div>
            <div className="bg-card/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Raised
              </div>
              <div className="mt-1 font-mono text-lg font-medium text-primary">
                $3,400{" "}
                <span className="text-sm text-muted-foreground">(68%)</span>
              </div>
            </div>
          </div>

          {/* Donor list */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Recent donors
              </span>
              {!isPrivate && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-destructive/80">
                  ↓ everyone sees this
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {DONORS.map((d, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span
                    className={cn(
                      isPrivate
                        ? "text-muted-foreground"
                        : "font-medium text-foreground",
                    )}
                  >
                    {isPrivate ? "Anonymous" : d.name}
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={cn(
                        "font-mono",
                        isPrivate ? "text-primary/80" : "text-foreground",
                      )}
                    >
                      {isPrivate ? "***" : d.amount}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      {d.time}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
