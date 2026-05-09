"use client";

import { cn } from "@/lib/utils";

type IconProps = { className?: string };

const SVG = "h-12 w-12 text-primary";

/// Bar chart — 4 bars rising/falling with staggered phase. The example icon.
export function BarChartIcon({ className }: IconProps) {
  const bars = [
    { x: 6, base: 18, peak: 38, dur: 1.8 },
    { x: 17, base: 12, peak: 30, dur: 2.2 },
    { x: 28, base: 22, peak: 40, dur: 1.6 },
    { x: 39, base: 8, peak: 26, dur: 2.4 },
  ];
  return (
    <svg viewBox="0 0 48 48" className={cn(SVG, className)} aria-hidden>
      <line x1="2" y1="44" x2="46" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width="5" fill="currentColor">
          <animate
            attributeName="height"
            values={`${b.base};${b.peak};${b.base}`}
            dur={`${b.dur}s`}
            begin={`${i * 0.22}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            keyTimes="0;0.5;1"
          />
          <animate
            attributeName="y"
            values={`${44 - b.base};${44 - b.peak};${44 - b.base}`}
            dur={`${b.dur}s`}
            begin={`${i * 0.22}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            keyTimes="0;0.5;1"
          />
        </rect>
      ))}
    </svg>
  );
}

/// Shield with a pulsing core ring.
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(SVG, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M24 4 L40 10 V26 C40 35 32 41 24 44 C16 41 8 35 8 26 V10 Z" />
      <circle cx="24" cy="24" r="6" strokeOpacity="0.7">
        <animate
          attributeName="r"
          values="4;12;4"
          dur="2.6s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          keyTimes="0;0.5;1"
        />
        <animate
          attributeName="stroke-opacity"
          values="0.9;0;0.9"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="24" cy="24" r="2" fill="currentColor" stroke="none">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/// Matrix grid — 3x3 cells with random-looking toggling fills.
export function MatrixIcon({ className }: IconProps) {
  const cells = [
    [4, 4],
    [18, 4],
    [32, 4],
    [4, 18],
    [18, 18],
    [32, 18],
    [4, 32],
    [18, 32],
    [32, 32],
  ] as const;
  const phases = [0, 0.3, 0.6, 0.9, 0.15, 0.45, 0.75, 1.05, 0.55];
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(SVG, className)}
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
    >
      {cells.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="12" height="12" fill="currentColor" fillOpacity="0.15">
          <animate
            attributeName="fill-opacity"
            values="0.08;0.9;0.08"
            dur={`${2.2 + (i % 3) * 0.6}s`}
            begin={`${phases[i]}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            keyTimes="0;0.5;1"
          />
        </rect>
      ))}
    </svg>
  );
}

/// Padlock — body steady, shackle subtly hops.
export function LockIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(SVG, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -1.5; 0 0"
          dur="2.4s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          keyTimes="0;0.5;1"
        />
        <path d="M14 22 V16 C14 11 18 7 24 7 C30 7 34 11 34 16 V22" />
      </g>
      <rect x="9" y="22" width="30" height="20" fill="currentColor" fillOpacity="0.08" />
      <circle cx="24" cy="30" r="2.4" fill="currentColor" stroke="none">
        <animate attributeName="r" values="2;3;2" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <line x1="24" y1="32" x2="24" y2="37" />
    </svg>
  );
}

/// Concentric sonar rings expanding outward.
export function WaveIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(SVG, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none" />
      {[0, 0.7, 1.4].map((d, i) => (
        <circle key={i} cx="24" cy="24" r="4">
          <animate
            attributeName="r"
            values="4;22;4"
            dur="2.6s"
            begin={`${d}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
            keyTimes="0;0.5;1"
          />
          <animate
            attributeName="stroke-opacity"
            values="0.85;0;0.85"
            dur="2.6s"
            begin={`${d}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

/// Null — slashed zero with an orbiting dot.
export function NullIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn(SVG, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <ellipse cx="24" cy="24" rx="13" ry="17" />
      <line x1="14" y1="39" x2="34" y2="9" strokeWidth="1.5" />
      <g style={{ transformOrigin: "24px 24px", animation: "spin 5s linear infinite" }}>
        <circle cx="37" cy="24" r="2" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
