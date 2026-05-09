"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { ProgressBar } from "@/components/progress-bar";
import { CategoryPill } from "@/components/category-pill";
import { CoverImage } from "@/components/cover-image";
import { CAMPAIGN_ABI, DEPLOYMENTS } from "@/lib/contracts";
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

export function CampaignCard({ address }: { address: `0x${string}` }) {
  const [donors, setDonors] = useState<bigint | null>(null);
  const [goalUsd, setGoalUsd] = useState<number>(0);
  const [raisedUsd, setRaisedUsd] = useState<number>(0);
  const [meta, setMeta] = useState<Meta>({});
  const [closed, setClosed] = useState<boolean>(false);

  useEffect(() => {
    if (DEMO_MODE) {
      const m = findMockCampaign(address);
      if (m) {
        setDonors(BigInt(m.donors));
        setGoalUsd(m.goalUsd);
        setRaisedUsd(m.raisedUsd);
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
      const [count, ipfsHash, goalTokens, totalHandle, category, closedFlag] = await Promise.all([
        c.publicDonorCount(),
        c.ipfsHash(),
        c.goal(),
        c.getEncryptedTotal(),
        c.category(),
        c.closed().catch(() => false),
      ]);
      if (cancelled) return;
      setDonors(count);
      setClosed(Boolean(closedFlag));

      setGoalUsd(Number(tokenUnitsToUsd(BigInt(goalTokens))));

      try {
        const instance = await getFhevmInstance();
        const decoded = await instance.publicDecrypt([totalHandle]);
        const totalTokens = decoded.clearValues[totalHandle] as bigint;
        if (!cancelled) setRaisedUsd(Number(tokenUnitsToUsd(totalTokens)));
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

  const funded = goalUsd > 0 && raisedUsd >= goalUsd;

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
          <ProgressBar raised={raisedUsd} goal={goalUsd} compact />
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
