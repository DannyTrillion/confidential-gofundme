"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { Button } from "@/components/ui/button";
import { SectionMarker } from "@/components/section-marker";
import { CategoryPill } from "@/components/category-pill";
import { CAMPAIGN_ABI, DEPLOYMENTS, FACTORY_ABI } from "@/lib/contracts";
import { gatewayUrl } from "@/lib/ipfs-client";
import { pseudoLabel, shortAddress } from "@/lib/utils";
import { DEMO_MODE, MOCK_CAMPAIGNS } from "@/lib/demo";

type CampaignSummary = {
  address: `0x${string}`;
  title: string;
  category: number;
  pseudonym: string;
  vouchersCount: number;
};

export default function VouchersPage() {
  const [list, setList] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(!DEMO_MODE);

  const provider = useMemo(
    () =>
      new JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      ),
    [],
  );

  useEffect(() => {
    if (DEMO_MODE) {
      setList(
        MOCK_CAMPAIGNS.map((c) => ({
          address: c.address,
          title: c.title,
          category: c.category,
          pseudonym: c.pseudonym,
          vouchersCount: c.vouchers.length,
        })),
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const factory = new Contract(DEPLOYMENTS.factory, FACTORY_ABI, provider);
        const addrs: string[] = await factory.getCampaigns(0, 200);
        const out: CampaignSummary[] = [];
        for (const addr of addrs) {
          const c = new Contract(addr, CAMPAIGN_ABI, provider);
          const [ipfsHash, category, vouchersCount] = await Promise.all([
            c.ipfsHash(),
            c.category(),
            c.vouchersCount(),
          ]);
          let title = "Untitled";
          let pseudonym = "—";
          try {
            const cid = String(ipfsHash).replace("ipfs://", "");
            const r = await fetch(gatewayUrl(cid));
            if (r.ok) {
              const j = await r.json();
              title = j.title ?? title;
              pseudonym = j.pseudonym ?? pseudonym;
            }
          } catch {}
          out.push({
            address: addr as `0x${string}`,
            title,
            category: Number(category),
            pseudonym,
            vouchersCount: Number(vouchersCount),
          });
        }
        if (!cancelled) setList(out);
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="vouchers" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Vouch for a campaign you trust.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A voucher publicly endorses a campaign — a doctor, an NGO, a friend
          confirming they know the situation is real. Donors see all
          attestations. Open any campaign below and click <span className="font-mono">+ Vouch for this campaign</span>.
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Loading…
        </p>
      ) : list.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          // no campaigns yet
        </p>
      ) : (
        <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.address} className="bg-background/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {pseudoLabel(c.address)}
                </span>
                <CategoryPill category={c.category} />
              </div>
              <h3 className="mt-3 font-mono text-base font-medium leading-tight tracking-tight">
                {c.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.pseudonym} · {c.vouchersCount} {c.vouchersCount === 1 ? "voucher" : "vouchers"}
              </p>
              <div className="mt-5">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/campaign/${c.address}`}>View campaign →</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
