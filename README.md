# Confidential GoFundMe

> Public causes. Private donations. Encrypted on-chain.

A privacy-preserving crowdfunding platform built on **Zama fhEVM**. The cause, goal, recipient wallet, and running total are publicly verifiable on Sepolia — but every **individual donation amount** is encrypted on-chain via ERC-7984. No public donor leaderboard. No platform fee.

- **Live demo:** [confidential-gofundme.vercel.app](https://confidential-gofundme.vercel.app)
- **Network:** Ethereum Sepolia (chainId 11155111)
- **Stack:** Solidity 0.8.27 · `@fhevm/solidity` v0.11 · OpenZeppelin Confidential Contracts v0.3 · Next.js 14 · `@zama-fhe/relayer-sdk` v0.4

---

## Why this exists

Every other crowdfunding site publishes a donor leaderboard: who gave, how much, in what order. People who can give more get visibility. People who can't feel embarrassed and stay silent. Both groups lose privacy by default.

This platform inverts the privacy lens:

| | Traditional crowdfunding | Confidential GoFundMe |
|---|---|---|
| Cause / story | public | public |
| Goal | public | public |
| Recipient wallet | (often hidden) | **public** — verifiable on Etherscan |
| Running total | public | public — provably accurate |
| **Per-donor amount** | **public** — anyone can see | **encrypted on-chain** — no one can read |
| Donor wallet | public | public (it's Ethereum) |
| Donor identity (name) | usually exposed | never collected |

The smart contract performs `FHE.add()` on encrypted donation handles. The on-chain state stores `bytes32` ciphertext handles, not numbers. The total is decrypted via Zama's KMS for the public progress bar — individual donations behind it stay sealed forever.

---

## Verified contracts (Sepolia)

| Contract | Address | Etherscan |
|---|---|---|
| **CampaignFactory** | `0x389acc6A9db28A28162B6081075Ce3d76a76AF08` | [Read Contract ↗](https://sepolia.etherscan.io/address/0x389acc6A9db28A28162B6081075Ce3d76a76AF08#code) |
| **ConfidentialUSDC** (cUSDC, ERC-7984) | `0x95Ac720fc206B826d62f1e9AbE40D5605aa1078B` | [Read Contract ↗](https://sepolia.etherscan.io/address/0x95Ac720fc206B826d62f1e9AbE40D5605aa1078B#code) |

Each Campaign instance the factory deploys is auto-verified by Etherscan via bytecode match.

---

## Verify FHE on-chain in 30 seconds

For any campaign created via the live demo:

1. Open the campaign on Etherscan → **Contract** → **Read Contract**.
2. Find `getEncryptedTotal()` and click **Query**. The function returns a `bytes32` — that's the ciphertext handle for the running total. **It's not a number.** No public state on this chain stores the plaintext amount.
3. Find the latest `donate()` transaction → **Input Data** → **Decode**. The first parameter `inH` is also a `bytes32`, the donor-encrypted amount handle. The second is a ZK proof binding the encryption to (donor, contract).
4. Open the **Events** tab. The `Donated` event has `(address donor, uint256 donorIndex, bytes note)` — **no amount field**. By design.

That's the proof: every observer sees opaque handles where there used to be numbers, the contract added them without ever decrypting, and the API surface is structurally unable to leak per-donation amounts.

---

## How FHE is used (six load-bearing places)

| Where | What | Why |
|---|---|---|
| `donate()` | `FHE.fromExternal(amountIn, proof)` | Verifies the donor-side encrypted input is bound to (donor, this contract). |
| `donate()` | `FHE.add(_encTotal, amount)` | Sums encrypted donations into the encrypted total. The contract never sees plaintext. |
| `donate()` + constructor | `FHE.allowThis(_encTotal); FHE.makePubliclyDecryptable(_encTotal);` | Lets the contract reuse the handle next call, and authorizes Zama's KMS to decrypt the total for public consumption. Without these, the next tx reverts with `ACLNotAllowed()`. |
| `withdraw()` | `FHE.ge(_encTotal, FHE.asEuint64(goal))` + `FHE.select(goalReached, _encTotal, asEuint64(0))` | Encrypted goal-reached gate. The contract can't observe the boolean — it just transfers the result. If goal not met, encrypted zero is transferred (no-op). |
| `donate()` `note` arg | X25519 sealed box from `@noble/curves` | Optional sealed donor message, encrypted client-side to the recipient's published Curve25519 pubkey. Stored as opaque bytes in the `Donated` event. |
| Frontend (`/wallet`) | EIP-712 user-decrypt flow via the relayer SDK | Lets you reveal *only your own* encrypted cUSDC balance. Sign typed data → KMS releases plaintext to your ephemeral keypair → only your browser session sees the number. |

---

## Repo structure

```
.
├── packages/contracts/        Hardhat workspace — Solidity + tests + deploy
│   ├── contracts/
│   │   ├── Campaign.sol           One per fundraiser. donate / withdraw / close / vouch.
│   │   ├── CampaignFactory.sol    Deploys Campaigns. Tracks them. CampaignCreated event.
│   │   └── ConfidentialUSDC.sol   ERC-7984 confidential token. Test mint for the demo.
│   ├── test/Campaign.spec.ts      9 tests. All passing.
│   └── deploy/01_deploy_stack.ts  Hardhat-deploy script. Writes deployments.json.
│
└── apps/web/                  Next.js 14 App Router frontend
    ├── src/app/
    │   ├── page.tsx                  Browse campaigns + landing page
    │   ├── create/                   Launch a campaign
    │   ├── campaign/[address]/       Single campaign view + donate + withdraw + close
    │   ├── faucet/                   Mint test cUSDC
    │   ├── me/                       Created · Donated · Past tabs
    │   ├── wallet/                   Encrypted balance + activity + decrypt
    │   ├── inbox/                    Sealed donor messages
    │   └── setup/                    Curve25519 keypair management
    ├── src/components/
    │   ├── encrypted-total-counter.tsx
    │   ├── comparison-split.tsx      Traditional-vs-confidential comparison
    │   ├── fhe-add-diagram.tsx       Animated FHE.add() loop
    │   └── ...
    └── src/lib/
        ├── fhevm.ts                  Singleton getFhevmInstance() from @zama-fhe/relayer-sdk/web
        ├── crypto.ts                 X25519 sealed-box for donor notes
        └── contracts.ts              ABIs + addresses from deployments.json
```

---

## Run locally

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A Sepolia RPC URL (free from Alchemy / publicnode)
- A funded Sepolia wallet (deployer)
- (Optional) Pinata JWT for IPFS pinning of stories + cover images
- (Optional) Etherscan API key for contract verification

### Install

```bash
pnpm install
```

### Contracts

```bash
cd packages/contracts
cp .env.example .env
# Fill in SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY (+ ETHERSCAN_API_KEY)

pnpm test                                    # 9 tests, mock node
pnpm deploy:sepolia                          # writes apps/web/src/contracts/deployments.json

# Verify on Etherscan (optional)
npx hardhat verify --network sepolia <token-addr>
npx hardhat verify --network sepolia <factory-addr> <token-addr>
```

### Frontend

```bash
cd apps/web
cp .env.local.example .env.local
# Fill in PINATA_JWT (optional but needed for the create flow to work end-to-end)

pnpm dev                                     # http://localhost:3000
```

The frontend auto-reads `apps/web/src/contracts/deployments.json` written by the deploy step.

---

## End-to-end flow (live demo)

1. Connect a Sepolia wallet (MetaMask, Rabby, etc.).
2. Visit [`/faucet`](https://confidential-gofundme.vercel.app/faucet) → mint test cUSDC. The amount is encrypted on your device before submission. Etherscan only sees a handle.
3. Visit [`/create`](https://confidential-gofundme.vercel.app/create) → launch a campaign. Story + cover are pinned to IPFS (via Pinata). The on-chain tx records the goal, recipient address, and the IPFS CID — recipient is published publicly.
4. From a different wallet, visit the campaign URL → approve the campaign as a token operator → donate. The amount is encrypted in your browser and submitted as `(handle, proof)`. The contract calls `FHE.fromExternal` → `FHE.add(_encTotal, amount)`.
5. Watch the **public running total** update on the campaign page (publicly decrypted via the relayer SDK from the publicly-decryptable `_encTotal`).
6. Once the goal is hit, the recipient wallet signs a withdraw → contract checks `FHE.ge(total, goal)` on ciphertext → only releases funds if the gate passes.
7. Creator clicks **Close campaign** → campaign moves from public discovery to the creator's "Past" tab.

---

## What I'd ship next

- **Mainnet wrapper path.** Replace the test-mint `ConfidentialUSDC` with `ERC7984ERC20Wrapper` over real USDC. Donors call `wrap(amount)` to convert plaintext USDC → encrypted cUSDC; beneficiaries call `unwrap(...)` after withdrawal. Code path is already designed for it — `Campaign.sol` only depends on the `IERC7984` interface, so the swap is a single-constructor change.
- **Per-creator on-chain index.** Currently `/me` walks all factory campaigns and filters by `creator()`. Trivial at hundreds of campaigns; would need a `mapping(address => address[]) byCreator` for thousands.
- **Refund flow.** If a campaign closes without reaching its goal, donors should be able to claw back their encrypted contribution. This is a substantive FHEVM design problem (donors are pseudonymous, refunds need to settle without leaking per-donor amounts) — left as a v2 feature.

---

## Tech notes & a few things I learned

- **`FHE.makePubliclyDecryptable` is the unlock for "amounts hidden, total visible."** The total is encrypted by default (it's a sum of encrypted donations); calling this once per state mutation authorizes the KMS to decrypt it on demand for anyone. Per-donation amounts stay sealed forever because we never call this on individual donation handles.
- **`FHE.select` instead of `if (ebool)`.** The withdraw-goal-reached gate uses `FHE.select(goalReached, _encTotal, FHE.asEuint64(0))`. The contract literally cannot branch on encrypted state — every branch always executes. Solidity's `if (FHE.eq(...))` would not compile, and would leak even if it did.
- **`@zama-fhe/relayer-sdk/web` not `/bundle`.** The `/bundle` entry expects a script-tag CDN preload (`window.relayerSDK.*`). For a Next.js bundler-resolved import, use `/web`.
- **ERC-7984 zero-balance reverts.** `confidentialTransfer` from a zero-balance source reverts even when the encrypted amount is zero. The plaintext balance check fires before the FHE math runs. Pre-flight `require(publicDonorCount > 0)` works around it.

---

## Built with

- [Zama fhEVM](https://docs.zama.ai/fhevm) — the FHE coprocessor + KMS infrastructure
- [`@fhevm/solidity`](https://www.npmjs.com/package/@fhevm/solidity) v0.11.x
- [`@zama-fhe/relayer-sdk`](https://www.npmjs.com/package/@zama-fhe/relayer-sdk) v0.4.1
- [OpenZeppelin Confidential Contracts](https://www.npmjs.com/package/@openzeppelin/confidential-contracts) v0.3 (ERC-7984)
- [Hardhat](https://hardhat.org/) + [`@fhevm/hardhat-plugin`](https://www.npmjs.com/package/@fhevm/hardhat-plugin) for the mock node
- [Next.js 14](https://nextjs.org/) App Router · [Wagmi v2](https://wagmi.sh/) · [ethers v6](https://docs.ethers.org/v6/)
- [`@noble/curves`](https://github.com/paulmillr/noble-curves) for X25519 sealed-box donor messages

## License

MIT.
