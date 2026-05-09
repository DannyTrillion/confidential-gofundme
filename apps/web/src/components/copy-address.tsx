"use client";

import { useState } from "react";
import { shortAddress } from "@/lib/utils";

/// Truncated address with a copy button + an "etherscan ↗" link beside it.
/// Used on the campaign page so creators can copy the address into Etherscan
/// and verify the encrypted state on-chain.
export function CopyAddress({
  address,
  href,
  className,
}: {
  address: string;
  href?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  const explorer =
    href ?? `https://sepolia.etherscan.io/address/${address}`;

  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground ${className ?? ""}`}
    >
      <span>{shortAddress(address)}</span>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied!" : "Copy full address"}
        aria-label="Copy full address"
        className="inline-flex h-5 items-center gap-1 border border-border bg-card/40 px-1.5 text-[9px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {copied ? (
          <>
            <CheckGlyph />
            <span>Copied</span>
          </>
        ) : (
          <>
            <CopyGlyph />
            <span>Copy</span>
          </>
        )}
      </button>
      <a
        href={explorer}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-5 items-center gap-1 border border-border bg-card/40 px-1.5 text-[9px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <span>Etherscan</span>
        <ExternalGlyph />
      </a>
    </span>
  );
}

function CopyGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="5" y="5" width="9" height="9" rx="1" />
      <path d="M3 11V3a1 1 0 011-1h8" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 8.5l3.5 3.5L13 4" />
    </svg>
  );
}

function ExternalGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M9 3h4v4M13 3L7 9M11 9v4H3V5h4" />
    </svg>
  );
}
