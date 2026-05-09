"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient } from "wagmi";
import { Contract, BrowserProvider, isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CoverImageUploader } from "@/components/cover-image-uploader";
import { pinStory } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";
import { DEPLOYMENTS, FACTORY_ABI, ensureDeployed } from "@/lib/contracts";
import { usdToTokenUnits } from "@/lib/format";
import { cn } from "@/lib/utils";

function Field({
  label,
  hint,
  badge,
  children,
}: {
  label: string;
  hint?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {badge}
      </div>
      {children}
      {hint && (
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
          {hint}
        </p>
      )}
    </div>
  );
}

export function CreateCampaignForm() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [title, setTitle] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [story, setStory] = useState("");
  const [goalNgn, setGoalNgn] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [category, setCategory] = useState<number>(0);
  const [coverCid, setCoverCid] = useState<string | undefined>();
  const [recipientPubkey, setRecipientPubkey] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      ensureDeployed(DEPLOYMENTS.factory, "Campaign factory");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      return;
    }
    if (!isAddress(beneficiary)) {
      setError("Beneficiary wallet is not a valid address.");
      return;
    }
    const goalNum = BigInt(goalNgn || "0");
    if (goalNum <= 0n) {
      setError("Goal must be greater than zero.");
      return;
    }

    setBusy(true);
    try {
      setStage("Pinning story to IPFS…");
      const cid = await pinStory({
        title,
        pseudonym: pseudonym || undefined,
        story,
        category,
        coverCid,
        createdAt: Date.now(),
      });

      const goalTokens = usdToTokenUnits(goalNum);

      setStage("Submitting transaction…");
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const factory = new Contract(DEPLOYMENTS.factory, FACTORY_ABI, signer);

      // Normalize the optional recipient pubkey to a bytes32 (zero hash if absent).
      const cleanedPubkey = recipientPubkey.trim().replace(/^0x/, "");
      const pubkeyBytes32 =
        cleanedPubkey.length === 64
          ? `0x${cleanedPubkey}`
          : "0x0000000000000000000000000000000000000000000000000000000000000000";

      // Recipient wallet is now passed as a plain public address. Per-donation
      // amounts remain encrypted; only the recipient is publicly verifiable.
      const tx = await factory.createCampaign(
        goalTokens,
        category,
        pubkeyBytes32,
        beneficiary,
        `ipfs://${cid}`,
      );
      const receipt = await tx.wait();
      const log = receipt.logs.find((l: any) => l.fragment?.name === "CampaignCreated");
      const campaignAddr: string = log.args.campaign;
      setStage("");
      router.push(`/campaign/${campaignAddr}`);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <Field label="Title" hint="Shown on the browse page and at the top of your campaign.">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cancer treatment fund"
            disabled={busy}
          />
        </Field>

        <Field label="Category">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                disabled={busy}
                aria-pressed={category === c.id}
                className={cn(
                  "border px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  category === c.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Pseudonym (optional)" hint="A name or initials donors see — your real name is never required.">
          <Input
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            placeholder="A.O."
            disabled={busy}
          />
        </Field>

        <CoverImageUploader onChange={setCoverCid} disabled={busy} />

        <Field
          label="Your story"
          hint="// markdown supported · public — donors will read this before giving"
        >
          <Textarea
            required
            rows={12}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={"## What I'm raising for\n\nWrite the story in your own words.\n\n## How the funds will be used\n\n- bullet points\n- like this\n\n**Bold** and *italic* work too."}
            disabled={busy}
          />
        </Field>

        <Field
          label="Goal (USD)"
          hint="// public goal · donors see how close you are · paid in USDC"
        >
          <Input
            type="number"
            inputMode="numeric"
            required
            min={1}
            value={goalNgn}
            onChange={(e) => setGoalNgn(e.target.value)}
            placeholder="2500"
            disabled={busy}
          />
        </Field>

        <Field
          label="Beneficiary wallet"
          hint="// public on-chain · donors verify on Etherscan before they give"
        >
          <Input
            required
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="0x…"
            disabled={busy}
          />
        </Field>

        <Field
          label="Recipient encryption pubkey (optional)"
          hint="// 32-byte curve25519 hex · enables private notes from donors only the recipient can read"
        >
          <Input
            value={recipientPubkey}
            onChange={(e) => setRecipientPubkey(e.target.value)}
            placeholder="a1b2c3d4… (64 hex chars)"
            disabled={busy}
          />
        </Field>

        {error && <p className="font-mono text-sm text-destructive">// {error}</p>}
        {stage && <p className="font-mono text-xs uppercase tracking-widest text-primary">// {stage}</p>}

        <Button type="submit" size="lg" disabled={busy || !isConnected}>
          {busy ? "Launching…" : "Launch campaign →"}
        </Button>
      </div>

      <aside className="space-y-4">
        <div className="border border-border bg-card/40 p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            What's public
          </h3>
          <ul className="mt-3 space-y-2 font-mono text-xs">
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">title · category</span><span>public</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">story · cover</span><span>public</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">goal</span><span>public</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">total raised</span><span>public</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">donor count</span><span>public</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">vouchers · updates</span><span>public</span></li>
          </ul>
        </div>

        <div className="border border-border bg-card/40 p-5">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            What stays private
          </h3>
          <ul className="mt-3 space-y-2 font-mono text-xs">
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">each donation amount</span><span className="text-primary">encrypted</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">beneficiary wallet</span><span className="text-primary">encrypted</span></li>
            <li className="flex justify-between gap-3"><span className="text-muted-foreground">donor identities</span><span className="text-primary">anonymous</span></li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
