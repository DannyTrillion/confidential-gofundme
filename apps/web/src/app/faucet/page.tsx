"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionMarker } from "@/components/section-marker";
import { AsciiGlyph } from "@/components/ascii-glyph";
import { WalletGate } from "@/components/wallet-gate";
import { DEPLOYMENTS, TOKEN_ABI, ensureDeployed } from "@/lib/contracts";
import { getFhevmInstance } from "@/lib/fhevm";
import { usdToTokenUnits } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function FaucetPage() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [usd, setUsd] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("");
  const [done, setDone] = useState(false);

  async function mint() {
    setError(null);
    setDone(false);
    if (!isConnected || !address) {
      setError("Connect your wallet.");
      return;
    }
    if (chainId !== DEPLOYMENTS.chainId) {
      setError(`Switch to chain ${DEPLOYMENTS.chainId} (Sepolia).`);
      return;
    }
    const eth = walletClient?.transport ?? (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setError("Wallet provider not ready — refresh and try again.");
      return;
    }
    try {
      ensureDeployed(DEPLOYMENTS.token, "USDC token");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      return;
    }
    setBusy(true);
    setStage("");
    let phase = "init";
    try {
      const tokens = usdToTokenUnits(BigInt(usd || "0"));

      phase = "loading FHEVM SDK";
      setStage("Loading FHEVM SDK…");
      const instance = await getFhevmInstance();

      phase = "encrypting amount + getting input proof";
      setStage("Encrypting amount + fetching input proof…");
      const enc = await instance
        .createEncryptedInput(DEPLOYMENTS.token, address)
        .add64(tokens)
        .encrypt();

      phase = "submitting mint tx";
      setStage("Submitting mint transaction…");
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const token = new Contract(DEPLOYMENTS.token, TOKEN_ABI, signer);
      const tx = await token.mint(enc.handles[0], enc.inputProof);

      phase = "waiting for confirmation";
      setStage("Waiting for confirmation…");
      await tx.wait();

      setStage("");
      setDone(true);
    } catch (e: any) {
      console.error(`[faucet] failed during: ${phase}`, e);
      const base = e?.shortMessage ?? e?.message ?? String(e);
      setError(`${base}  (step: ${phase})`);
      setStage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="get test usdc" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Get test USDC.<br />
          <span className="text-muted-foreground">Donate to live campaigns instantly.</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This is play-money USDC for the demo. Click the button, and you&apos;ll get a
          private balance you can donate from. No real money involved.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="border border-border bg-card/40">
          <div className="border-b border-border p-5">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
              Get test USDC
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your balance is private — only you can see it
            </p>
          </div>
          <div className="p-5">
            <WalletGate
              compact
              title="Connect to get test USDC"
              description="Connect your wallet to receive test USDC for the demo."
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={usd}
                    onChange={(e) => setUsd(e.target.value)}
                  />
                </div>
                {stage && <p className="font-mono text-xs uppercase tracking-widest text-primary">// {stage}</p>}
                {error && <p className="font-mono text-xs text-destructive">// {error}</p>}
                {done && (
                  <p className="font-mono text-xs uppercase tracking-wider text-primary">
                    // received · view your private balance on the Wallet page
                  </p>
                )}
                <Button onClick={mint} disabled={busy} size="lg">
                  {busy ? "Sending…" : "Get test USDC →"}
                </Button>
              </div>
            </WalletGate>
          </div>
        </div>

        <aside className="border border-border bg-card/40 p-5">
          <AsciiGlyph name="orb" className="mb-4" />
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            About this faucet
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            This is a demo on a test network. The button gives you free test USDC so you
            can try out donations without spending real money.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Your balance is kept private — even we can&apos;t see it. Only you, the wallet
            owner, can decrypt it on the Wallet page.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            On the live version, this step would be replaced by converting real USDC into a
            private version. Donations and amounts work the same way either way.
          </p>
        </aside>
      </div>

      <SepoliaEthFaucets />
    </div>
  );
}

/// Directory of trustworthy Sepolia ETH faucets. Each card has a custom
/// inline SVG icon (no library), corner brackets, an allowance chip, an
/// auth chip, and a hover state that brightens the spine + icon.
type FaucetIconKey =
  | "cloud"
  | "flask"
  | "bolt"
  | "tower"
  | "chain"
  | "pickaxe";

const FAUCETS: Array<{
  name: string;
  href: string;
  allowance: string;
  auth: string;
  blurb: string;
  recommended?: boolean;
  icon: FaucetIconKey;
}> = [
  {
    name: "Google Cloud",
    href: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
    allowance: "0.05 ETH / day",
    auth: "Google sign-in",
    blurb: "Most reliable for fresh wallets. Try this first.",
    recommended: true,
    icon: "cloud",
  },
  {
    name: "Alchemy",
    href: "https://www.alchemy.com/faucets/ethereum-sepolia",
    allowance: "0.025 ETH",
    auth: "needs 0.001 ETH mainnet",
    blurb: "Quick claim if you already hold a tiny bit of mainnet ETH.",
    icon: "flask",
  },
  {
    name: "QuickNode",
    href: "https://faucet.quicknode.com/ethereum/sepolia",
    allowance: "0.05 ETH / day",
    auth: "Twitter or wallet check",
    blurb: "Fast claim with social verification.",
    icon: "bolt",
  },
  {
    name: "Infura",
    href: "https://www.infura.io/faucet/sepolia",
    allowance: "0.5 ETH",
    auth: "Infura account",
    blurb: "Largest single drip but requires sign-up.",
    icon: "tower",
  },
  {
    name: "Chainlink",
    href: "https://faucets.chain.link/sepolia",
    allowance: "0.1 ETH",
    auth: "GitHub OAuth",
    blurb: "Also drips test LINK if you need it.",
    icon: "chain",
  },
  {
    name: "pk910 PoW",
    href: "https://sepolia-faucet.pk910.de/",
    allowance: "mined in browser",
    auth: "no sign-up",
    blurb: "Browser proof-of-work · datacenter IPs are blocked.",
    icon: "pickaxe",
  },
];

function SepoliaEthFaucets() {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionMarker label="get sepolia eth (for gas)" />
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-medium uppercase leading-tight tracking-tight sm:text-3xl">
            You also need a little <span className="text-primary">Sepolia ETH</span>.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every transaction on Ethereum costs gas — even on the test network.
            Sepolia ETH is free; claim a small amount from one of the faucets
            below, then come back and donate. <span className="text-primary">Google Cloud</span>{" "}
            is the most reliable for fresh wallets.
          </p>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          {FAUCETS.length} verified faucets
        </span>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FAUCETS.map((f) => (
          <li key={f.href}>
            <FaucetCard {...f} />
          </li>
        ))}
      </ul>

      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        // not affiliated with any of these · third-party services may rate-limit
      </p>
    </section>
  );
}

