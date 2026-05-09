"use client";

import { useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Contract, BrowserProvider } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getFhevmInstance } from "@/lib/fhevm";
import { sealTo, bytesToHexStr } from "@/lib/crypto";
import { CAMPAIGN_ABI, DEPLOYMENTS, TOKEN_ABI, ensureDeployed } from "@/lib/contracts";
import { usdToTokenUnits } from "@/lib/format";
import { DEMO_MODE } from "@/lib/demo";

const FAR_FUTURE = 4_000_000_000n;
const ZERO_PUBKEY = "0x" + "0".repeat(64);

export function DonateForm({
  campaignAddress,
  recipientPubkey,
}: {
  campaignAddress: `0x${string}`;
  recipientPubkey?: string;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [amountUsd, setAmountUsd] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [needsOperator, setNeedsOperator] = useState(false);

  const notesEnabled =
    !!recipientPubkey && recipientPubkey !== ZERO_PUBKEY && recipientPubkey.replace(/^0x/, "").length === 64;

  // Cache whether the campaign is already an authorized operator on the
  // token, so a returning donor sees just one tx instead of two.
  useEffect(() => {
    if (DEMO_MODE) return;
    if (!isConnected || !address) {
      setNeedsOperator(true);
      return;
    }
    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setNeedsOperator(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const provider = new BrowserProvider(eth);
        const token = new Contract(DEPLOYMENTS.token, TOKEN_ABI, provider);
        const isOperator = await token.isOperator(address, campaignAddress);
        if (!cancelled) setNeedsOperator(!isOperator);
      } catch {
        if (!cancelled) setNeedsOperator(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, walletClient, campaignAddress, isConnected]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }
    if (chainId !== DEPLOYMENTS.chainId) {
      setError(`Switch to chain ${DEPLOYMENTS.chainId} (Sepolia).`);
      return;
    }
    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setError("Wallet provider not ready — refresh and try again.");
      return;
    }
    try {
      ensureDeployed(DEPLOYMENTS.token, "Donation token");
      ensureDeployed(campaignAddress, "Campaign");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      return;
    }
    const usd = BigInt(amountUsd || "0");
    if (usd <= 0n) {
      setError("Amount must be greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const tokens = usdToTokenUnits(usd);
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const token = new Contract(DEPLOYMENTS.token, TOKEN_ABI, signer);
      const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer);

      // First-time donors approve the campaign once, then donate.
      if (needsOperator) {
        setStage("Step 1 of 2 · letting the campaign accept your donation");
        const tx0 = await token.setOperator(campaignAddress, FAR_FUTURE);
        await tx0.wait();
        setNeedsOperator(false);
      }

      setStage("Making your amount private…");
      const instance = await getFhevmInstance();
      const enc = await instance
        .createEncryptedInput(campaignAddress, address)
        .add64(tokens)
        .encrypt();

      let noteBytes: string = "0x";
      if (notesEnabled && note.trim()) {
        setStage("Sealing your message to the recipient…");
        const sealed = await sealTo(recipientPubkey!.replace(/^0x/, ""), note.trim());
        noteBytes = bytesToHexStr(sealed);
      }

      setStage(needsOperator ? "Step 2 of 2 · submitting donation" : "Submitting donation…");
      const tx = await campaign.donate(enc.handles[0], enc.inputProof, noteBytes);
      await tx.wait();

      setStage("");
      setAmountUsd("");
      setNote("");
      setDone(true);
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Amount (USD)</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={amountUsd}
          onChange={(e) => setAmountUsd(e.target.value)}
          placeholder="50"
          disabled={busy}
          required
        />
      </div>

      {notesEnabled ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Message to recipient (optional)</Label>
            <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70">
              sealed · only they can read
            </span>
          </div>
          <Textarea
            rows={2}
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Praying for you · for your treatment · keep going"
            disabled={busy}
          />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
            // private message to the recipient · {note.length}/280
          </p>
        </div>
      ) : null}

      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        // your amount stays private · only the running total is shown
      </p>

      {needsOperator && !DEMO_MODE && isConnected && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
          // first donation from this wallet · needs two confirmations
        </p>
      )}

      {error && <p className="font-mono text-xs text-destructive">// {error}</p>}
      {stage && <p className="font-mono text-xs uppercase tracking-widest text-primary">// {stage}</p>}
      {done && (
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          // donation submitted privately
        </p>
      )}
      <Button type="submit" disabled={busy || !isConnected} className="w-full">
        {busy ? "Donating…" : "Donate privately →"}
      </Button>
    </form>
  );
}
