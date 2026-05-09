"use client";

type FhevmInstance = any;

let _instance: FhevmInstance | null = null;
let _instancePromise: Promise<FhevmInstance> | null = null;

/// Lazy, browser-only singleton for the Zama relayer SDK.
///
/// The `/bundle` subpath is published as a CJS-shaped module, so depending
/// on the bundler the dynamic-import result puts the named exports on
/// `module.default` or directly on the namespace. We accept either.
export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (typeof window === "undefined") {
    throw new Error("FHEVM SDK is browser-only");
  }
  if (_instance) return _instance;
  if (_instancePromise) return _instancePromise;

  _instancePromise = (async () => {
    // The SDK ships two browser entries:
    //   /bundle — re-exports `window.relayerSDK.*` (script-tag CDN loads only)
    //   /web    — real ES-module exports for bundler-resolved imports
    // We want /web here.
    const raw = await import("@zama-fhe/relayer-sdk/web");
    const sdk: any = (raw as any)?.default ?? raw;

    if (typeof sdk.initSDK !== "function" || typeof sdk.createInstance !== "function") {
      throw new Error(
        "FHEVM SDK loaded but `initSDK`/`createInstance` not found. " +
          "Try clearing .next and reinstalling, or pin @zama-fhe/relayer-sdk to 0.4.1.",
      );
    }

    await sdk.initSDK();

    const eth = (window as any).ethereum;
    if (!eth) {
      throw new Error(
        "No injected wallet found. Install MetaMask (or a compatible wallet) and reload.",
      );
    }

    // Prefer a dedicated Sepolia RPC URL for the SDK's read-only init
    // (eip712Domain on InputVerifier, public-key fetches, etc). Falling back
    // to the wallet's injected provider works, but MetaMask's default Sepolia
    // RPC frequently returns empty `0x` data — surfacing as a confusing
    // "could not decode result data" error during createInstance.
    const rpcUrl =
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com";

    const instance = await sdk.createInstance({
      ...sdk.SepoliaConfig,
      network: rpcUrl,
    });
    _instance = instance;
    return instance;
  })();

  // Reset the promise on failure so the next user action retries instead of
  // silently returning a rejected promise.
  _instancePromise.catch(() => {
    _instancePromise = null;
  });

  return _instancePromise;
}
