"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/// Reusable scroll-reveal wrapper. Fades opacity 0 → 1 and translates
/// upward `y` pixels → 0 once the element enters the viewport. One-shot
/// (won't replay on scroll-up). Honors `prefers-reduced-motion`.
export function FadeIn({
  children,
  delay = 0,
  duration = 0.75,
  y = 24,
  amount = 0.15,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  amount?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: [0.2, 0.8, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
