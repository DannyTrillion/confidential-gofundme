"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contract, EventLog, JsonRpcProvider, getBytes } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionMarker } from "@/components/section-marker";
import { CAMPAIGN_ABI } from "@/lib/contracts";
import { gatewayUrl } from "@/lib/ipfs-client";
import { type EncKeypair, openSealed, readEncKeypair } from "@/lib/crypto";
import { pseudoLabel, shortAddress } from "@/lib/utils";
import { readWatchlist, unwatchCampaign, watchCampaign } from "@/lib/watchlist";
import { DEMO_MODE, findMockCampaign, MOCK_CAMPAIGNS } from "@/lib/demo";

type CampaignSummary = {
  address: `0x${string}`;
  title: string;
  pseudonym: string;
};

type DonorMessage = {
  campaignAddress: `0x${string}`;
  campaignTitle: string;
  donor: string;
  donorIndex: bigint;
  body: string;
  failed?: boolean;
};

const ZERO_PUBKEY = "0x" + "0".repeat(64);

const DEMO_NOTES_BY_CAMPAIGN: Record<string, string[]> = {
  "0x7f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90": [
    "Praying for you. Please get well.",
    "From a colleague — anonymous, but I see you. $50 toward the next cycle.",
    "Wishing your family strength.",
  ],
  "0x4b2a8c9d1e3f5a7b6c8d9e0f1a2b3c4d5e6f7080": [
    "Stay safe. New phone arriving from a friend tomorrow.",
  ],
};

