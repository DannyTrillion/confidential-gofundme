"use client";

import { useEffect, useRef, useState } from "react";

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#________01010100110_";

/// Types out `line1` char-by-char, then snaps in `line2` with a brief scramble.
/// One-time on mount. No persistent cursor.
export function TypewriterHeadline({
  line1,
  emphasis,
  line2,
  className,
}: {
  line1: string;
  emphasis: string;
  line2: string;
  className?: string;
}) {
  const [typed, setTyped] = useState("");
  const [emphTyped, setEmphTyped] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState("");
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      setTyped(line1.slice(0, i));
      if (i < line1.length) {
        timers.current.push(setTimeout(tick, 28 + Math.random() * 22));
      } else {
        timers.current.push(setTimeout(typeEmphasis, 220));
      }
    };

    const typeEmphasis = () => {
      let j = 0;
      const tick2 = () => {
        j++;
        setEmphTyped(emphasis.slice(0, j));
        if (j < emphasis.length) {
          timers.current.push(setTimeout(tick2, 28 + Math.random() * 22));
        } else {
          timers.current.push(setTimeout(scrambleReveal, 320));
        }
      };
      tick2();
    };

    const scrambleReveal = () => {
      setRevealing(true);
      const target = line2;
      const totalFrames = 18;
      let frame = 0;
      const tickFrame = () => {
        frame++;
        const out = target
          .split("")
          .map((ch, idx) => {
            if (ch === " ") return " ";
            const settled = idx < Math.floor((frame / totalFrames) * target.length);
            if (settled) return ch;
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("");
        setRevealed(out);
        if (frame < totalFrames) {
          timers.current.push(setTimeout(tickFrame, 45));
        } else {
          setRevealed(target);
          setDone(true);
        }
      };
      tickFrame();
    };

    timers.current.push(setTimeout(tick, 250));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [line1, emphasis, line2]);

  return (
    <h1 className={className}>
      <span>{typed}</span>
      <br />
      <span className="text-muted-foreground">{emphTyped}</span>
      {/* line break on small screens, inline space on sm+ so two-line desktop rhythm is preserved */}
      <br className="sm:hidden" />
      <span className="hidden sm:inline">{" "}</span>
      <span
        className={`text-primary ${revealing && !done ? "anim-flicker" : ""}`}
        aria-label={line2}
      >
        {revealing ? revealed : ""}
      </span>
    </h1>
  );
}
