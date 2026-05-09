"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useEffect, useState } from "react";
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
        <Button variant="ghost" size="sm" onClick={() => disconnect()} aria-label="Disconnect wallet">
          ✕
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="group flex items-center gap-2 border border-border bg-background/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <span className="inline-block h-1.5 w-1.5 animate-blink bg-primary" />
      {address ? shortAddress(address) : "Disconnect"}
    </button>
  );
}
