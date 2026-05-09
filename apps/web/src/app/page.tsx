"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Contract, JsonRpcProvider } from "ethers";

const ThreeDShowcase = dynamic(() => import("@/components/three-d-showcase"), {
  ssr: false,
  loading: () => (
    <section className="space-y-8">
      <div className="h-[420px] border border-dashed border-border" aria-hidden />
    </section>
  ),
});

const HeroVisual = dynamic(() => import("@/components/three/hero-visual"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full border border-dashed border-border lg:aspect-auto lg:h-[560px]" />
  ),
});
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/campaign-card";
import { CampaignCardSkeleton } from "@/components/campaign-card-skeleton";
import { SectionMarker } from "@/components/section-marker";
import { AnimatedStat } from "@/components/animated-stat";
import { EncryptedTotalCounter } from "@/components/encrypted-total-counter";
import { ComparisonSplit } from "@/components/comparison-split";
import { FheAddDiagram } from "@/components/fhe-add-diagram";
import { FadeIn } from "@/components/fade-in";
import { TypewriterHeadline } from "@/components/typewriter-headline";
import { GlitchReveal } from "@/components/glitch-reveal";
import { LiveOpsFeed } from "@/components/live-ops-feed";
import { FeatureCard } from "@/components/feature-card";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  BarChartIcon,
  LockIcon,
  MatrixIcon,
  NullIcon,
  ShieldIcon,
  WaveIcon,
} from "@/components/icons/animated-icons";
import { CAMPAIGN_ABI, DEPLOYMENTS, FACTORY_ABI } from "@/lib/contracts";
import { DEMO_MODE, MOCK_CAMPAIGNS } from "@/lib/demo";

