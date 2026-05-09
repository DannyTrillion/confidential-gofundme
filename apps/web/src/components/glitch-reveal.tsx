"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/// Plays a brief glitch decode (clip-path slices + jitter) when the element
/// scrolls into view. Content is visible from first render — the glitch is a
/// flourish, not a gate. Falls back gracefully under reduced-motion or when
/// no IntersectionObserver fires (e.g. headless screenshots).
export function GlitchReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glitching, setGlitching] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!ref.current || reduce) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGlitching(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [reduce]);

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      animate={
        glitching
          ? {
              clipPath: [
                "inset(0% 0 0% 0)",
                "inset(0% 0 80% 0)",
                "inset(70% 0 0% 0)",
                "inset(20% 0 30% 0)",
                "inset(0% 0 0% 0)",
              ],
              x: [0, -2, 2, -1, 0],
            }
          : { clipPath: "inset(0% 0 0% 0)", x: 0 }
      }
      transition={{ duration: 0.5, delay, times: [0, 0.25, 0.5, 0.75, 1], ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}
