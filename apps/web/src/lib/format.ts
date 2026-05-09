/// USD formatting + cUSDC base-unit conversion. cUSDC has 6 decimals
/// (matches USDC convention), so 1 USD = 1_000_000 base units.
const TOKEN_DECIMALS = 6;
const TOKEN_UNIT = 10n ** BigInt(TOKEN_DECIMALS);

export function formatUsd(amount: bigint | number, opts: { compact?: boolean } = {}) {
  const n = typeof amount === "bigint" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(n);
}

export function usdToTokenUnits(usd: bigint): bigint {
  return usd * TOKEN_UNIT;
}

export function tokenUnitsToUsd(tokens: bigint): bigint {
  return tokens / TOKEN_UNIT;
}
