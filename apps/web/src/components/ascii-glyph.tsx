"use client";

import { cn } from "@/lib/utils";

export const GLYPHS: Record<string, string> = {
  shield: `   ╔═══╗
   ║ ◈ ║
  ┌╨───╨┐
  │░░░░░│
  └─────┘`,
  matrix: `  ┌───────┐
  │ ◉ ◎ ○ │
  │ ◎ ◉ ◎ │
  │ ○ ◎ ◉ │
  └───────┘`,
  graph: `  ┌─┐   ┌─┐
  │A├──►│B│
  └─┘   └┬┘
        ┌▼┐
        │C│
        └─┘`,
  bars: `  │  ▄
  │▁ ▄ █ ▄
  │█ █ █ █
  └────────`,
  orb: `    .--.
   /    \\
  | (  ) |
   \\    /
    '--'`,
  wave: `  ≋≋≋
  ≋≋≋
  ≋≋≋`,
  lock: `  ┌──┐
  │██│
 ┌┤  ├┐
 │└──┘│
 │░░░░│
 └────┘`,
  null: ` ┌────┐
 │null│
 │ ▼  │
 └────┘`,
};

export function AsciiGlyph({
  name = "shield",
  className,
}: {
  name?: keyof typeof GLYPHS;
  className?: string;
}) {
  const art = GLYPHS[name] ?? GLYPHS.shield;
  return (
    <pre
      className={cn(
        "font-mono text-[10px] leading-[1.05] text-primary/70 selection:bg-primary/30",
        className,
      )}
    >
      {art}
    </pre>
  );
}
