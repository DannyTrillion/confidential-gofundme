"use client";

import { Canvas } from "@react-three/fiber";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DeferredMount } from "@/components/deferred-mount";
import { GlitchReveal } from "@/components/glitch-reveal";
import { SectionMarker } from "@/components/section-marker";
import { cn } from "@/lib/utils";
import { EncryptedCube, NodeGraph, TokenStack, Vault } from "@/components/three/meshes";

const TILT_SPRING = { stiffness: 150, damping: 15 } as const;

type ShowcaseCardProps = {
  index: number;
  total: number;
  tag: string;
  title: string;
  description: string;
  code?: string;
  /// rendered inside <Canvas>
  mesh: React.ReactNode;
  className?: string;
};

function ShowcaseCard({
  index,
  total,
  tag,
  title,
  description,
  code,
  mesh,
  className,
}: ShowcaseCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [hasHover, setHasHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  // ±9° (within the 8–10° brief)
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), TILT_SPRING);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), TILT_SPRING);

  const tiltEnabled = hasHover && !reduce;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!tiltEnabled) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onLeave() {
    setHover(false);
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => tiltEnabled && setHover(true)}
      onMouseLeave={onLeave}
      style={
        tiltEnabled
          ? {
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              transformPerspective: 1000,
            }
          : undefined
      }
      className={cn(
        "group relative flex h-full flex-col bg-background/60 p-6 transition-colors will-change-transform hover:bg-background",
        className,
      )}
    >
      {/* header */}
      <div
        className="flex items-start justify-between"
        style={{ transform: "translateZ(10px)" }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary">
            {tag}
          </span>
        </div>
      </div>

      {/* canvas — deferred until the card scrolls into view so the
          three.js bundle only loads when actually needed */}
      <DeferredMount
        className="mt-4 h-44 w-full sm:h-48"
        fallback={
          <div className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
            // loading mesh…
          </div>
        }
      >
        <div className="h-full w-full" style={{ transformStyle: "flat" }}>
          <Canvas
            camera={{ position: [0, 0, 4.6], fov: 38 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent", width: "100%", height: "100%" }}
          >
            <ambientLight intensity={0.4} />
            {mesh}
          </Canvas>
        </div>
      </DeferredMount>

      <h3
        className="mt-5 font-mono text-base font-semibold leading-tight tracking-tight text-foreground"
        style={{ transform: "translateZ(14px)" }}
      >
        {title}
      </h3>
      <p
        className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground"
        style={{ transform: "translateZ(8px)" }}
      >
        {description}
      </p>

      {code && (
        <div
          className="mt-6 border-t border-border/60 pt-4"
          style={{ transform: "translateZ(8px)" }}
        >
          <code className="block font-mono text-[10px] leading-relaxed text-primary/80">
            <span className="text-muted-foreground/70">{">_"}</span> {code}
          </code>
        </div>
      )}

      {/* hover scan-line */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
      />
      {/* hover corner mark */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-primary transition-opacity duration-300",
          hover ? "opacity-80" : "opacity-0",
        )}
        style={{ transform: "translateZ(4px)" }}
      />
    </motion.article>
  );
}

const SHOWCASE = [
  {
    title: "Your donation, sealed",
    description:
      "When you give, your amount is locked before it ever leaves your device. The cube on the outside is the locked envelope. The shape inside is your gift — no one can open it.",
    tag: "Your amount",
    mesh: <EncryptedCube />,
  },
  {
    title: "A safe place for the funds",
    description:
      "All donations sit in a vault until the recipient withdraws. The recipient wallet is published on-chain so donors can verify it before they give — what stays sealed inside is each individual amount.",
    tag: "The vault",
    mesh: <Vault />,
  },
  {
    title: "Many helpers, no peeking",
    description:
      "Computers around the world keep the math running. None of them ever sees the numbers in the open. Privacy is shared, not handed to one party.",
    tag: "The network",
    mesh: <NodeGraph />,
  },
  {
    title: "Donations add up, in private",
    description:
      "Each gift adds to the total without revealing itself. Onlookers see the campaign reaching milestones — never the dollar amount inside.",
    tag: "Stacking up",
    mesh: <TokenStack />,
  },
];

export default function ThreeDShowcase() {
  return (
    <section className="space-y-8">
      <SectionMarker label="what's happening behind the scenes" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl">
          How donations stay private, in pictures.
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {SHOWCASE.length} ideas
        </span>
      </div>
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {SHOWCASE.map((c, i) => (
          <GlitchReveal key={c.title} delay={i * 0.05} className="h-full">
            <ShowcaseCard
              index={i + 1}
              total={SHOWCASE.length}
              tag={c.tag}
              title={c.title}
              description={c.description}
              mesh={c.mesh}
            />
          </GlitchReveal>
        ))}
      </div>
    </section>
  );
}
