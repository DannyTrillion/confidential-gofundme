"use client";

import { useEffect, useRef, useState } from "react";

/// Mounts `children` only after the wrapper element scrolls into view (with
/// a 200px lookahead). Used to defer heavy bundles like react-three-fiber
/// until the user is about to actually see them — significant first-paint
/// win on mobile / slow connections.
export function DeferredMount({
  children,
  fallback,
  rootMargin = "200px",
  className,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (visible) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
