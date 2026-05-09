"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useWalletClient } from "wagmi";
import { BrowserProvider, Contract, JsonRpcProvider, type EventLog } from "ethers";
import { Button } from "@/components/ui/button";
import { SectionMarker } from "@/components/section-marker";
import { WalletGate } from "@/components/wallet-gate";
import { CopyAddress } from "@/components/copy-address";
import { CAMPAIGN_ABI, DEPLOYMENTS, FACTORY_ABI, TOKEN_ABI } from "@/lib/contracts";
import { getFhevmInstance } from "@/lib/fhevm";
import { tokenUnitsToUsd } from "@/lib/format";
import { shortAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x" + "0".repeat(64);

export default function WalletPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="your wallet" />
        <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Your USDC, your activity.<br />
          <span className="text-muted-foreground">Private by default.</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your balance is private — only you can read it. Tap{" "}
          <span className="text-primary">reveal</span> to see it. Sign one message, and
          the number appears for your eyes only, in this browser, just for now.
        </p>
      </div>

      <WalletGate
        title="Connect to view your wallet"
        description="Your balance and activity are scoped to the connected wallet."
      >
        <WalletDashboard />
      </WalletGate>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Dashboard
// ───────────────────────────────────────────────────────────────────────────

function WalletDashboard() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const provider = useMemo(
    () =>
      new JsonRpcProvider(
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
          "https://ethereum-sepolia-rpc.publicnode.com",
      ),
    [],
  );

  if (!address) return null;

  return (
    <div className="space-y-10">
      <BalanceCard address={address} walletClient={walletClient} provider={provider} />
      <ActivityCard address={address} provider={provider} walletClient={walletClient} />
      <BeneficiaryCampaigns address={address} provider={provider} />
      <WalletInfoCard address={address} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Encrypted balance + on-tap user-decrypt
// ───────────────────────────────────────────────────────────────────────────

function BalanceCard({
  address,
  walletClient,
  provider,
}: {
  address: `0x${string}`;
  walletClient: any;
  provider: JsonRpcProvider;
}) {
  const [handle, setHandle] = useState<string | null>(null);
  const [plaintext, setPlaintext] = useState<bigint | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the encrypted balance handle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = new Contract(DEPLOYMENTS.token, TOKEN_ABI, provider);
        const h: string = await c.confidentialBalanceOf(address);
        if (!cancelled) setHandle(h);
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage ?? e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  const isZero = handle === ZERO_HASH || handle === null;

  async function reveal() {
    setError(null);
    if (!handle || isZero) return;
    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setError("Wallet provider not ready.");
      return;
    }
    setRevealing(true);
    try {
      const instance = await getFhevmInstance();
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000);
      const durationDays = 10;
      const contractAddresses = [DEPLOYMENTS.token];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const browserProvider = new BrowserProvider(eth);
      const signer = await browserProvider.getSigner();
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification:
            eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        [{ handle, contractAddress: DEPLOYMENTS.token }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const value = result[handle] as bigint;
      setPlaintext(value);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setRevealing(false);
    }
  }

  function hide() {
    setPlaintext(null);
  }

  const usd = plaintext === null ? null : Number(tokenUnitsToUsd(plaintext));

  return (
    <section className="relative overflow-hidden border border-border bg-card/40">
      {/* Top spine + corner brackets to match the protocol-total counter */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-[3px] bg-primary"
        style={{
          boxShadow:
            "0 0 12px hsla(49, 100%, 50%, 0.6), 0 0 24px hsla(49, 100%, 50%, 0.3)",
        }}
      />
      <span aria-hidden className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-primary/70" />
      <span aria-hidden className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-primary/70" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-primary/70" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-primary/70" />

      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-border/60 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="anim-pulse-yellow inline-block h-1.5 w-1.5 bg-primary" />
          <span className="text-primary">USDC balance</span>
        </span>
        <span className="hidden text-muted-foreground/70 sm:inline">
          private · only you can see it
        </span>
      </div>

      <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-12">
        {plaintext === null ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                your balance
              </div>
              <div className="flex items-end gap-3">
                <span aria-hidden className="text-primary/80">
                  <LockBigGlyph />
                </span>
                <span className="font-display text-5xl font-medium leading-none tracking-tight text-primary/85 sm:text-6xl md:text-7xl">
                  ✱✱✱✱
                </span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                private · only you can read it
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button onClick={reveal} disabled={revealing || isZero} size="lg">
                {revealing ? "Decrypting…" : "Reveal balance →"}
              </Button>
              {isZero && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  // get test USDC at /faucet first
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                decrypted · for your eyes only
              </div>
              <div className="font-display text-5xl font-medium tabular-nums sm:text-6xl">
                {usd !== null
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 2,
                    }).format(usd)
                  : "—"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                public records stay private · this number lives in your browser only
              </div>
            </div>
            <Button onClick={hide} variant="outline" size="lg">
              Hide
            </Button>
          </div>
        )}
        {error && (
          <p className="mt-4 font-mono text-xs text-destructive">// {error}</p>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-border/60 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>↳ revealed only to you · sign one message, see the number</span>
        <span className="hidden text-primary/60 md:inline">
          // your wallet · {shortAddress(address)}
        </span>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Activity feed — token transfers in/out, with on-row decrypt
// ───────────────────────────────────────────────────────────────────────────

type Transfer = {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amountHandle: string;
  direction: "in" | "out";
  kind: "mint" | "send" | "receive" | "burn";
};

function ActivityCard({
  address,
  provider,
  walletClient,
}: {
  address: `0x${string}`;
  provider: JsonRpcProvider;
  walletClient: any;
}) {
  const [items, setItems] = useState<Transfer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const head = await provider.getBlockNumber();
        // Public Sepolia RPCs cap eth_getLogs at 50_000 blocks per request.
        // 50_000 blocks ≈ 7 days on Sepolia, which is plenty for a recent
        // activity feed. If a wider window is ever needed, chunk into 50k
        // slices and merge the results.
        const fromBlock = Math.max(0, head - 49_500);

        const me = address.toLowerCase();
        const c = new Contract(DEPLOYMENTS.token, TOKEN_ABI, provider);

        // Use the contract's typed filters instead of raw getLogs — handles
        // topic encoding and decoding cleanly across ethers v6 quirks.
        const incomingFilter = c.filters.ConfidentialTransfer(undefined, address);
        const outgoingFilter = c.filters.ConfidentialTransfer(address);

        const [incoming, outgoing] = await Promise.all([
          c.queryFilter(incomingFilter, fromBlock, head) as Promise<EventLog[]>,
          c.queryFilter(outgoingFilter, fromBlock, head) as Promise<EventLog[]>,
        ]);

        // Dedupe by tx hash + log index so a self-transfer doesn't double up.
        const seen = new Set<string>();
        const all: EventLog[] = [];
        for (const log of [...incoming, ...outgoing]) {
          const k = `${log.transactionHash}:${log.index}`;
          if (seen.has(k)) continue;
          seen.add(k);
          all.push(log);
        }

        // Cache block timestamps — many transfers can share a block, and
        // parallel getBlock calls trip public-RPC rate limits.
        const tsCache = new Map<number, number>();
        async function blockTs(blockNumber: number): Promise<number> {
          const cached = tsCache.get(blockNumber);
          if (cached !== undefined) return cached;
          try {
            const block = await provider.getBlock(blockNumber);
            const ts = block?.timestamp ?? Math.floor(Date.now() / 1000);
            tsCache.set(blockNumber, ts);
            return ts;
          } catch {
            return Math.floor(Date.now() / 1000);
          }
        }

        // Hydrate sequentially per unique block — each unique block is one
        // RPC call, not one per log. Caps the burst at ~10 concurrent.
        const uniqueBlocks = Array.from(new Set(all.map((l) => l.blockNumber)));
        const concurrency = 6;
        for (let i = 0; i < uniqueBlocks.length; i += concurrency) {
          if (cancelled) return;
          await Promise.all(
            uniqueBlocks.slice(i, i + concurrency).map((bn) => blockTs(bn)),
          );
        }

        const out: Transfer[] = all.map((log) => {
          const args = log.args as any;
          const from = String(args?.from ?? "0x0000000000000000000000000000000000000000");
          const to = String(args?.to ?? "0x0000000000000000000000000000000000000000");
          const amountHandle = String(args?.amount ?? log.topics[3] ?? ZERO_HASH);
          const direction: "in" | "out" =
            to.toLowerCase() === me ? "in" : "out";
          let kind: Transfer["kind"] = "send";
          if (from.toLowerCase() === ZERO_ADDR) kind = "mint";
          else if (to.toLowerCase() === ZERO_ADDR) kind = "burn";
          else if (direction === "in") kind = "receive";
          return {
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: (tsCache.get(log.blockNumber) ?? Math.floor(Date.now() / 1000)) * 1000,
            from,
            to,
            amountHandle,
            direction,
            kind,
          };
        });

        out.sort((a, b) => b.blockNumber - a.blockNumber);
        if (!cancelled) setItems(out);
      } catch (e: any) {
        console.error("[wallet/activity]", e);
        if (!cancelled)
          setError(e?.shortMessage ?? e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium uppercase tracking-tight sm:text-2xl">
            Activity
          </h2>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Every transfer in or out of your wallet over the last ~7 days. The
            amounts are private — tap any row to reveal that one.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {items === null ? "scanning…" : `${items.length} entries`}
        </span>
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive">
          // {error}
        </div>
      )}

      {items === null ? (
        <div className="border border-dashed border-border bg-card/30 p-10 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          // scanning chain…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            // no activity yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Get test USDC at{" "}
            <Link href="/faucet" className="text-primary underline-offset-2 hover:underline">
              /faucet
            </Link>{" "}
            or browse{" "}
            <Link href="/" className="text-primary underline-offset-2 hover:underline">
              active campaigns
            </Link>{" "}
            to make your first donation.
          </p>
        </div>
      ) : (
        <ul className="grid gap-px border border-border bg-border">
          {items.map((t) => (
            <ActivityRow
              key={`${t.txHash}-${t.blockNumber}`}
              transfer={t}
              address={address}
              walletClient={walletClient}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityRow({
  transfer,
  address,
  walletClient,
}: {
  transfer: Transfer;
  address: `0x${string}`;
  walletClient: any;
}) {
  const [revealed, setRevealed] = useState<bigint | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setError(null);
    const eth =
      walletClient?.transport ??
      (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (!eth) {
      setError("Wallet provider not ready.");
      return;
    }
    setRevealing(true);
    try {
      const instance = await getFhevmInstance();
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000);
      const durationDays = 10;
      const contractAddresses = [DEPLOYMENTS.token];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const browserProvider = new BrowserProvider(eth);
      const signer = await browserProvider.getSigner();
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification:
            eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        [{ handle: transfer.amountHandle, contractAddress: DEPLOYMENTS.token }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      setRevealed(result[transfer.amountHandle] as bigint);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setRevealing(false);
    }
  }

  const usd = revealed === null ? null : Number(tokenUnitsToUsd(revealed));
  const isMint = transfer.kind === "mint";
  const isBurn = transfer.kind === "burn";
  const directionLabel = isMint
    ? "mint"
    : isBurn
      ? "burn"
      : transfer.direction === "in"
        ? "received"
        : "sent";
  const counterparty = transfer.direction === "in" ? transfer.from : transfer.to;
  const counterpartyLabel = isMint
    ? "faucet"
    : isBurn
      ? "burned"
      : shortAddress(counterparty);

  return (
    <li className="bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest",
              transfer.direction === "in"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card/40 text-muted-foreground",
            )}
          >
            {directionLabel}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {counterpartyLabel}
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 sm:inline">
            {relativeTime(transfer.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {revealed !== null && usd !== null ? (
            <span className="font-display text-base tabular-nums text-foreground sm:text-lg">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              }).format(usd)}
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={reveal}
              disabled={revealing}
            >
              {revealing ? "Decrypting…" : "Reveal amount"}
            </Button>
          )}
          <a
            href={`https://sepolia.etherscan.io/tx/${transfer.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            tx ↗
          </a>
        </div>
      </div>
      {error && <p className="mt-2 font-mono text-xs text-destructive">// {error}</p>}
    </li>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Campaigns where you are the beneficiary
// ───────────────────────────────────────────────────────────────────────────

function BeneficiaryCampaigns({
  address,
  provider,
}: {
  address: `0x${string}`;
  provider: JsonRpcProvider;
}) {
  const [campaigns, setCampaigns] = useState<`0x${string}`[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const factory = new Contract(DEPLOYMENTS.factory, FACTORY_ABI, provider);
        const all = (await factory.getCampaigns(0, 500)) as `0x${string}`[];
        const matches: `0x${string}`[] = [];
        await Promise.all(
          all.map(async (addr) => {
            try {
              const c = new Contract(addr, CAMPAIGN_ABI, provider);
              const [ben, closed] = await Promise.all([
                c.beneficiary(),
                c.closed().catch(() => false),
              ]);
              if (Boolean(closed)) return;
              if (String(ben).toLowerCase() === address.toLowerCase()) {
                matches.push(addr);
              }
            } catch {}
          }),
        );
        if (!cancelled) setCampaigns(matches);
      } catch {
        if (!cancelled) setCampaigns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  if (campaigns !== null && campaigns.length === 0) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-medium uppercase tracking-tight sm:text-2xl">
          Campaigns where you&apos;re the recipient
        </h2>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          You can sign withdraw from these once their goal is hit.
        </p>
      </div>

      {campaigns === null ? (
        <div className="border border-dashed border-border bg-card/30 p-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          // scanning…
        </div>
      ) : (
        <ul className="grid gap-px border border-border bg-border">
          {campaigns.map((addr) => (
            <li
              key={addr}
              className="flex items-center justify-between gap-3 bg-background p-4"
            >
              <span className="font-mono text-xs">{shortAddress(addr)}</span>
              <Link
                href={`/campaign/${addr}`}
                className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
              >
                view →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Wallet identity card
// ───────────────────────────────────────────────────────────────────────────

function WalletInfoCard({ address }: { address: `0x${string}` }) {
  return (
    <section className="border border-border bg-card/40 p-5">
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Connected wallet
      </h3>
      <div className="mt-3">
        <CopyAddress address={address} />
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
        // public on-chain · only your encrypted balance is private
      </p>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function LockBigGlyph() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
      className="block sm:h-[68px] sm:w-[68px] md:h-[80px] md:w-[80px]"
    >
      <rect x="4" y="11" width="16" height="10" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