export default function InboxPage() {
  const [pair, setPair] = useState<EncKeypair | null>(null);
  const [watchlist, setWatchlist] = useState<`0x${string}`[]>([]);
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [messages, setMessages] = useState<DonorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const provider = useMemo(
    () =>
      new JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
          "https://ethereum-sepolia-rpc.publicnode.com",
      ),
    [],
  );

  // Read keypair + watchlist on mount
  useEffect(() => {
    setPair(readEncKeypair());
    setWatchlist(readWatchlist());
  }, []);

  // Resolve watched campaigns into summaries (title, pseudonym)
  useEffect(() => {
    if (watchlist.length === 0) {
      setCampaigns([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const out: CampaignSummary[] = [];
      for (const addr of watchlist) {
        if (DEMO_MODE) {
          const m = findMockCampaign(addr);
          out.push({
            address: addr,
            title: m?.title ?? pseudoLabel(addr),
            pseudonym: m?.pseudonym ?? "—",
          });
          continue;
        }
        try {
          const c = new Contract(addr, CAMPAIGN_ABI, provider);
          const ipfsHash: string = await c.ipfsHash();
          let title = pseudoLabel(addr);
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
          out.push({ address: addr, title, pseudonym });
        } catch {
          out.push({ address: addr, title: pseudoLabel(addr), pseudonym: "—" });
        }
      }
      if (!cancelled) setCampaigns(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [watchlist, provider]);

  // Scrape Donated events for each watched campaign + decrypt
  useEffect(() => {
    if (!pair || campaigns.length === 0) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const all: DonorMessage[] = [];

      for (const summary of campaigns) {
        if (DEMO_MODE) {
          const sample = DEMO_NOTES_BY_CAMPAIGN[summary.address.toLowerCase()] ?? [];
          sample.forEach((body, i) => {
            all.push({
              campaignAddress: summary.address,
              campaignTitle: summary.title,
              donor: `0x${"a".repeat(38)}${i}${i}`,
              donorIndex: BigInt(i),
              body,
            });
          });
          continue;
        }

        try {
          const c = new Contract(summary.address, CAMPAIGN_ABI, provider);
          const logs = (await c.queryFilter(c.filters.Donated(), 0)) as EventLog[];
          for (const log of logs) {
            const noteHex: string = log.args.note;
            if (!noteHex || noteHex === "0x") continue;
            try {
              const bytes = getBytes(noteHex);
              const body = await openSealed(bytes, pair);
              all.push({
                campaignAddress: summary.address,
                campaignTitle: summary.title,
                donor: log.args.donor as string,
                donorIndex: log.args.donorIndex as bigint,
                body,
              });
            } catch {
              // Sealed to a different pubkey — ignore.
              all.push({
                campaignAddress: summary.address,
                campaignTitle: summary.title,
                donor: log.args.donor as string,
                donorIndex: log.args.donorIndex as bigint,
                body: "[sealed to another keypair · cannot decrypt]",
                failed: true,
              });
            }
          }
        } catch {}
      }

      if (!cancelled) {
        setMessages(all);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pair, campaigns, provider, refreshKey]);

  function addByPaste() {
    setPasteError(null);
    const trimmed = paste.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setPasteError("Not a valid 0x address.");
      return;
    }
    watchCampaign(trimmed as `0x${string}`);
    setWatchlist(readWatchlist());
    setPaste("");
  }

  function removeWatched(addr: `0x${string}`) {
    unwatchCampaign(addr);
    setWatchlist(readWatchlist());
  }

  // Demo helper: pre-load the first mock campaign so the inbox shows messages
  // out of the box.
  function addDemoCampaign() {
    const demo = MOCK_CAMPAIGNS[0]?.address;
    if (!demo) return;
    watchCampaign(demo);
    setWatchlist(readWatchlist());
  }

  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="inbox · sealed messages" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Read messages donors sent only to you.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Donors can attach a sealed note to any donation. Each note is encrypted to your
          public key — only the device holding your private key can read it. Add the campaigns
          you&apos;re the recipient of, and any sealed messages will appear below.
        </p>
      </div>

      {!pair ? (
        <div className="border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-tight text-destructive">
            No keypair yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a keypair to read sealed messages. Generate one in setup.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/setup">Go to setup →</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-border bg-card/40 p-5">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
                Watched campaigns
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Add the campaign(s) where you&apos;re the recipient.
              </p>

              {watchlist.length === 0 ? (
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  // none yet
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {campaigns.map((c) => (
                    <li
                      key={c.address}
                      className="flex items-center justify-between gap-3 border border-border bg-background/40 p-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/campaign/${c.address}`}
                          className="block truncate font-mono text-sm text-foreground hover:text-primary"
                        >
                          {c.title}
                        </Link>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {shortAddress(c.address)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWatched(c.address)}
                        aria-label={`Stop watching ${c.title}`}
                      >
                        ✕
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 space-y-2">
                <Label htmlFor="paste-addr">Add by address</Label>
                <div className="flex gap-2">
                  <Input
                    id="paste-addr"
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    placeholder="0x…"
                    className="flex-1"
                  />
                  <Button onClick={addByPaste} size="sm">
                    Add
                  </Button>
                </div>
                {pasteError && (
                  <p className="font-mono text-xs text-destructive">// {pasteError}</p>
                )}
                {DEMO_MODE && watchlist.length === 0 && (
                  <Button variant="ghost" size="sm" onClick={addDemoCampaign}>
                    + Add a demo campaign
                  </Button>
                )}
              </div>
            </div>

            <div className="border border-border bg-card/40 p-5">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
                Your public key
              </h2>
              <div className="mt-3 break-all border border-border bg-background/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                {pair.publicKey}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Share this with anyone fundraising on your behalf so they can paste it into the
                campaign&apos;s recipient pubkey field.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href="/setup">Manage keys →</Link>
                </Button>
              </div>
            </div>
          </div>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <SectionMarker label="messages" className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRefreshKey((x) => x + 1)}
                aria-label="Refresh inbox"
              >
                Refresh
              </Button>
            </div>

            {loading ? (
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Decrypting…
              </p>
            ) : messages.length === 0 ? (
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                // no sealed messages
              </p>
            ) : (
              <ul className="space-y-3">
                {messages.map((m, i) => (
                  <li
                    key={`${m.campaignAddress}-${m.donorIndex}-${i}`}
                    className="border border-border bg-card/40 p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>From {shortAddress(m.donor)}</span>
                      <span>
                        <Link
                          href={`/campaign/${m.campaignAddress}`}
                          className="hover:text-foreground"
                        >
                          {m.campaignTitle}
                        </Link>
                      </span>
                    </div>
                    <p
                      className={
                        m.failed
                          ? "mt-3 font-mono text-xs text-destructive"
                          : "mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                      }
                    >
                      {m.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