type ThesisCard = {
  title: string;
  body: string;
  tag: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const THESIS_CARDS: ThesisCard[] = [
  {
    title: "Choose how you appear",
    body: "Use your real name, a pseudonym, or stay anonymous in your story. Donors read what you share — they don't need to know more.",
    tag: "Identity",
    Icon: ShieldIcon,
  },
  {
    title: "Donations stay private",
    body: "Each donor's amount is encrypted before it leaves their device. No one — not us, not other donors, not Etherscan — sees how much any individual gave.",
    tag: "Donations",
    Icon: MatrixIcon,
  },
  {
    title: "Real progress, no leaks",
    body: "Donors see exactly how much has been raised toward your goal. The total is provably accurate, but the donations behind it stay sealed.",
    tag: "Progress",
    Icon: BarChartIcon,
  },
  {
    title: "Recipient is verifiable",
    body: "The recipient wallet is published on-chain so donors can check it on Etherscan before they give. Trust by verification, not by trust-us.",
    tag: "Recipient",
    Icon: LockIcon,
  },
  {
    title: "Anyone can vouch",
    body: "Doctors, schools, neighbours — anyone can publicly attest to a campaign. Their wallet signs the vouch, donors see the chain of trust before they give.",
    tag: "Trust",
    Icon: WaveIcon,
  },
  {
    title: "No platform fee",
    body: "We take nothing. You pay only the small network cost to send a transaction. No skim, no surveillance.",
    tag: "Free",
    Icon: NullIcon,
  },
];

export default function BrowsePage() {
  const [campaigns, setCampaigns] = useState<`0x${string}`[]>([]);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [time, setTime] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      const list =
        activeCategory === "all"
          ? MOCK_CAMPAIGNS.map((c) => c.address)
          : MOCK_CAMPAIGNS.filter((c) => c.category === activeCategory).map((c) => c.address);
      setCampaigns(list);
      return;
    }
    let cancelled = false;
    const provider = new JsonRpcProvider(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    );
    const factory = new Contract(DEPLOYMENTS.factory, FACTORY_ABI, provider);
    (async () => {
      try {
        const all = (await factory.getCampaigns(0, 200)) as `0x${string}`[];
        // Filter out closed campaigns — they live in the creator's "past"
        // tab on /me and are still readable via direct URL, but they don't
        // appear in public discovery.
        const active: `0x${string}`[] = [];
        await Promise.all(
          all.map(async (addr) => {
            try {
              const c = new Contract(addr, CAMPAIGN_ABI, provider);
              const closed = await c.closed().catch(() => false);
              if (!closed) active.push(addr);
            } catch {
              active.push(addr);
            }
          }),
        );
        if (!cancelled) setCampaigns(active);
      } catch {
        if (!cancelled) setCampaigns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const stats = useMemo(() => {
    if (DEMO_MODE) {
      const totalDonors = MOCK_CAMPAIGNS.reduce((s, c) => s + c.donors, 0);
      const funded = MOCK_CAMPAIGNS.filter((c) => c.goalUsd > 0 && c.raisedUsd >= c.goalUsd).length;
      return { count: MOCK_CAMPAIGNS.length, totalDonors, funded };
    }
    return { count: campaigns.length, totalDonors: 0, funded: 0 };
  }, [campaigns]);

  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-24">
      {/* HERO */}
      <section className="hero-shell relative -mx-6 overflow-hidden px-6 pb-12 pt-6 sm:pt-8">
        {/* Ambient aurora — soft yellow glow that breathes behind the headline */}
        <div className="hero-aurora pointer-events-none absolute inset-0 -z-10" aria-hidden />
        {/* Faint diagonal scan lines — adds movement without distraction */}
        <div className="hero-scan pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden />

        {/* Corner brackets framing the hero */}
        <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-primary/60" aria-hidden />
        <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-primary/60" aria-hidden />
        <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-primary/60" aria-hidden />
        <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-primary/60" aria-hidden />

        {/* Top status bar */}
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:text-[11px]">
          <span className="text-primary">// confidential gofundme</span>
          <span className="hidden h-px flex-1 bg-border sm:block" />
          <span className="flex items-center gap-2">
            <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
            <span className="text-primary/85">running</span>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>
            <span className="anim-flicker inline-block">live</span> · {time || "—"}
          </span>
        </div>

        {/* What's private — plain-language chips */}
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest sm:gap-2">
          <SpecChip>donation amounts hidden</SpecChip>
          <SpecChip>recipient wallet shown</SpecChip>
          <SpecChip>private messages</SpecChip>
          <SpecChip>test mode</SpecChip>
          <SpecChip subdued>no fee</SpecChip>
        </div>

        {/* Main 2-col split */}
        <div className="relative z-10 mt-10 grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
          {/* LEFT */}
          <div className="space-y-8 lg:col-span-7">
            <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
              <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
              Privacy powered by Zama FHE
            </div>

            <TypewriterHeadline
              line1="Tell your story openly."
              emphasis="Loudly, if you want."
              line2="The money stays private."
              className="text-balance font-display text-3xl font-medium leading-[1.04] tracking-tight sm:text-4xl md:text-5xl lg:text-[3rem] xl:text-[3.4rem] 2xl:text-[3.75rem]"
            />

            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Your story is public so donors can read what they&apos;re supporting. Each
              donation amount stays private — encrypted on the donor&apos;s device before it
              leaves. The recipient wallet is published on-chain so donors can verify
              who&apos;s receiving the funds before they give.
            </p>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/create">Start a campaign →</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/faucet">Get test funds</Link>
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:basis-full md:basis-auto">
                no platform fee · pay only network costs
              </span>
            </div>

            <LiveOpsFeed />
          </div>

          {/* RIGHT — 3D core */}
          <div className="lg:col-span-5">
            <HeroVisual />
          </div>
        </div>

        {/* Big encrypted total counter — flickering glyphs over the protocol-wide total */}
        <FadeIn className="relative z-10 mt-10 sm:mt-12">
          <EncryptedTotalCounter />
        </FadeIn>

        {/* Stats row */}
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-px border border-border bg-border sm:mt-12 md:mt-16 md:grid-cols-4">
          <AnimatedStat
            variant="count"
            value={stats.count}
            label="Active campaigns"
            caption="All amounts kept private"
          />
          <AnimatedStat
            variant="zero"
            label="Donor names exposed"
            caption="Pseudonymous by default"
          />
          <AnimatedStat
            variant="count"
            value={100}
            suffix="%"
            label="Donor privacy"
            caption="No one sees how much you give"
          />
          <AnimatedStat
            variant="literal"
            display="Zama"
            label="Privacy by Zama"
            caption="Provable. Verifiable."
          />
        </div>
      </section>

      {/* PROTOCOL THESIS */}
      <FadeIn>
      <section className="space-y-10">
        <SectionMarker label="why this exists" />
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Give without putting your wallet on a leaderboard.
            </h2>
          </div>
          <p className="text-muted-foreground md:col-span-7">
            On every other crowdfunding site, donors get ranked by amount: a public scoreboard of
            who gave what. People who can give more get visibility. People who can&apos;t feel
            embarrassed and stay silent. Here, the cause and the recipient are public — but every
            individual donation amount is encrypted on the donor&apos;s device. The total raised is
            still provably accurate. The donations behind it stay sealed.
          </p>
        </div>

        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {THESIS_CARDS.map((c, i) => (
            <GlitchReveal key={c.title} delay={i * 0.05} className="h-full">
              <FeatureCard
                icon={<c.Icon />}
                title={c.title}
                description={c.body}
                index={i + 1}
                total={THESIS_CARDS.length}
                tag={c.tag}
              />
            </GlitchReveal>
          ))}
        </div>
      </section>
      </FadeIn>

      {/* 3D SHOWCASE */}
      <FadeIn>
        <ThreeDShowcase />
      </FadeIn>

      {/* GoFundMe vs Privacyfundme split */}
      <FadeIn>
        <ComparisonSplit />
      </FadeIn>

      {/* FHE.add() animated diagram */}
      <FadeIn>
        <FheAddDiagram />
      </FadeIn>

      {/* CAMPAIGNS */}
      <FadeIn>
      <section className="space-y-6">
        <SectionMarker label="active campaigns" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl">
            People raising right now.
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {campaigns.length} active
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            aria-pressed={activeCategory === "all"}
            className={cn(
              "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              activeCategory === "all"
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background/40 text-muted-foreground hover:border-primary hover:text-foreground",
            )}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              aria-pressed={activeCategory === c.id}
              className={cn(
                "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                activeCategory === c.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background/40 text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-live="polite"
            aria-label="Loading campaigns"
          >
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No campaigns yet — be the first.
            </p>
          </div>
        ) : (
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c, i) => (
              <GlitchReveal key={c} delay={i * 0.04} className="h-full">
                <CampaignCard address={c} />
              </GlitchReveal>
            ))}
          </div>
        )}
      </section>
      </FadeIn>

      {/* HOW */}
      <FadeIn>
      <section className="space-y-8">
        <SectionMarker label="how to start a campaign" />
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Tell your story",
              body: "Write what's happening in your own words. Set a goal and the wallet that should receive the funds. Both are public so donors can verify before they give.",
            },
            {
              n: "02",
              title: "Receive donations",
              body: "Each donor's amount is encrypted on their device. No one sees how much any individual gave — only the running total is visible.",
            },
            {
              n: "03",
              title: "Withdraw when goal is hit",
              body: "Once the goal is reached, sign a withdraw transaction from the recipient wallet. The contract releases the funds to the address everyone could already see.",
            },
          ].map((s, i) => (
            <GlitchReveal key={s.n} delay={i * 0.08} className="h-full">
              <div className="h-full border border-border bg-card/40 p-6">
                <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  {s.n}
                </div>
                <h3 className="mt-2 font-mono text-lg font-medium tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </GlitchReveal>
          ))}
        </div>
      </section>
      </FadeIn>

      {/* CTA */}
      <FadeIn>
      <section className="border-t border-border pt-16">
        <div className="space-y-6 text-center">
          <h2 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Tell your story.<br />
            <span className="text-primary">Keep the donations private.</span>
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Fundraising where the cause and the recipient are public — and every individual donation amount stays encrypted.
          </p>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/create">Launch campaign →</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/faucet">Get test funds</Link>
            </Button>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* HOW IT WORKS — optional expandable */}
      <FadeIn>
      <section>
        <details className="group border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
            <span>+ How it works (for the curious)</span>
            <span className="text-primary transition-transform duration-300 group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="space-y-4 border-t border-border p-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              Your story, your goal, and the wallet that will receive the funds are all public.
              Donors can read what they&apos;re supporting and verify the recipient on Etherscan
              before they give.
            </p>
            <p>
              What stays private is each individual donation amount. Every donation is encrypted
              inside the donor&apos;s browser before it touches the network — no one (not us, not
              other donors, not Etherscan) ever sees how much any one person gave.
            </p>
            <p>
              Donations are added together using fully homomorphic encryption (FHE), which lets
              the smart contract do math on encrypted numbers without unlocking them. The
              running total is publicly verifiable; the donations behind it stay sealed.
            </p>
            <p>
              When the goal is hit, the recipient signs a withdraw transaction from the wallet
              address that&apos;s already public. We charge no platform fee — only the small
              network cost to send each transaction.
            </p>
            <p>
              Built on Ethereum&apos;s test network, using Zama&apos;s privacy technology and
              a confidential-token standard for encrypted balances.
            </p>
          </div>
        </details>
      </section>
      </FadeIn>
    </div>
  );
}

function SpecChip({ children, subdued }: { children: React.ReactNode; subdued?: boolean }) {
  return (
    <span
      className={
        subdued
          ? "border border-border bg-card/40 px-2 py-0.5 text-muted-foreground"
          : "border border-primary/40 bg-primary/5 px-2 py-0.5 text-primary/90"
      }
    >
      {children}
    </span>
  );
}
