"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/// Nano-tech hero backdrop:
///  - SVG dot grid + larger yellow "junction" highlight points
///  - Manhattan circuit traces with traveling stroke-dash pulses
///  - Solder/junction dots at every path corner
///  - Radial yellow glow centered top + edge vignette
///  - Floating data nodes with periodic flash + pulsing rings
///  - Hex-dump style spec text in corners
export function HeroBackground() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        cx: 60 + Math.floor(Math.random() * 1320),
        cy: 50 + Math.floor(Math.random() * 600),
        delay: Math.random() * 4,
        dur: 2.4 + Math.random() * 2.2,
      })),
    [],
  );

  const traces = TRACES;
  const hexBlock = useMemo(() => makeHexDump(), []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Radial glow centered above hero */}
      <div
        className="absolute -top-32 left-1/2 h-[720px] w-[1200px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, hsla(49, 100%, 50%, 0.18) 0%, hsla(49, 100%, 50%, 0.07) 35%, transparent 70%)",
        }}
      />

      {/* SVG layer: dot field + circuit traces + nodes */}
      <svg
        viewBox="0 0 1440 700"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <pattern id="nano-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="0.9" fill="hsla(0, 0%, 100%, 0.18)" />
          </pattern>
          <pattern id="nano-bigdots" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
            <circle cx="80" cy="80" r="2" fill="hsla(49, 100%, 50%, 0.55)" />
            <circle cx="80" cy="80" r="6" fill="none" stroke="hsla(49, 100%, 50%, 0.18)" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="trace-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsla(49, 100%, 50%, 0)" />
            <stop offset="50%" stopColor="hsla(49, 100%, 70%, 1)" />
            <stop offset="100%" stopColor="hsla(49, 100%, 50%, 0)" />
          </linearGradient>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsla(49, 100%, 70%, 1)" />
            <stop offset="60%" stopColor="hsla(49, 100%, 50%, 0.4)" />
            <stop offset="100%" stopColor="hsla(49, 100%, 50%, 0)" />
          </radialGradient>
          <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* Dot fields */}
        <rect width="100%" height="100%" fill="url(#nano-dots)" />
        <rect width="100%" height="100%" fill="url(#nano-bigdots)" />

        {/* Static base traces */}
        {traces.map((t, i) => (
          <path
            key={`base-${i}`}
            d={t.d}
            stroke="hsla(49, 100%, 50%, 0.22)"
            strokeWidth="1.2"
            fill="none"
          />
        ))}

        {/* Traveling pulse traces */}
        {traces.map((t, i) => (
          <path
            key={`pulse-${i}`}
            d={t.d}
            stroke="url(#trace-grad)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="80 700"
            filter="url(#soft-blur)"
            style={{
              animation: `trace-flow ${4 + (i % 4)}s linear ${i * 0.4}s infinite`,
            }}
          />
        ))}

        {/* Junction nodes at every trace corner — outline + core */}
        {traces.flatMap((t, i) =>
          t.junctions.map((p, j) => (
            <g key={`j-${i}-${j}`}>
              <circle
                cx={p[0]}
                cy={p[1]}
                r="4"
                fill="none"
                stroke="hsla(49, 100%, 50%, 0.5)"
                strokeWidth="1"
              />
              <circle
                cx={p[0]}
                cy={p[1]}
                r="1.4"
                fill="hsl(49, 100%, 65%)"
              />
            </g>
          )),
        )}

        {/* Floating data nodes */}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.cx} cy={n.cy} r="10" fill="url(#node-glow)" opacity="0.5">
              <animate
                attributeName="opacity"
                values="0.05;0.55;0.05"
                dur={`${n.dur}s`}
                begin={`${n.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="3;12;3"
                dur={`${n.dur}s`}
                begin={`${n.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={n.cx} cy={n.cy} r="1.2" fill="hsl(49, 100%, 70%)" />
          </g>
        ))}

        {/* Decorative L-brackets in the four corners */}
        {[
          { x: 16, y: 16, dx: 1, dy: 1 },
          { x: 1424, y: 16, dx: -1, dy: 1 },
          { x: 16, y: 684, dx: 1, dy: -1 },
          { x: 1424, y: 684, dx: -1, dy: -1 },
        ].map((c, i) => (
          <path
            key={`corner-${i}`}
            d={`M ${c.x} ${c.y + 24 * c.dy} L ${c.x} ${c.y} L ${c.x + 24 * c.dx} ${c.y}`}
            stroke="hsla(49, 100%, 50%, 0.6)"
            strokeWidth="1.5"
            fill="none"
          />
        ))}
      </svg>

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 40%, transparent 50%, hsla(180, 67%, 1%, 0.85) 95%)",
        }}
      />

      {/* Floating spec text */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-0.5 font-mono text-[9px] uppercase tracking-widest text-primary/60">
        <span>// trace_grid.svg</span>
        <span>0x{Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")}</span>
        <span className="text-primary/40">fhevm.protocol</span>
      </div>

      <motion.div
        className="absolute left-4 bottom-4 hidden flex-col gap-0.5 font-mono text-[9px] uppercase tracking-widest text-primary/40 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.6, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
      >
        <span>// packet routing</span>
        <span>node sepolia.zama</span>
      </motion.div>

      {/* Hex-dump style block in the bottom-right (hidden on mobile) */}
      <div className="absolute bottom-6 right-6 hidden font-mono text-[9px] leading-tight text-primary/35 sm:block">
        <pre>{hexBlock}</pre>
      </div>
    </div>
  );
}

function makeHexDump() {
  const rows: string[] = [];
  for (let i = 0; i < 4; i++) {
    const offset = (0x7f3a + i * 0x10).toString(16).padStart(8, "0");
    const bytes = Array.from({ length: 8 })
      .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
      .join(" ");
    rows.push(`${offset}  ${bytes}`);
  }
  return rows.join("\n");
}

const TRACES: Array<{ d: string; junctions: Array<[number, number]> }> = [
  {
    d: "M 0 100 L 220 100 L 260 140 L 540 140 L 580 100 L 1440 100",
    junctions: [
      [220, 100],
      [260, 140],
      [540, 140],
      [580, 100],
    ],
  },
  {
    d: "M 0 240 L 380 240 L 420 200 L 760 200 L 800 240 L 1100 240 L 1140 280 L 1440 280",
    junctions: [
      [380, 240],
      [420, 200],
      [760, 200],
      [800, 240],
      [1100, 240],
      [1140, 280],
    ],
  },
  {
    d: "M 0 380 L 180 380 L 220 340 L 460 340 L 500 380 L 880 380 L 920 420 L 1440 420",
    junctions: [
      [180, 380],
      [220, 340],
      [460, 340],
      [500, 380],
      [880, 380],
      [920, 420],
    ],
  },
  {
    d: "M 1440 540 L 1180 540 L 1140 580 L 740 580 L 700 540 L 320 540 L 280 580 L 0 580",
    junctions: [
      [1180, 540],
      [1140, 580],
      [740, 580],
      [700, 540],
      [320, 540],
      [280, 580],
    ],
  },
  {
    d: "M 240 0 L 240 80 L 280 120 L 280 240",
    junctions: [
      [240, 80],
      [280, 120],
    ],
  },
  {
    d: "M 1080 0 L 1080 120 L 1040 160 L 1040 320",
    junctions: [
      [1080, 120],
      [1040, 160],
    ],
  },
  {
    d: "M 640 700 L 640 600 L 680 560 L 680 380",
    junctions: [
      [640, 600],
      [680, 560],
    ],
  },
];
