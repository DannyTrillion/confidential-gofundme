import deployments from "@/contracts/deployments.json";

export type Deployments = {
  chainId: number;
  token: `0x${string}`;
  factory: `0x${string}`;
  tokenDecimals: number;
  abis: {
    ConfidentialUSDC: any[];
    CampaignFactory: any[];
    Campaign: any[];
  };
};

export const DEPLOYMENTS = deployments as Deployments;
export const FACTORY_ABI = DEPLOYMENTS.abis.CampaignFactory;
export const CAMPAIGN_ABI = DEPLOYMENTS.abis.Campaign;
export const TOKEN_ABI = DEPLOYMENTS.abis.ConfidentialUSDC;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/// True when the factory + token addresses are real (i.e. someone has run
/// `pnpm contracts:deploy:sepolia`). When false, the app is in preview mode
/// and any wallet action would target the zero address and fail mysteriously.
export function contractsDeployed(): boolean {
  return (
    DEPLOYMENTS.factory.toLowerCase() !== ZERO_ADDRESS &&
    DEPLOYMENTS.token.toLowerCase() !== ZERO_ADDRESS
  );
}

/// Throws a friendly, actionable error if the given contract address is the
/// zero address. Use this in wallet action handlers before encrypting inputs
/// or calling the contract — otherwise ethers blows up with a cryptic
/// `eip712Domain()` BAD_DATA error.
export function ensureDeployed(addr: string, label: string): void {
  if (!addr || addr.toLowerCase() === ZERO_ADDRESS) {
    throw new Error(
      `${label} contract isn't deployed yet. Set SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY in packages/contracts/.env, then run \`pnpm contracts:deploy:sepolia\` from the repo root. See README → Production deploy.`,
    );
  }
}
