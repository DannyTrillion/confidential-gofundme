"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Optional index marker like "01 / 06" */
  index?: number;
  total?: number;
  /** Optional pill tag like "client-side" */
  tag?: string;
  /** Optional bottom code line */
  code?: string;
  className?: string;
};

const SPRING = { stiffness: 250, damping: 22, mass: 0.6 };

/// Card with Framer-Motion 3D cursor tilt + icon Z-lift on hover.
/// Internal SVG icons animate on their own (CSS / SMIL <animate>).
export function FeatureCard({
  icon,
  title,
  description,
  index,
  total,
  tag,
  code,
  className,
}: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);

  // Mouse-tracked tilt (-0.5..0.5 normalized).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Spring-damped rotation. ±9° gives a noticeable tilt without nausea.
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), SPRING);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), SPRING);

  // Icon Z-lift, also spring-damped.
  const z = useSpring(0, SPRING);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleEnter() {
    if (reduce) return;
    setHover(true);
    z.set(28);
  }

  function handleLeave() {
    setHover(false);
    mx.set(0);
    my.set(0);
    z.set(0);
  }

  return (
    <motion.article
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 1100,
      }}
      className={cn(
        "group relative flex h-full flex-col bg-background/60 p-6 transition-colors will-change-transform",
        "hover:bg-background",
        className,
      )}
    >
      {/* Top: index + status pill */}
      {(index !== undefined || tag) && (
        <div
          className="flex items-start justify-between"
          style={{ transform: "translateZ(10px)" }}
        >
          {index !== undefined && total !== undefined ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          ) : (
            <span />
          )}
          {tag && (
            <div className="flex items-center gap-1.5">
              <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-primary">
                {tag}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Icon — lifted on Z when hovered */}
      <motion.div
        className="mt-6"
        style={{
          z: reduce ? 0 : z,
          transformStyle: "preserve-3d",
        }}
      >
        {icon}
      </motion.div>

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

      {/* Top scan-line on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
      />

      {/* Subtle yellow corner accent that fades in on hover */}
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
