"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GLYPHS = "0123456789ABCDEF";

type Phase =
  | "show"
  | "encrypting"
  | "encrypted"
  | "computing"
  | "outputCipher"
  | "output";

// ~11s total cycle (was 6.9s) — gives the eye time to read each step's
// narration and watch the cipher transitions land.
const PHASES: { p: Phase; ms: number }[] = [
  { p: "show", ms: 2400 },
  { p: "encrypting", ms: 1500 },
  { p: "encrypted", ms: 1400 },
  { p: "computing", ms: 1900 },
  { p: "outputCipher", ms: 1400 },
  { p: "output", ms: 2600 },
];

const INPUTS = [
  { label: "Donor A", amount: "$50", handle: "0x7e2db…0700" },
  { label: "Donor B", amount: "$120", handle: "0x4a91c…7c40" },
  { label: "Donor C", amount: "$80", handle: "0x9b3fa…2e88" },
];
const TOTAL = "$250";
const TOTAL_HANDLE = "0xff5a4…1c92";

const PHASE_TITLE: Record<Phase, string> = {
  show: "01 · donors type their amounts",
  encrypting: "02 · making each amount private",
  encrypted: "03 · only the private versions are sent",
  computing: "04 · adding them up — without seeing them",
  outputCipher: "05 · the total is also private",
  output: "06 · only the total is revealed publicly",
};

const PHASE_NARRATION: Record<Phase, string> = {
  show:
    "Three donors type how much they want to give. Nothing has happened yet — the numbers are still on their phones.",
  encrypting:
    "Each donor's browser scrambles their amount before sending. The original number never leaves the donor's device.",
  encrypted:
    "What arrives at the platform is unreadable. We can't tell if Donor A gave $5 or $5,000.",
  computing:
    "We add the three private amounts together — without unscrambling them. This is the trick: math on private data.",
  outputCipher:
    "The result is also private. We just made a sum, but we still can't read it.",
  output:
    "For the public progress bar, we ask a separate decryption network to reveal only the total. Individual donations stay private forever.",
};

