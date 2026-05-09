"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";

function TerminalDots() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 280);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-3 text-left">{".".repeat(n)}</span>;
}

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted)
    return (
      <Button variant="outline" size="sm" disabled>
        Connect
      </Button>
    );

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <Button
        onClick={() => connect({ connector: injected })}
        disabled={isPending}
        size="sm"
      >
        {isPending ? (
          <>
            Connecting<TerminalDots />
          </>
        ) : (
          "Connect"
        )}
      </Button>
    );
  }

  if (chainId !== sepolia.id) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => switchChain({ chainId: sepolia.id })}
        >
          Switch network
        </Button>
        <ConnectedMenu
          address={address}
          onDisconnect={() => disconnect()}
          compact
        />
      </div>
    );
  }

  return (
    <ConnectedMenu address={address} onDisconnect={() => disconnect()} />
  );
}

/// Small popover triggered by clicking the connected-wallet pill.
/// Two actions only: copy address, disconnect. Closes on outside click,
/// Escape, or after triggering an action.
function ConnectedMenu({
  address,
  onDisconnect,
  compact,
}: {
  address?: string;
  onDisconnect: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleCopy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1100);
    } catch {
      setOpen(false);
    }
  }

  function handleDisconnect() {
    setOpen(false);
    onDisconnect();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          compact
            ? "border border-border bg-background/40 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            : "group flex items-center gap-2 border border-border bg-background/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
        }
      >
        {compact ? (
          "✕"
        ) : (
          <>
            <span className="inline-block h-1.5 w-1.5 animate-blink bg-primary" />
            {address ? shortAddress(address) : "Account"}
            <span className="ml-1 text-[9px] text-muted-foreground">▾</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[200px] border border-border bg-background shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
        >
          {/* Header showing the full short-address */}
          <div className="border-b border-border/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="text-primary">connected</div>
            <div className="mt-1 truncate text-foreground">
              {address ? shortAddress(address) : "—"}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="block w-full px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-foreground transition-colors hover:bg-card/60 hover:text-primary"
          >
            {copied ? "✓ copied" : "Copy address"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleDisconnect}
            className="block w-full border-t border-border/60 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/10"
          >
            Disconnect wallet
          </button>
        </div>
      )}
    </div>
  );
}
