"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WalletGate } from "@/components/wallet-gate";
import { CAMPAIGN_ABI, ensureDeployed } from "@/lib/contracts";
import { pinVoucher } from "@/app/actions";
import { shortAddress } from "@/lib/utils";
import { DEMO_MODE } from "@/lib/demo";

export type VoucherEntry = {
  address: `0x${string}`;
  name: string;
  message: string;
  attestedAt: number;
};

export function VouchersList({
  campaignAddress,
  vouchers,
}: {
  campaignAddress: `0x${string}`;
  vouchers: VoucherEntry[];
}) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [list, setList] = useState<VoucherEntry[]>(vouchers);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attest() {
    setError(null);
    if (!name.trim() || !message.trim()) return;
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }

    if (DEMO_MODE) {
      setList((prev) => [
        ...prev,
        {
          address: address as `0x${string}`,
          name: name.trim(),
          message: message.trim(),
          attestedAt: Date.now(),
        },
      ]);
      setName("");
      setMessage("");
      setOpen(false);
      return;
    }

    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setError("Wallet provider not ready — refresh and try again.");
      return;
    }

    setBusy(true);
    try {
      ensureDeployed(campaignAddress, "Campaign");
      const cid = await pinVoucher({
        name: name.trim(),
        message: message.trim(),
        attestedAt: Date.now(),
      });
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const c = new Contract(campaignAddress, CAMPAIGN_ABI, signer);
      const tx = await c.vouch(cid);
      await tx.wait();
      setList((prev) => [
        ...prev,
        {
          address: address as `0x${string}`,
          name: name.trim(),
          message: message.trim(),
          attestedAt: Date.now(),
        },
      ]);
      setName("");
      setMessage("");
      setOpen(false);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // no one has vouched yet
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((v, i) => (
            <li key={`${v.address}-${i}`} className="border border-border bg-card/40 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                  {v.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {shortAddress(v.address)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{v.message}</p>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          + Vouch for this campaign
        </Button>
      ) : (
        <WalletGate
          compact
          title="Connect to vouch"
          description="You need a connected wallet on Sepolia to publicly attest to this campaign."
        >
          <div className="space-y-3 border border-border bg-card/40 p-5">
            <div className="space-y-2">
              <Label>Your name or organization</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. F. Adeyemi · LUTH oncology"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What can you confirm about this campaign?"
                disabled={busy}
              />
            </div>
            {error && <p className="font-mono text-xs text-destructive">// {error}</p>}
            <div className="flex items-center gap-2">
              <Button onClick={attest} disabled={busy || !name.trim() || !message.trim()} size="sm">
                {busy ? "Posting…" : "Post attestation"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        </WalletGate>
      )}
    </div>
  );
}