/// The story this section now tells, at a glance:
///   plaintext at donor → encryption on device → ciphertext at contract →
///   addition on ciphertext → ciphertext output → KMS-revealed total.
/// Each box visibly transitions between clear and scrambled forms; the
/// connecting paths light up with flowing dashes during active transfers;
/// the phase narration at the bottom names what's happening in plain English.
export function FheAddDiagram() {
  const [phase, setPhase] = useState<Phase>("show");
  const [tick, setTick] = useState(0);

  // 3D parallax state
  const panelRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let i = 0;
    let id: ReturnType<typeof setTimeout>;
    function step() {
      setPhase(PHASES[i].p);
      id = setTimeout(() => {
        i = (i + 1) % PHASES.length;
        step();
      }, PHASES[i].ms);
    }
    step();
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    // Slower glyph cycling reads as steadier, easier to track.
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 110);
    return () => clearInterval(id);
  }, []);

  function handleMouseMove(e: React.MouseEvent) {
    const node = panelRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 3, y: dx * 3 });
  }

  function handleMouseLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  const inputsScrambled =
    phase === "encrypting" ||
    phase === "encrypted" ||
    phase === "computing" ||
    phase === "outputCipher" ||
    phase === "output";

  const outputVisible =
    phase === "computing" || phase === "outputCipher" || phase === "output";
  const outputScrambled = phase === "computing" || phase === "outputCipher";
  const computing = phase === "computing";

  // When data is actively flowing left → middle (encrypted handles arriving)
  const inboundFlowing = phase === "encrypting" || phase === "encrypted";
  // When data is actively flowing middle → right
  const outboundFlowing = phase === "computing" || phase === "outputCipher";

  const baseX = -2;
  const transform = `rotateX(${baseX + tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${hovered ? 14 : 0}px)`;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary/70">
            [ 03 / mechanism ]
          </span>
          <h2 className="font-display text-base font-medium uppercase tracking-tight text-foreground">
            How donations stay private
          </h2>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          // looped · ~6.9s cycle
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-2xl font-medium uppercase leading-tight tracking-tight sm:text-3xl">
          The contract adds these donations{" "}
          <span className="text-primary">without ever seeing them</span>.
        </h3>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each donation is made private on the donor&apos;s phone before it&apos;s sent.
          The platform adds the private numbers together and stores a private total.
          The original numbers are never visible to anyone.
        </p>
      </div>

      {/* 3D stage */}
      <div
        className="relative px-2 py-6 sm:px-6 sm:py-8"
        style={{ perspective: "1800px" }}
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={panelRef}
          className="diagram-panel relative overflow-hidden border border-border bg-card/40"
          style={{
            transformStyle: "preserve-3d",
            transform,
            transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            boxShadow:
              "0 32px 80px -20px hsla(49, 100%, 50%, 0.4), 0 12px 32px -10px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* Back face */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 border border-primary/15 bg-card"
            style={{ transform: "translateZ(-22px)" }}
          />

          {/* Top spine */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 h-[3px] bg-primary"
            style={{
              boxShadow:
                "0 0 16px hsla(49, 100%, 50%, 0.7), 0 0 32px hsla(49, 100%, 50%, 0.35)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
          />

          {/* Surface lighting */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 30% 0%, hsla(49, 100%, 50%, 0.10), transparent 65%)",
            }}
          />

          {/* Engineering grid */}
          <div className="diagram-grid pointer-events-none absolute inset-0 opacity-[0.4]" aria-hidden />

          {/* Corner brackets */}
          <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-primary/70" />
          <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-primary/70" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-primary/70" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-primary/70" />

          {/* Phase title strip */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-border/60 px-5 py-2 font-mono text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5",
                  computing ? "anim-pulse-yellow bg-primary" : "bg-primary/60",
                )}
              />
              <span className="text-primary">{PHASE_TITLE[phase]}</span>
            </span>
            <span className="hidden text-muted-foreground/70 md:inline">
              math on private numbers
            </span>
          </div>

          {/* Body grid */}
          <div className="relative z-10 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
            {/* INPUTS */}
            <div className="relative space-y-3">
              {INPUTS.map((inp, i) => (
                <BoxRow
                  key={i}
                  label={inp.label}
                  amount={inp.amount}
                  handle={inp.handle}
                  scrambled={inputsScrambled}
                  tick={tick}
                  delay={i * 60}
                />
              ))}
              {/* Connector lane → FHE.add (desktop only) */}
              <div className="absolute inset-y-0 -right-3 hidden w-3 lg:block">
                <FlowLane active={inboundFlowing} tick={tick} />
              </div>
            </div>

            {/* CENTER: FHE.add */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "relative flex flex-col items-center gap-1 border-2 px-6 py-5 text-center transition-all duration-500",
                  computing
                    ? "border-primary bg-primary/15 shadow-[0_0_32px_hsla(49,100%,50%,0.6)]"
                    : "border-primary/55 bg-primary/5",
                )}
              >
                <span aria-hidden className="absolute left-1 top-1 h-2 w-2 border-l border-t border-primary/80" />
                <span aria-hidden className="absolute right-1 top-1 h-2 w-2 border-r border-t border-primary/80" />
                <span aria-hidden className="absolute bottom-1 left-1 h-2 w-2 border-b border-l border-primary/80" />
                <span aria-hidden className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-primary/80" />

                <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  the platform
                </div>
                <div className="font-display text-xl font-medium uppercase sm:text-2xl">
                  Add (private)
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {computing
                    ? "adding without seeing"
                    : inboundFlowing
                      ? "receiving private amounts"
                      : outboundFlowing
                        ? "sending private total"
                        : "ready"}
                </div>

                {/* Inner cipher rain — visible only during compute */}
                {computing && <InnerCipherRain tick={tick} />}
              </div>
            </div>

            {/* OUTPUT */}
            <div className="relative flex items-center justify-center">
              {/* Connector lane FROM FHE.add (desktop only) */}
              <div className="absolute inset-y-0 -left-3 hidden w-3 lg:block">
                <FlowLane active={outboundFlowing} tick={tick} />
              </div>
              <div
                className={cn(
                  "w-full border bg-background/60 px-6 py-6 transition-all duration-500",
                  outputVisible
                    ? "border-primary/60 opacity-100"
                    : "border-border opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    total
                  </span>
                  <span
                    className={cn(
                      "border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest",
                      phase === "output"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card/40 text-muted-foreground",
                    )}
                  >
                    {phase === "output" ? "revealed publicly" : "private"}
                  </span>
                </div>
                <div className="mt-2 font-display text-2xl font-medium tabular-nums sm:text-3xl md:text-4xl">
                  {outputVisible ? (
                    <ScrambledText
                      text={TOTAL}
                      scrambled={outputScrambled}
                      tick={tick}
                    />
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>
                <div
                  className={cn(
                    "mt-2 font-mono text-[9px] uppercase tracking-widest transition-opacity",
                    outputVisible ? "text-primary/70 opacity-100" : "opacity-0",
                  )}
                >
                  private reference · {TOTAL_HANDLE}
                </div>
              </div>
            </div>
          </div>

          {/* PHASE NARRATION — bottom strip with the live story */}
          <div className="relative z-10 border-t border-border/60 bg-background/40 p-5 sm:p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[9px] uppercase tracking-widest text-primary tabular-nums">
                step {PHASES.findIndex((p) => p.p === phase) + 1}/{PHASES.length}
              </span>
              <div className="flex flex-1 items-stretch gap-[2px]" aria-hidden>
                {PHASES.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-[3px] flex-1 transition-colors duration-500",
                      i <= PHASES.findIndex((p) => p.p === phase)
                        ? "bg-primary"
                        : "bg-muted-foreground/20",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/90">
              {PHASE_NARRATION[phase]}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoxRow({
  label,
  amount,
  handle,
  scrambled,
  tick,
  delay,
}: {
  label: string;
  amount: string;
  handle: string;
  scrambled: boolean;
  tick: number;
  delay: number;
}) {
  return (
    <div
      className={cn(
        "border bg-background/60 px-4 py-3 transition-colors duration-500",
        scrambled ? "border-primary/45" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-display text-base font-medium tabular-nums sm:text-lg">
          <ScrambledText
            text={amount}
            scrambled={scrambled}
            tick={tick}
            delayPerCharMs={delay}
          />
        </span>
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-[9px] uppercase tracking-widest transition-opacity",
          scrambled ? "text-primary/70 opacity-100" : "opacity-0",
        )}
      >
        private reference · {handle}
      </div>
    </div>
  );
}

/// Vertical "stream" of cipher characters that animates upward when active —
/// reads as data flowing through a duct between the input column and the
/// FHE.add box, or between the box and the output.
function FlowLane({ active, tick }: { active: boolean; tick: number }) {
  // Use the tick to deterministically pick characters; no Math.random in render
  // so SSR/hydration stay aligned.
  const COUNT = 14;
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden border-x transition-colors duration-500",
        active ? "border-primary/40 bg-primary/5" : "border-border/60",
      )}
    >
      {active && (
        <div
          className="absolute inset-x-0 flex flex-col items-center gap-px"
          style={{
            top: -((tick * 6) % 80),
            transition: "top 80ms linear",
          }}
        >
          {Array.from({ length: COUNT }).map((_, i) => {
            const idx = (tick + i * 3) % GLYPHS.length;
            const a = 0.45 + ((tick + i) % 5) / 12;
            return (
              <span
                key={i}
                className="font-mono text-[9px] leading-none"
                style={{
                  color: `hsla(49, 100%, 50%, ${a})`,
                  textShadow: "0 0 4px hsla(49, 100%, 50%, 0.45)",
                }}
              >
                {GLYPHS[idx]}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/// Cipher rain inside the FHE.add box during the compute phase — small grid
/// of glyphs cycling fast, suggesting the actual encrypted operation.
function InnerCipherRain({ tick }: { tick: number }) {
  const COLS = 8;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-1 grid gap-[1px] overflow-hidden opacity-50"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: COLS * 4 }).map((_, i) => {
        const idx = (tick * 3 + i * 7) % GLYPHS.length;
        const a = 0.35 + ((i * 7 + tick) % 6) / 14;
        return (
          <span
            key={i}
            className="text-center font-mono text-[10px] leading-none"
            style={{ color: `hsla(49, 100%, 50%, ${a})` }}
          >
            {GLYPHS[idx]}
          </span>
        );
      })}
    </div>
  );
}

function ScrambledText({
  text,
  scrambled,
  tick,
  delayPerCharMs = 0,
}: {
  text: string;
  scrambled: boolean;
  tick: number;
  delayPerCharMs?: number;
}) {
  if (!scrambled) return <span>{text}</span>;
  return (
    <span>
      {[...text].map((ch, i) => {
        if (ch === "$" || ch === "," || ch === " ") return <span key={i}>{ch}</span>;
        const g = GLYPHS[(i * 7 + tick + Math.floor(delayPerCharMs / 80)) % GLYPHS.length];
        return (
          <span key={i} className="text-primary/75">
            {g}
          </span>
        );
      })}
    </span>
  );
}
