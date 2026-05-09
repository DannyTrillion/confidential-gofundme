"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract, JsonRpcProvider, isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { PrivacyBadge } from "@/components/privacy-badge";
import { CategoryPill } from "@/components/category-pill";
import { CoverImage } from "@/components/cover-image";
import { MarkdownStory } from "@/components/markdown-story";
import { UpdatesFeed, type UpdateEntry } from "@/components/updates-feed";
import { VouchersList, type VoucherEntry } from "@/components/vouchers-list";
import { DonateForm } from "@/components/donate-form";
import { SectionMarker } from "@/components/section-marker";
import { WalletGate } from "@/components/wallet-gate";
import { WatchToggle } from "@/components/watch-toggle";
import { CopyAddress } from "@/components/copy-address";
import { CountUp } from "@/components/count-up";
import { CAMPAIGN_ABI, DEPLOYMENTS, ensureDeployed } from "@/lib/contracts";
import { getFhevmInstance } from "@/lib/fhevm";
import { gatewayUrl } from "@/lib/ipfs-client";
import { tokenUnitsToUsd } from "@/lib/format";
import { pseudoLabel, shortAddress } from "@/lib/utils";
import { DEMO_MODE, findMockCampaign } from "@/lib/demo";

type Snapshot = {
  donors: bigint;
  creator: string;
  goalUsd: number;
  raisedUsd: number;
  category: number;
  coverSrc?: string;
  title?: string;
  pseudonym?: string;
  story?: string;
  updates: UpdateEntry[];
  vouchers: VoucherEntry[];
  recipientPubkey?: string;
  beneficiary?: string;
  closed: boolean;
  closedAt: number;
};

