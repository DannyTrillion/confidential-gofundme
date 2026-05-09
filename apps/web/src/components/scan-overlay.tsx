"use client";

import { useEffect, useState } from "react";

/// Site-wide ambient effects:
/// - CRT scanline sweeping top→bottom every 8s
/// - Occasional flicker dots at random grid intersections (~ every 4–7s)
export function ScanOverlay() {
  const [dots, setDots] = useState<Array<{ id: number; left: number; top: number }>>([]);

  useEffect(() => {
    let id = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const cellsX = Math.floor(window.innerWidth / 48);
      const cellsY = Math.floor(window.innerHeight / 48);
      const x = Math.floor(Math.random() * cellsX) * 48;
      const y = Math.floor(Math.random() * cellsY) * 48;
      const newId = id++;
      setDots((d) => [...d, { id: newId, left: x, top: y }]);
      setTimeout(() => setDots((d) => d.filter((dot) => dot.id !== newId)), 700);
      timeout = setTimeout(tick, 4000 + Math.random() * 3000);
    };
    timeout = setTimeout(tick, 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <div className="crt-scan" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {dots.map((d) => (
          <span
            key={d.id}
            className="absolute h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 bg-primary"
            style={{
              left: d.left,
              top: d.top,
              boxShadow: "0 0 8px hsla(49, 100%, 50%, 0.7)",
              animation: "blink 0.7s steps(2) 1",
            }}
          />
        ))}
      </div>
    </>
  );
}
