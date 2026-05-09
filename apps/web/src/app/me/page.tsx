"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contract, JsonRpcProvider } from "ethers";
import { useAccount } from "wagmi";
import { CampaignCard } from "@/components/campaign-card";
import { SectionMarker } from "@/components/section-marker";
import { WalletGate } from "@/components/wallet-gate";
import { CAMPAIGN_ABI, DEPLOYMENTS, FACTORY_ABI } from "@/lib/contracts";
import { cn } from "@/lib/utils";

type Tab = "created" | "donated" | "past";

export default function MePage() {
  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="my campaigns" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Your campaigns.<br />
          <span className="text-muted-foreground">Created, supported, archived.</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Everything tied to the wallet you&apos;ve connected. Active campaigns you launched,
          campaigns you&apos;ve donated to, and your past (closed) campaigns — all on chain,
          all verifiable.
        </p>
      </div>

      <WalletGate
        title="Connect to see your campaigns"
        description="Your campaigns are scoped to your wallet address. Connect to view them."
      >
        <MeTabs />
      </WalletGate>
    </div>
  );
}

function MeTabs() {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>("created");
  const [created, setCreated] = useState<`0x${string}`[] | null>(null);
  const [past, setPast] = useState<`0x${string}`[] | null>(null);
  const [donated, setDonated] = useState<`0x${string}`[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(
    () =>
      new JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
          "https://ethereum-sepolia-rpc.publicnode.com",
      ),
    [],
  );

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setError(null);
    setCreated(null);
    setPast(null);
    setDonated(null);

    const me = address.toLowerCase();

    // Created vs past — list factory campaigns, read each campaign's
    // `creator` and `closed` flags. Active campaigns (closed=false) go in
    // "Created"; closed campaigns go in "Past" (creator-only archive).
    (async () => {
      try {
        const factory = new Contract(DEPLOYMENTS.factory, FACTORY_ABI, provider);
        const all = (await factory.getCampaigns(0, 500)) as string[];
        const activeMatches: `0x${string}`[] = [];
        const pastMatches: `0x${string}`[] = [];
        await Promise.all(
          all.map(async (addr) => {
            try {
              const c = new Contract(addr, CAMPAIGN_ABI, provider);
              const [creator, closed] = await Promise.all([
                c.creator(),
                c.closed().catch(() => false),
              ]);
              if (String(creator).toLowerCase() !== me) return;
              if (Boolean(closed)) {
                pastMatches.push(addr as `0x${string}`);
              } else {
                activeMatches.push(addr as `0x${string}`);
              }
            } catch {}
          }),
        );
        if (!cancelled) {
          setCreated(activeMatches);
          setPast(pastMatches);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage ?? e?.message ?? String(e));
      }
    })();

    // Donated: scan Donated events across all campaigns, filtered by donor.
    // Donor history doesn't get archived when a creator closes the campaign —
    // a donor still sees what they supported.
    (async () => {
      try {
        const factory = new Contract(DEPLOYMENTS.factory, FACTORY_ABI, provider);
        const all = (await factory.getCampaigns(0, 500)) as string[];
        const matches = new Set<`0x${string}`>();
        await Promise.all(
          all.map(async (addr) => {
            try {
              const c = new Contract(addr, CAMPAIGN_ABI, provider);
              const filter = c.filters.Donated(address);
              const logs = await c.queryFilter(filter, -49_500, "latest");
              if (logs.length > 0) matches.add(addr as `0x${string}`);
            } catch {}
          }),
        );
        if (!cancelled) setDonated(Array.from(matches));
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  const list =
    tab === "created" ? created : tab === "donated" ? donated : past;
  const counts = {
    created: created?.length ?? 0,
    donated: donated?.length ?? 0,
    past: past?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <TabButton active={tab === "created"} onClick={() => setTab("created")}>
          Created · {created === null ? "…" : counts.created}
        </TabButton>
        <TabButton active={tab === "donated"} onClick={() => setTab("donated")}>
          Donated to · {donated === null ? "…" : counts.donated}
        </TabButton>
        <TabButton active={tab === "past"} onClick={() => setTab("past")}>
          Past · {past === null ? "…" : counts.past}
        </TabButton>
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-mono text-xs text-destructive">// load error: {error}</p>
        </div>
      )}

      {list === null ? (
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          // scanning chain…
        </p>
      ) : list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <ul className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {list.map((addr) => (
            <li key={addr} className="bg-background">
              <CampaignCard address={addr} />
            </li>
          ))}
        </ul>
      )}

      {tab === "past" && past && past.length > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
          // archived from public discovery · still readable on-chain via direct URL
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { headline: string; cta: React.ReactNode }> = {
    created: {
      headline: "// you haven't launched any active campaigns",
      cta: (
        <>
          Start one at{" "}
          <Link href="/create" className="text-primary underline-offset-2 hover:underline">
            /create
          </Link>
          .
        </>
      ),
    },
    donated: {
      headline: "// you haven't donated to any campaigns yet",
      cta: (
        <>
          Find a cause at{" "}
          <Link href="/" className="text-primary underline-offset-2 hover:underline">
            browse
          </Link>
          .
        </>
      ),
    },
    past: {
      headline: "// no past campaigns yet",
      cta: <>Closed campaigns you launched will live here.</>,
    },
  };
  const { headline, cta } = messages[tab];
  return (
    <div className="border border-dashed border-border bg-card/30 p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {headline}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{cta}</p>
    </div>
  );
}