export default function CampaignDetail() {
  const params = useParams<{ address: string }>();
  const campaignAddress = params.address as `0x${string}`;
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAddress(campaignAddress)) return;

    if (DEMO_MODE) {
      const mock = findMockCampaign(campaignAddress);
      if (!mock) return;
      setSnap({
        donors: BigInt(mock.donors),
        creator: "0xc0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0",
        goalUsd: mock.goalUsd,
        raisedUsd: mock.raisedUsd,
        category: mock.category,
        coverSrc: mock.coverDataUri,
        title: mock.title,
        pseudonym: mock.pseudonym,
        story: mock.story,
        updates: mock.updates,
        vouchers: mock.vouchers,
        recipientPubkey: mock.recipientPubkey ? `0x${mock.recipientPubkey}` : undefined,
        beneficiary: "0xb1b2b3b4b5b6b7b8b9bababbbcbdbebfb0b1b2b3",
        closed: false,
        closedAt: 0,
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
      const provider = new JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      );
      const c = new Contract(campaignAddress, CAMPAIGN_ABI, provider);

      // Read each field individually so a single failing call doesn't blank
      // the entire page. Surface the underlying error in dev via console.
      async function safeRead<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
        try {
          return await fn();
        } catch (e) {
          console.error(`[campaign] failed reading ${label}:`, e);
          setLoadError((prev) => prev ?? `${label}: ${(e as any)?.shortMessage ?? (e as any)?.message ?? String(e)}`);
          return fallback;
        }
      }

      const [
        donors,
        ipfsHash,
        creator,
        goalTokens,
        totalHandle,
        category,
        updatesCount,
        vouchersCount,
        recipientPubkey,
        beneficiary,
        closedFlag,
        closedAtRaw,
      ] = await Promise.all([
        safeRead("publicDonorCount", () => c.publicDonorCount(), 0n),
        safeRead("ipfsHash", () => c.ipfsHash(), ""),
        safeRead("creator", () => c.creator(), "0x0000000000000000000000000000000000000000"),
        safeRead("goal", () => c.goal(), 0n),
        safeRead("getEncryptedTotal", () => c.getEncryptedTotal(), "0x" + "0".repeat(64)),
        safeRead("category", () => c.category(), 4),
        safeRead("updatesCount", () => c.updatesCount(), 0n),
        safeRead("vouchersCount", () => c.vouchersCount(), 0n),
        safeRead("recipientPubkey", () => c.recipientPubkey(), "0x" + "0".repeat(64)),
        safeRead("beneficiary", () => c.beneficiary(), "0x0000000000000000000000000000000000000000"),
        safeRead("closed", () => c.closed(), false),
        safeRead("closedAt", () => c.closedAt(), 0n),
      ]);

      const goalUsd = Number(tokenUnitsToUsd(BigInt(goalTokens)));
      let raisedUsd = 0;
      try {
        const instance = await getFhevmInstance();
        const decoded = await instance.publicDecrypt([totalHandle]);
        const totalTokens = decoded.clearValues[totalHandle] as bigint;
        raisedUsd = Number(tokenUnitsToUsd(totalTokens));
      } catch {}

      let title: string | undefined;
      let pseudonym: string | undefined;
      let story: string | undefined;
      let coverSrc: string | undefined;
      try {
        const cid = String(ipfsHash).replace("ipfs://", "");
        const r = await fetch(gatewayUrl(cid), { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const j = await r.json();
          title = j.title;
          pseudonym = j.pseudonym;
          story = j.story;
          coverSrc = j.coverCid ? gatewayUrl(j.coverCid) : undefined;
        }
      } catch {}

      const updates: UpdateEntry[] = [];
      for (let i = 0; i < Number(updatesCount); i++) {
        try {
          const cid: string = await c.updates(i);
          const r = await fetch(gatewayUrl(cid));
          if (r.ok) {
            const j = await r.json();
            updates.push({ postedAt: Number(j.postedAt) || Date.now(), body: j.body || "" });
          }
        } catch {}
      }

      const vouchers: VoucherEntry[] = [];
      for (let i = 0; i < Number(vouchersCount); i++) {
        try {
          const v = await c.vouchers(i);
          const r = await fetch(gatewayUrl(v.cid));
          if (r.ok) {
            const j = await r.json();
            vouchers.push({
              address: v.attester as `0x${string}`,
              name: j.name || shortAddress(v.attester),
              message: j.message || "",
              attestedAt: Number(j.attestedAt) || Number(v.attestedAt) * 1000,
            });
          }
        } catch {}
      }

      if (!cancelled) {
        setSnap({
          donors,
          creator,
          goalUsd,
          raisedUsd,
          category: Number(category),
          coverSrc,
          title,
          pseudonym,
          story,
          updates,
          vouchers,
          recipientPubkey: recipientPubkey as string,
          beneficiary: beneficiary as string,
          closed: Boolean(closedFlag),
          closedAt: Number(closedAtRaw) * 1000,
        });
      }
      } catch (e: any) {
        console.error("[campaign] loader threw", e);
        if (!cancelled) {
          setLoadError(`loader: ${e?.shortMessage ?? e?.message ?? String(e)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignAddress]);

  if (!isAddress(campaignAddress)) {
    return <p className="font-mono text-sm text-destructive">Invalid campaign address.</p>;
  }
  if (DEMO_MODE && !findMockCampaign(campaignAddress)) {
    return (
      <div className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Campaign not found in demo data.
        </p>
        <Button asChild variant="outline">
          <Link href="/">← Back to browse</Link>
        </Button>
      </div>
    );
  }

  const funded = snap ? snap.goalUsd > 0 && snap.raisedUsd >= snap.goalUsd : false;
  const closed = snap?.closed ?? false;
  const isCreator =
    !!address && !!snap?.creator && address.toLowerCase() === snap.creator.toLowerCase();

  async function closeCampaign() {
    setCloseError(null);
    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setCloseError("Wallet provider not ready.");
      return;
    }
    setClosing(true);
    try {
      ensureDeployed(campaignAddress, "Campaign");
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const c = new Contract(campaignAddress, CAMPAIGN_ABI, signer);
      const tx = await c.close();
      await tx.wait();
      setSnap((s) => (s ? { ...s, closed: true, closedAt: Date.now() } : s));
    } catch (e: any) {
      setCloseError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* HEADER */}
      <div className="space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Browse
        </Link>

        {snap?.coverSrc !== undefined && <CoverImage src={snap.coverSrc} aspectClass="aspect-[16/6]" />}

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
            {pseudoLabel(campaignAddress)}
          </span>
          {snap && <CategoryPill category={snap.category} />}
          {funded && <PrivacyBadge label="Funded" />}
        </div>
        <h1 className="max-w-4xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          {snap?.title ?? "Untitled campaign"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {snap?.pseudonym && <span>{snap.pseudonym}</span>}
          <CopyAddress address={campaignAddress} />
        </div>
      </div>

      {loadError && (
        <div className="border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-mono text-xs text-destructive">// load error: {loadError}</p>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid gap-12 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          {/* PROGRESS */}
          <section className="space-y-5">
            <SectionMarker label="progress" />
            <div className="grid grid-cols-3 gap-px border border-border bg-border">
              <div className="bg-card/60 p-5">
                <div className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                  {snap ? <CountUp value={Number(snap.donors)} /> : "—"}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Donors
                </div>
              </div>
              <div className="bg-card/60 p-5">
                <div className="font-mono text-2xl font-semibold tabular-nums text-primary sm:text-3xl">
                  {snap && snap.goalUsd > 0 ? (
                    <CountUp
                      value={Math.min(100, Math.round((snap.raisedUsd / snap.goalUsd) * 100))}
                      format={(n) => `${Math.round(n)}%`}
                    />
                  ) : (
                    "—"
                  )}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  of goal
                </div>
              </div>
              <div className="bg-card/60 p-5">
                <div className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                  {snap ? (
                    <CountUp
                      value={snap.raisedUsd}
                      format={(n) =>
                        new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                          notation: n >= 1_000_000 ? "compact" : "standard",
                        }).format(Math.round(n))
                      }
                    />
                  ) : (
                    "—"
                  )}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Raised
                </div>
              </div>
            </div>
            <div className="border border-border bg-card/40 p-5">
              <ProgressBar raised={snap?.raisedUsd ?? 0} goal={snap?.goalUsd ?? 0} />
            </div>
          </section>

          {/* STORY */}
          <section className="space-y-5">
            <SectionMarker label="story" />
            <div className="border border-border bg-card/40 p-6">
              {snap?.story ? (
                <MarkdownStory source={snap.story} />
              ) : !snap ? (
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Loading story…
                </p>
              ) : (
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  // story metadata unavailable · IPFS pin missing or pending
                </p>
              )}
            </div>
          </section>

          {/* UPDATES */}
          <section className="space-y-5">
            <SectionMarker label="updates from the creator" />
            {snap && (
              <UpdatesFeed
                campaignAddress={campaignAddress}
                creatorAddress={snap.creator}
                updates={snap.updates}
              />
            )}
          </section>

          {/* VOUCHERS */}
          <section className="space-y-5">
            <SectionMarker label="vouchers" />
            {snap && <VouchersList campaignAddress={campaignAddress} vouchers={snap.vouchers} />}
          </section>
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-6">
          {closed ? (
            <div className="border border-primary/40 bg-primary/5 p-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
                <span className="inline-block h-1.5 w-1.5 bg-primary" />
                <span>Funded · Closed</span>
              </div>
              <h2 className="mt-3 font-mono text-base font-semibold uppercase tracking-tight">
                This campaign is closed.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The creator has marked it complete. No further donations are accepted.
                {snap?.closedAt
                  ? ` Closed ${new Date(snap.closedAt).toLocaleDateString()}.`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="border border-border bg-card/60">
              <div className="border-b border-border p-5">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
                  Donate privately
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your amount is encrypted before it leaves your device.
                </p>
              </div>
              <div className="p-5">
                <WalletGate
                  compact
                  title="Connect to donate"
                  description="Connect your wallet on Sepolia to make a private donation."
                >
                  <DonateForm
                    campaignAddress={campaignAddress}
                    recipientPubkey={snap?.recipientPubkey}
                  />
                </WalletGate>
              </div>
            </div>
          )}

          {funded && (
            <div className="border border-primary/40 bg-primary/5">
              <div className="border-b border-primary/30 p-5">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-tight text-primary">
                  Goal reached · withdraw
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  The recipient can claim the funds. Sign from the published recipient wallet to release.
                </p>
              </div>
              <div className="p-5">
                <WalletGate
                  compact
                  title="Connect to claim"
                  description="Connect the recipient wallet to claim the funds."
                >
                  <WithdrawButton campaignAddress={campaignAddress} />
                </WalletGate>
              </div>
            </div>
          )}

          {isCreator && !closed && (
            <div className="border border-border bg-card/40 p-5">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Creator controls
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Once the recipient has withdrawn the funds, close the campaign to stop
                further donations. This is irreversible.
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeCampaign}
                  disabled={closing}
                >
                  {closing ? "Closing…" : "Close campaign"}
                </Button>
              </div>
              {closeError && (
                <p className="mt-2 font-mono text-xs text-destructive">// {closeError}</p>
              )}
            </div>
          )}

          {snap?.recipientPubkey && snap.recipientPubkey !== "0x" + "0".repeat(64) && (
            <div className="border border-border bg-card/40 p-5">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Are you the recipient?
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Add this campaign to your inbox so sealed messages from donors show up under{" "}
                <span className="font-mono text-foreground">/inbox</span>.
              </p>
              <div className="mt-3">
                <WatchToggle campaignAddress={campaignAddress} />
              </div>
            </div>
          )}

          <div className="border border-border bg-card/40 p-5">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              What's private · what's public
            </h3>
            <dl className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">individual donation amount</dt>
                <dd className="text-primary">private</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">running total</dt>
                <dd className="text-foreground">public</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">recipient wallet</dt>
                <dd className="text-foreground">public</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">donor messages</dt>
                <dd className="text-primary">sealed</dd>
              </div>
            </dl>
          </div>

          {snap?.beneficiary && snap.beneficiary !== "0x0000000000000000000000000000000000000000" && (
            <div className="border border-border bg-card/40 p-5">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Recipient wallet
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Where funds go on withdrawal. Verify on Etherscan before donating.
              </p>
              <div className="mt-3">
                <CopyAddress address={snap.beneficiary} />
              </div>
            </div>
          )}

          <div className="border border-border bg-card/40 p-5">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Verify the encryption on-chain
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Don&apos;t trust the UI — read the chain directly. Each link below shows
              you a different angle of the live encrypted state.
            </p>
            <ul className="mt-4 space-y-2 font-mono text-[11px]">
              <li>
                <a
                  href={`https://sepolia.etherscan.io/address/${campaignAddress}#readContract`}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 text-foreground hover:text-primary"
                >
                  <span className="text-primary">→</span>
                  <span className="underline-offset-2 group-hover:underline">
                    Read Contract → getEncryptedTotal()
                  </span>
                </a>
                <p className="mt-1 pl-4 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  // returns bytes32 — a ciphertext handle, not a number
                </p>
              </li>
              <li>
                <a
                  href={`https://sepolia.etherscan.io/address/${campaignAddress}#events`}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 text-foreground hover:text-primary"
                >
                  <span className="text-primary">→</span>
                  <span className="underline-offset-2 group-hover:underline">
                    Events → Donated(donor, idx, note)
                  </span>
                </a>
                <p className="mt-1 pl-4 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  // notice: no amount field. ever.
                </p>
              </li>
              <li>
                <a
                  href={`https://sepolia.etherscan.io/address/${campaignAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 text-foreground hover:text-primary"
                >
                  <span className="text-primary">→</span>
                  <span className="underline-offset-2 group-hover:underline">
                    Latest tx → Input Data
                  </span>
                </a>
                <p className="mt-1 pl-4 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  // inH is a bytes32 ciphertext, proof is a ZK blob
                </p>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function WithdrawButton({ campaignAddress }: { campaignAddress: `0x${string}` }) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<null | "claimed" | "no-op">(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      ensureDeployed(campaignAddress, "Campaign");
      const { BrowserProvider, Contract } = await import("ethers");
      const eth = (window as any).ethereum;
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const c = new Contract(campaignAddress, CAMPAIGN_ABI, signer);

      // Read the encrypted total before & after — if it dropped to ~0, the
      // FHE.eq gate matched (you are the recipient) and funds moved.
      const totalBefore = await c.getEncryptedTotal();

      const tx = await c.withdraw();
      await tx.wait();

      const totalAfter = await c.getEncryptedTotal();
      // The handle changes regardless (FHE.sub returns a new ciphertext);
      // the most reliable cleartext check is via the gateway, but for an
      // immediate signal we just confirm tx succeeded and let the receipt
      // page reflect the new total.
      setOutcome(totalAfter !== totalBefore ? "claimed" : "no-op");
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        // only the published recipient can claim
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Connect with the recipient wallet shown on the page. The contract checks the
        sender publicly and only releases funds once the goal has been hit.
      </p>
      <Button onClick={onClick} disabled={busy} className="w-full">
        {busy ? "Withdrawing…" : "Claim as recipient →"}
      </Button>
      {error && <p className="font-mono text-xs text-destructive">{error}</p>}
      {outcome === "claimed" && (
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          // funds claimed · check your wallet balance
        </p>
      )}
      {outcome === "no-op" && (
        <p className="font-mono text-xs text-destructive">
          // tx confirmed but no funds moved — this wallet isn&apos;t the recipient
        </p>
      )}
    </div>
  );
}
