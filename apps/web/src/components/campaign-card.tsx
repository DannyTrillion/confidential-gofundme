"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { ProgressBar } from "@/components/progress-bar";
import { CategoryPill } from "@/components/category-pill";
import { CoverImage } from "@/components/cover-image";
import { CAMPAIGN_ABI } from "@/lib/contracts";
import { gatewayUrl } from "@/lib/ipfs-client";
import { getFhevmInstance } from "@/lib/fhevm";
import { tokenUnitsToUsd } from "@/lib/format";
import { pseudoLabel, shortAddress } from "@/lib/utils";
import { DEMO_MODE, findMockCampaign } from "@/lib/demo";

type Meta = {
  title?: string;
  pseudonym?: string;
  category?: number;
  coverSrc?: string;
};

/// Demo-mode helper: derive bucketsLit from precomputed plaintext numbers.
/// Production path uses the on-chain ebools instead.
function deriveBucketsFromUsd(raisedUsd: number, goalUsd: number): 0 | 1 | 2 | 3 | 4 {
  if (goalUsd <= 0) return 0;
  const ratio = raisedUsd / goalUsd;
  if (ratio >= 1) return 4;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
  if (ratio >= 0.25) return 1;
  return 0;
}

export function CampaignCard({ address }: { address: `0x${string}` }) {
  const [donors, setDonors] = useState<bigint | null>(null);
  const [goalUsd, setGoalUsd] = useState<number>(0);
  const [bucketsLit, setBucketsLit] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [meta, setMeta] = useState<Meta>({});
  const [closed, setClosed] = useState<boolean>(false);

  useEffect(() => {
    if (DEMO_MODE) {
      const m = findMockCampaign(address);
      if (m) {
        setDonors(BigInt(m.donors));
        setGoalUsd(m.goalUsd);
        // Demo mode has plaintext mock numbers — derive buckets directly.
        setBucketsLit(deriveBucketsFromUsd(m.raisedUsd, m.goalUsd));
        setMeta({
          title: m.title,
          pseudonym: m.pseudonym,
          category: m.category,
          coverSrc: m.coverDataUri,
        });
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const provider = new JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      );
      const c = new Contract(address, CAMPAIGN_ABI, provider);
      const [count, ipfsHash, goalTokens, buckets, category, closedFlag] = await Promise.all([
        c.publicDonorCount(),
        c.ipfsHash(),
        c.goal(),
        // v4 contracts don't have getProgressBuckets — fall back to four zero
        // handles, which decrypt as `false` (or the publicDecrypt fails silently
        // below). Card still renders with the bar at 0/4.
        c.getProgressBuckets().catch(() => [
          "0x" + "0".repeat(64),
          "0x" + "0".repeat(64),
          "0x" + "0".repeat(64),
          "0x" + "0".repeat(64),
        ] as const),
        c.category(),
        c.closed().catch(() => false),
      ]);
      if (cancelled) return;
      setDonors(count);
      setClosed(Boolean(closedFlag));

      setGoalUsd(Number(tokenUnitsToUsd(BigInt(goalTokens))));

      try {
        const instance = await getFhevmInstance();
        const handles = [buckets[0], buckets[1], buckets[2], buckets[3]];
        const decoded = await instance.publicDecrypt(handles);
        const flips = handles.map((h) => Boolean(decoded.clearValues[h]));
        const lit = flips.filter(Boolean).length as 0 | 1 | 2 | 3 | 4;
        if (!cancelled) setBucketsLit(lit);
      } catch {}

      try {
        const cid = String(ipfsHash).replace("ipfs://", "");
        const r = await fetch(gatewayUrl(cid));
        if (r.ok && !cancelled) {
          const j = await r.json();
          setMeta({
            title: j.title,
            pseudonym: j.pseudonym,
            category: Number(category),
            coverSrc: j.coverCid ? gatewayUrl(j.coverCid) : undefined,
          });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const funded = bucketsLit >= 4;

  return (
    <Link
      href={`/campaign/${address}`}
      className="group relative flex h-full flex-col border border-transparent bg-background/60 transition-colors hover:bg-background hover-flicker"
    >
      <CoverImage src={meta.coverSrc} aspectClass="aspect-[5/2]" className="border-x-0 border-t-0" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {pseudoLabel(address)}
          </span>
          {closed ? (
            <span className="border border-muted-foreground/50 bg-muted-foreground/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Closed
            </span>
          ) : funded ? (
            <span className="border border-primary/50 bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
              Funded
            </span>
          ) : (
            <span className="border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Active
            </span>
          )}
        </div>

        <h3 className="mt-3 font-mono text-base font-medium leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
          {meta.title ?? "Untitled campaign"}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {meta.category !== undefined && <CategoryPill category={meta.category} />}
          <span>{meta.pseudonym ?? "—"}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{donors !== null ? `${donors.toString()} donors` : "—"}</span>
        </div>

        <div className="mt-6">
          <ProgressBar bucketsLit={bucketsLit} goalUsd={goalUsd} compact showGoal={false} />
        </div>

        <div className="mt-auto flex items-center justify-between pt-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{shortAddress(address)}</span>
          <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
            view →
          </span>
        </div>
      </div>
    </Link>
  );
}
