"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract } from "ethers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MarkdownStory } from "@/components/markdown-story";
import { CAMPAIGN_ABI, ensureDeployed } from "@/lib/contracts";
import { pinUpdate } from "@/app/actions";
import { DEMO_MODE } from "@/lib/demo";

export type UpdateEntry = {
  postedAt: number; // unix ms
  body: string;
};

export function UpdatesFeed({
  campaignAddress,
  creatorAddress,
  updates,
}: {
  campaignAddress: `0x${string}`;
  creatorAddress: string;
  updates: UpdateEntry[];
}) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [list, setList] = useState<UpdateEntry[]>(updates);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator =
    address && creatorAddress && address.toLowerCase() === creatorAddress.toLowerCase();

  async function postNew() {
    setError(null);
    if (!draft.trim()) return;

    if (DEMO_MODE) {
      setList((prev) => [...prev, { postedAt: Date.now(), body: draft.trim() }]);
      setDraft("");
      return;
    }

    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setError("Connect your wallet first.");
      return;
    }

    setBusy(true);
    try {
      ensureDeployed(campaignAddress, "Campaign");
      const cid = await pinUpdate({ body: draft.trim(), postedAt: Date.now() });
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const c = new Contract(campaignAddress, CAMPAIGN_ABI, signer);
      const tx = await c.postUpdate(cid);
      await tx.wait();
      setList((prev) => [...prev, { postedAt: Date.now(), body: draft.trim() }]);
      setDraft("");
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (list.length === 0 && !isCreator) return null;

  return (
    <div className="space-y-5">
      {list.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // no updates yet
        </p>
      ) : (
        <ol className="space-y-4">
          {list.map((u, i) => (
            <li key={i} className="border border-border bg-card/40 p-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
                <span>Update #{i + 1}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{formatRelative(u.postedAt)}</span>
              </div>
              <MarkdownStory source={u.body} className="text-sm" />
            </li>
          ))}
        </ol>
      )}

      {isCreator && (
        <div className="border border-border bg-card/40 p-5">
          <Label>Post an update</Label>
          <Textarea
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's the latest? Markdown supported."
            disabled={busy}
            className="mt-2"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={postNew} disabled={busy || !draft.trim()} size="sm">
              {busy ? "Posting…" : "Post update"}
            </Button>
            {error && <span className="font-mono text-xs text-destructive">// {error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