function FaucetCard({
  name,
  href,
  allowance,
  auth,
  blurb,
  recommended,
  icon,
}: {
  name: string;
  href: string;
  allowance: string;
  auth: string;
  blurb: string;
  recommended?: boolean;
  icon: FaucetIconKey;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border bg-card/40 p-5 transition-all duration-200 hover:bg-card/65",
        recommended
          ? "border-primary/40 hover:border-primary"
          : "border-border hover:border-primary/60",
      )}
    >
      {/* Top spine — bright on hover, faint by default */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-0 h-[2px] transition-all duration-200",
          recommended ? "bg-primary" : "bg-primary/20 group-hover:bg-primary",
        )}
        style={
          recommended
            ? {
                boxShadow:
                  "0 0 10px hsla(49, 100%, 50%, 0.6), 0 0 22px hsla(49, 100%, 50%, 0.3)",
              }
            : undefined
        }
      />

      {/* Corner brackets */}
      <span aria-hidden className="pointer-events-none absolute left-2 top-2 h-2 w-2 border-l border-t border-primary/50 transition-colors duration-200 group-hover:border-primary" />
      <span aria-hidden className="pointer-events-none absolute right-2 top-2 h-2 w-2 border-r border-t border-primary/50 transition-colors duration-200 group-hover:border-primary" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-primary/50 transition-colors duration-200 group-hover:border-primary" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 border-b border-r border-primary/50 transition-colors duration-200 group-hover:border-primary" />

      {/* Faint surface gradient on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(80% 60% at 30% 0%, hsla(49, 100%, 50%, 0.08), transparent 65%)",
        }}
      />

      {/* HEADER — icon + recommended pill */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="text-primary/85 transition-colors duration-200 group-hover:text-primary">
          <FaucetIcon name={icon} />
        </span>
        {recommended ? (
          <span className="border border-primary/50 bg-primary/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-primary">
            ★ recommended
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-primary">
            open ↗
          </span>
        )}
      </div>

      {/* TITLE */}
      <h3 className="relative z-10 mt-4 font-display text-xl font-medium uppercase tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
        {name}
      </h3>

      {/* BLURB */}
      <p className="relative z-10 mt-2 text-sm leading-relaxed text-muted-foreground">
        {blurb}
      </p>

      {/* META CHIPS */}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1.5 pt-4 font-mono text-[9px] uppercase tracking-widest">
        <span className="border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-primary">
          {allowance}
        </span>
        <span className="border border-border bg-card/40 px-1.5 py-0.5 text-muted-foreground">
          {auth}
        </span>
      </div>
    </a>
  );
}

function FaucetIcon({ name }: { name: FaucetIconKey }) {
  const common = {
    width: 32,
    height: 32,
    viewBox: "0 0 32 32",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "cloud":
      // Cloud
      return (
        <svg {...common}>
          <path d="M9 22h14a4 4 0 100-8 6 6 0 00-11.5-2A4 4 0 009 22z" />
          <path d="M16 14V8M13 11l3-3 3 3" />
        </svg>
      );
    case "flask":
      // Alchemy flask with bubbles
      return (
        <svg {...common}>
          <path d="M12 4h8M14 4v8L9 24a2 2 0 002 3h10a2 2 0 002-3l-5-12V4" />
          <circle cx="14" cy="20" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="18" cy="22" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "bolt":
      // QuickNode lightning
      return (
        <svg {...common}>
          <path d="M18 4L8 18h7l-1 10 10-14h-7l1-10z" />
        </svg>
      );
    case "tower":
      // Infura tower / gateway
      return (
        <svg {...common}>
          <rect x="11" y="10" width="10" height="18" />
          <path d="M11 14h10M11 18h10M11 22h10M9 10l3-4h8l3 4M14 28v-3h4v3" />
        </svg>
      );
    case "chain":
      // Chainlink: two interlocking links
      return (
        <svg {...common}>
          <rect x="4" y="12" width="12" height="8" rx="4" />
          <rect x="16" y="12" width="12" height="8" rx="4" />
          <path d="M11 16h10" strokeOpacity="0.5" />
        </svg>
      );
    case "pickaxe":
      // pk910 PoW pickaxe
      return (
        <svg {...common}>
          <path d="M5 27l12-12" />
          <path d="M22 4l6 6-3 3-6-6 3-3z" />
          <path d="M14 12l6 6" />
          <circle cx="6" cy="26" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
