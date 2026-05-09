// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// Test cUSDC for the live demo on Sepolia. ERC-7984 confidential token —
/// balances and transfers are encrypted on-chain via Zama FHE.
///
/// In production, this would be replaced by `ERC7984ERC20Wrapper` over real
/// USDC: donors call `wrap(amount)` on the wrapper to convert plaintext USDC
/// into encrypted cUSDC before donating, and beneficiaries call `unwrap(...)`
/// after withdrawal to convert back to plaintext USDC. The Campaign contract
/// is unchanged in either deployment — it only knows the IERC7984 interface.
///
/// For testnet we keep an open mint so demo flows are one-click.
contract ConfidentialUSDC is ERC7984, ZamaEthereumConfig {
    constructor()
        ERC7984("USD Coin", "USDC", "ipfs://confidential-gofundme/usdc-test")
    {}

    function mint(externalEuint64 inH, bytes calldata proof) external {
        euint64 amount = FHE.fromExternal(inH, proof);
        _mint(msg.sender, amount);
    }
}
