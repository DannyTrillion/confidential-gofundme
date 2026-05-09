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

/// Small directory of trustworthy Sepolia ETH faucets. Even with test USDC,
/// donors still need a tiny amount of Sepolia ETH to pay gas. Links open
/// in new tabs.
function SepoliaEthFaucets() {
  const FAUCETS: Array<{
    name: string;
    href: string;
    note: string;
  }> = [
    {
      name: "Google Cloud · Web3 faucet",
      href: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
      note: "0.05 ETH per day · most reliable · sign in with Google",
    },
    {
      name: "Alchemy faucet",
      href: "https://www.alchemy.com/faucets/ethereum-sepolia",
      note: "0.025 ETH · requires 0.001 ETH on mainnet",
    },
    {
      name: "QuickNode faucet",
      href: "https://faucet.quicknode.com/ethereum/sepolia",
      note: "0.05 ETH · daily · twitter or wallet check",
    },
    {
      name: "Infura faucet",
      href: "https://www.infura.io/faucet/sepolia",
      note: "0.5 ETH · requires Infura account",
    },
    {
      name: "Chainlink faucet",
      href: "https://faucets.chain.link/sepolia",
      note: "0.1 ETH · github auth · also LINK testnet",
    },
    {
      name: "pk910 PoW faucet",
      href: "https://sepolia-faucet.pk910.de/",
      note: "no signup · mines in browser · IP-restricted from datacenters",
    },
  ];

  return (
    <section className="space-y-5">
      <div>
        <SectionMarker label="get sepolia eth (for gas)" />
        <h2 className="mt-3 max-w-2xl font-display text-2xl font-medium uppercase leading-tight tracking-tight sm:text-3xl">
          You also need a little Sepolia ETH.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Sending any transaction on Ethereum costs gas. Sepolia ETH is free —
          claim a bit from one of these faucets, then come back and donate. Try
          Google Cloud first, it&apos;s the most reliable.
        </p>
      </div>

      <ul className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {FAUCETS.map((f) => (
          <li key={f.href}>
            <a
              href={f.href}
              target="_blank"
              rel="noreferrer"
              className="group block h-full bg-background p-5 transition-colors hover:bg-card/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-base font-medium uppercase tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {f.name}
                </span>
                <span className="font-mono text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  open ↗
                </span>
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {f.note}
              </p>
            </a>
          </li>
        ))}
      </ul>

      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        // not affiliated with any of these · third-party services may rate-limit
      </p>
    </section>
  );
}
