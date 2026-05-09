# Privacyfundme

Confidential crowdfunding on Ethereum. **Public stories, private money.** Donors read what they're supporting; per-donation amounts and the recipient's wallet stay encrypted via Zama's fhEVM.

```
.
├── apps/web                  # Next.js 14 app (App Router, framer-motion, R3F)
└── packages/contracts        # Hardhat + @fhevm/solidity contracts
```

## What gets built

- **ConfidentialDonationToken** — ERC-7984 confidential token (open faucet on testnet).
- **Campaign** — per-fundraiser contract: public goal & story, publicly-decryptable running total, encrypted beneficiary address, creator updates, voucher attestations, optional sealed donor notes.
- **CampaignFactory** — deploys campaigns; admin-set USD→NGN rate; reads Sepolia ETH/USD Chainlink feed.

## What's public · what's private

| Surface | Public | Private (FHE) |
|---|---|---|
| Story (markdown + cover image) | ✓ | |
| Title · pseudonym · category | ✓ | |
| Goal amount | ✓ | |
| Total raised | ✓ (publicly-decryptable euint64) | |
| Donor count · vouchers · creator updates | ✓ | |
| Per-donor amount | | euint64 |
| Recipient wallet | | eaddress (revealed only at claim) |
| Donor → recipient note (optional) | | curve25519 sealed-box |

The only technical term we ever surface to non-technical donors is "Zama FHE" — a single trust signal.

---

## Local development

### One-time setup

```bash
pnpm install
cp .env.example .env
cp packages/contracts/.env.example packages/contracts/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Fill in the env files (see [`.env.example`](.env.example) at the root for the full list). For local-only work the only required vars are `PINATA_JWT` (web) and the contract dev defaults.

### Run the app in demo mode

```bash
pnpm dev
```

Out of the box, `apps/web/src/contracts/deployments.json` ships with zero addresses → the app runs in **DEMO_MODE** with a few seeded mock campaigns. Wallet actions short-circuit; everything else is fully interactive.

### Run the contract test suite

```bash
pnpm contracts:test
```

Runs against the FHE Hardhat mock node — no Sepolia connection needed. The suite covers public goal/total flow, donation accumulation, category bounds, creator-only updates, public vouching, and donor-note round-trips.

---

## Production deploy

### 1. Deploy contracts to Sepolia

In `packages/contracts/.env`:

| Var | Where to get it |
|---|---|
| `SEPOLIA_RPC_URL` | Alchemy / Infura / publicnode |
| `DEPLOYER_PRIVATE_KEY` | A throwaway hot wallet with **≥ 0.2 Sepolia ETH** for gas. Faucet: [sepoliafaucet.com](https://sepoliafaucet.com) |
| `ETHERSCAN_API_KEY` | Optional — only needed for `pnpm --filter contracts verify` |
| `INITIAL_USD_NGN_1E8` | Starting NGN/USD rate (default ~1500 → `150000000000`) |

Then:

```bash
pnpm contracts:deploy:sepolia
```

This deploys `ConfidentialDonationToken` + `CampaignFactory`, wires Sepolia's Chainlink ETH/USD feed (`0x694AA1769357215DE4FAC081bf1f309aDC325306`), and writes the live addresses + ABIs into `apps/web/src/contracts/deployments.json`. Once that file no longer has zero addresses, the app exits demo mode automatically.

### 2. Push the web app to Vercel

```bash
# from the repo root
git push origin main
```

Then in [vercel.com](https://vercel.com):

1. **New Project → Import Git Repository → pick this repo**
2. **Root directory:** `apps/web`
3. **Framework preset:** Next.js (auto-detected)
4. **Build command:** `pnpm build` (default)
5. **Install command:** `pnpm install`
6. **Environment variables** — add these in Project Settings → Environment Variables:

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Same RPC URL the contracts use |
| `NEXT_PUBLIC_PINATA_GATEWAY` | e.g. `https://gateway.pinata.cloud/ipfs/` |
| `PINATA_JWT` | **Server-side only** — do NOT prefix with `NEXT_PUBLIC_`. Used by `pinStory`, `pinUpdate`, `pinVoucher`, `pinCoverImage` server actions. |

The `apps/web/src/contracts/deployments.json` file is committed, so the live addresses go up with the next git push after `pnpm contracts:deploy:sepolia`.

### 3. Add a custom domain

Vercel → Project → Settings → Domains → add `privacyfundme.xyz` (or whatever you own). Configure the DNS A/CNAME records Vercel shows. SSL is automatic.

### 4. Verify the deploy

- Visit the homepage — campaigns should load from chain (or show the empty state if nobody has created one yet).
- Visit `/campaign/<known-address>/opengraph-image` — should return a 1200×630 PNG with the campaign's title + raised/goal.
- Test the full flow: `/faucet` → `/create` → donate from a second wallet → claim from the recipient wallet.

### 5. (Optional) Verify contracts on Etherscan

```bash
pnpm --filter contracts verify <factory_address> <token_address> <feed_address> <ngn_rate>
```

---

## Routes

| Path | Purpose |
|---|---|
| `/` | Browse campaigns by category |
| `/create` | Launch a new campaign |
| `/campaign/[address]` | Story, progress, donation form, updates feed, vouchers, claim |
| `/campaign/[address]/opengraph-image` | Auto-generated 1200×630 social card |
| `/inbox` | Recipient-only: read sealed notes from past donations |
| `/setup` | Generate / back up / restore your curve25519 keypair |
| `/guardian` | List of campaigns to vouch for |
| `/faucet` | Mint test cNGN to play with |

## Privacy boundaries (be honest)

- **Real-time public total** updates after every donation. Sophisticated chain analysts can deduce individual amounts by diffing the total before/after each donation. The UI hides individual amounts; the chain does not. Honest framing: *private from the platform and the public, not from a determined chain analyst.*
- **Beneficiary anonymity** holds against passive observers but the recipient calling `withdraw()` reveals their address to anyone watching the mempool.
- **Sealed donor notes** are end-to-end encrypted to the recipient's curve25519 key. If the recipient loses their key, sealed notes become unreadable forever — `/setup` lets them download a backup.

## Versions

- `@fhevm/solidity` 0.11.x · `@fhevm/hardhat-plugin` 0.4.x · `@zama-fhe/relayer-sdk` 0.4.1 (pinned)
- `@openzeppelin/confidential-contracts` 0.3.x
- Solidity 0.8.27 / EVM `cancun` (transient storage required for `FHE.allowTransient`)
- Next.js 14.2.x (App Router) · React 18.3 · framer-motion 11.x · @react-three/fiber 8.x
