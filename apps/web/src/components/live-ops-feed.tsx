"use client";

import { useEffect, useState } from "react";

const OPS = [
  "Anonymous donor → encrypted donation to a medical fund",
  "Medical campaign reached 25% of its goal",
  "Funds released to a school-fees recipient",
  "Recipient verified for a heart-surgery campaign",
  "New campaign launched — donations encrypted",
  "New voucher attested for an education campaign",
  "Anonymous donor → encrypted donation to a safe-house fund",
  "Recipient withdrew funds from a school campaign",
];

function pickNext(prev: string[]): string {
  const last = prev[0];
  let next = OPS[Math.floor(Math.random() * OPS.length)];
  let guard = 0;
  while (next === last && guard++ < 6) {
    next = OPS[Math.floor(Math.random() * OPS.length)];
  }
  return next;
}

export function LiveOpsFeed() {
  const [items, setItems] = useState<string[]>(() => OPS.slice(0, 4));

  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => [pickNext(prev), ...prev].slice(0, 4));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-md border border-border bg-card/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>// recent activity</span>
        <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
      </div>
      <ul className="space-y-1.5 font-mono text-[10px] leading-relaxed">
        {items.map((it, i) => (
          <li
            key={`${it}-${i}`}
            className={
              i === 0
                ? "text-primary/95"
                : i === 1
                  ? "text-foreground/70"
                  : "text-muted-foreground/55"
            }
          >
            <span className="text-muted-foreground/45">{">_"}</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
