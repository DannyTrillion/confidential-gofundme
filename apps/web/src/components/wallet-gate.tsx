"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ConnectWallet } from "@/components/connect-wallet";
import { Button } from "@/components/ui/button";
import { DEPLOYMENTS, contractsDeployed } from "@/lib/contracts";

/// Renders `children` only when a wallet is connected on the right chain.
/// Otherwise shows a connect-prompt with the same terminal aesthetic.
export function WalletGate({
  children,
  title = "Connect your wallet",
  description = "You need a connected wallet to continue.",
  compact = false,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  // Use `useAccount().chainId` (the connector's reported chain) rather than
  // `useChainId()` (which falls back to wagmi's configured default and can
  // lie when the wallet is on an unlisted chain like mainnet).
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={
          compact
            ? "border border-dashed border-border bg-card/40 p-5"
            : "border border-dashed border-border bg-card/40 p-8"
        }
        aria-hidden
      />
    );
  }

  if (!contractsDeployed()) {
    return (
      <div
        className={
          compact
            ? "space-y-3 border border-destructive/40 bg-destructive/5 p-5"
            : "space-y-4 border border-destructive/40 bg-destructive/5 p-8"
        }
      >
        <h2 className="font-mono text-sm font-semibold uppercase tracking-tight text-destructive">
          Contracts not deployed yet
        </h2>
        <p className="text-sm text-muted-foreground">
          Wallet actions can&apos;t run until the campaign factory is on-chain. Set up{" "}
          <span className="font-mono">SEPOLIA_RPC_URL</span> and{" "}
          <span className="font-mono">DEPLOYER_PRIVATE_KEY</span> in{" "}
          <span className="font-mono">packages/contracts/.env</span>, then run{" "}
          <span className="font-mono">pnpm contracts:deploy:sepolia</span>.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
          // see README → Production deploy
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div
        className={
          compact
            ? "space-y-3 border border-dashed border-border bg-card/40 p-5"
            : "space-y-4 border border-dashed border-border bg-card/40 p-8"
        }
      >
        <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <ConnectWallet />
      </div>
    );
  }

  if (chainId !== DEPLOYMENTS.chainId) {
    return (
      <div
        className={
          compact
            ? "space-y-3 border border-destructive/40 bg-destructive/5 p-5"
            : "space-y-4 border border-destructive/40 bg-destructive/5 p-8"
        }
      >
        <h2 className="font-mono text-sm font-semibold uppercase tracking-tight text-destructive">
          Wrong network
        </h2>
        <p className="text-sm text-muted-foreground">
          Switch your wallet to Sepolia (chain {DEPLOYMENTS.chainId}) to continue.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => switchChain({ chainId: sepolia.id })}
        >
          Switch to Sepolia
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
