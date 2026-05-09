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
      ensureDeployed(DEPLOYMENTS.token, "cUSDC token");
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
        <SectionMarker label="cUSDC test faucet" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Mint test cUSDC.<br />
          <span className="text-muted-foreground">Donate to live campaigns instantly.</span>
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="border border-border bg-card/40">
          <div className="border-b border-border p-5">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
              Mint cUSDC — open faucet
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confidential ERC-7984 token (USD-denominated) · balances and transfers stay encrypted
            </p>
          </div>
          <div className="p-5">
            <WalletGate
              compact
              title="Connect to mint"
              description="Connect your wallet on Sepolia to mint test cUSDC."
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
                    // minted · check your balance via user-decrypt
                  </p>
                )}
                <Button onClick={mint} disabled={busy} size="lg">
                  {busy ? "Minting…" : "Mint cUSDC →"}
                </Button>
              </div>
            </WalletGate>
          </div>
        </div>

        <aside className="border border-border bg-card/40 p-5">
          <AsciiGlyph name="orb" className="mb-4" />
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            How it works
          </h3>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            The faucet encrypts your requested amount client-side and calls{" "}
            <span className="font-mono text-foreground">mint(externalEuint64)</span>. The token
            contract runs <span className="font-mono text-foreground">FHE.fromExternal</span>,
            verifies the proof, and credits an encrypted balance.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            On mainnet, this faucet would be replaced by an{" "}
            <span className="font-mono text-foreground">ERC7984ERC20Wrapper</span> over real USDC —
            donors wrap USDC into cUSDC before donating, and beneficiaries unwrap back to USDC
            after withdrawing. The Campaign contract is unchanged in either deployment.
          </p>
        </aside>
      </div>
    </div>
  );
}
