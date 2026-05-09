// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {
    FHE,
    ebool,
    euint64,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// One Campaign per fundraiser. v5 model — privacy hardened:
///   PUBLIC: story (markdown JSON on IPFS), title, pseudonym, category,
///           goal (uint64), donor count, vouchers, creator updates,
///           beneficiary address, AND four bucket booleans
///           (past25 / past50 / past75 / past100) that mark whether the
///           encrypted total has crossed each threshold.
///   PRIVATE: per-donor donation amount AND the running total. The
///           running total is only decryptable by the beneficiary;
///           outside observers see only the four bucket flips.
///
/// Why this matters: in v4 the running total was publicly decryptable
/// after every donation. Anyone watching the chain could subtract
/// before/after totals to derive each donor's exact amount. v5 reveals
/// only coarse progress (4 transitions over the campaign's lifetime),
/// so a per-donation observer can at most place a donor's amount inside
/// a 25%-of-goal interval.
contract Campaign is ZamaEthereumConfig {
    IERC7984 public immutable token;
    address public immutable creator;
    /// Recipient wallet — public so donors can verify on Etherscan before
    /// they give. Per-donation amounts remain encrypted.
    address public immutable beneficiary;
    string public ipfsHash;
    uint64 public immutable goal;
    /// 0 medical · 1 safety · 2 education · 3 community · 4 other
    uint8 public immutable category;
    /// Curve25519 public key of the recipient. Donors can seal a private
    /// message to it that only the recipient can decrypt. bytes32(0) =
    /// recipient hasn't published a key, so donor notes are disabled.
    bytes32 public immutable recipientPubkey;

    /// Encrypted running total. ACL: this contract + beneficiary only.
    /// NOT publicly decryptable.
    euint64 private _encTotal;

    /// Public progress bucket flags. Each is publicly decryptable; flipped
    /// from false → true exactly once when the encrypted total crosses
    /// the threshold. The fundraiser UI reads these for a coarse progress
    /// indicator without leaking the precise total.
    ebool private _past25;
    ebool private _past50;
    ebool private _past75;
    ebool private _past100;

    uint256 public publicDonorCount;
    uint64 public createdAt;

    /// True once the creator has marked the campaign closed. Donations are
    /// rejected after close. Withdrawals still work (the beneficiary may
    /// still be sweeping leftover ciphertext).
    bool public closed;
    uint64 public closedAt;

    /// IPFS CIDs (each pointing at a markdown update JSON).
    string[] public updates;

    struct Voucher {
        address attester;
        string cid;
        uint64 attestedAt;
    }
    Voucher[] public vouchers;

    event Donated(address indexed donor, uint256 donorIndex, bytes note);
    event ProgressUpdated();
    event Withdrawn(address indexed beneficiary);
    event UpdatePosted(uint256 indexed index, string cid);
    event Vouched(address indexed attester, string cid);
    event Closed(address indexed by, uint64 timestamp);

    constructor(
        address token_,
        address creator_,
        string memory ipfsHash_,
        uint64 goal_,
        uint8 category_,
        bytes32 recipientPubkey_,
        address beneficiary_
    ) {
        require(beneficiary_ != address(0), "zero beneficiary");
        token = IERC7984(token_);
        creator = creator_;
        ipfsHash = ipfsHash_;
        goal = goal_;
        category = category_;
        recipientPubkey = recipientPubkey_;
        beneficiary = beneficiary_;
        createdAt = uint64(block.timestamp);

        _encTotal = FHE.asEuint64(0);
        FHE.allowThis(_encTotal);
        FHE.allow(_encTotal, beneficiary_);

        _past25 = FHE.asEbool(false);
        _past50 = FHE.asEbool(false);
        _past75 = FHE.asEbool(false);
        _past100 = FHE.asEbool(false);
        _publishBuckets();
    }

    /// Donor must first call token.setOperator(address(campaign), expiry).
    /// `note` is an optional sealed-box (curve25519) ciphertext addressed to
    /// `recipientPubkey`. Pass empty bytes to skip the donor-note feature.
    function donate(
        externalEuint64 amountIn,
        bytes calldata proof,
        bytes calldata note
    ) external {
        require(!closed, "campaign closed");
        euint64 amount = FHE.fromExternal(amountIn, proof);

        FHE.allowTransient(amount, address(token));
        token.confidentialTransferFrom(msg.sender, address(this), amount);

        _encTotal = FHE.add(_encTotal, amount);
        FHE.allowThis(_encTotal);
        FHE.allow(_encTotal, beneficiary);
        _refreshBuckets();

        uint256 idx = publicDonorCount;
        publicDonorCount = idx + 1;
        emit Donated(msg.sender, idx, note);
        emit ProgressUpdated();
    }

    /// Public sender check — only the published beneficiary can withdraw.
    /// Goal-reached check stays encrypted via FHE.select: if total < goal,
    /// `amount` resolves to encrypted zero so no funds move. (Anyone reading
    /// `past100` already knows whether the goal is reached, so the encrypted
    /// gate here is defence-in-depth, not load-bearing privacy.)
    function withdraw() external {
        require(msg.sender == beneficiary, "not beneficiary");
        require(publicDonorCount > 0, "no donations");

        ebool goalReached = FHE.ge(_encTotal, FHE.asEuint64(goal));
        euint64 amount = FHE.select(goalReached, _encTotal, FHE.asEuint64(0));
        FHE.allowTransient(amount, address(token));
        token.confidentialTransfer(msg.sender, amount);

        _encTotal = FHE.sub(_encTotal, amount);
        FHE.allowThis(_encTotal);
        FHE.allow(_encTotal, beneficiary);
        _refreshBuckets();

        emit Withdrawn(msg.sender);
    }

    /// Creator-only: append an IPFS CID for a new update post.
    function postUpdate(string calldata cid) external {
        require(msg.sender == creator, "not creator");
        updates.push(cid);
        emit UpdatePosted(updates.length - 1, cid);
    }

    /// Creator-only: lock the campaign so no further donations can come in.
    function close() external {
        require(msg.sender == creator, "not creator");
        require(!closed, "already closed");
        closed = true;
        closedAt = uint64(block.timestamp);
        emit Closed(msg.sender, closedAt);
    }

    /// Anyone can vouch for a campaign with an attestation pinned to IPFS.
    function vouch(string calldata cid) external {
        vouchers.push(Voucher(msg.sender, cid, uint64(block.timestamp)));
        emit Vouched(msg.sender, cid);
    }

    function updatesCount() external view returns (uint256) {
        return updates.length;
    }

    function vouchersCount() external view returns (uint256) {
        return vouchers.length;
    }

    /// Encrypted running total. ACL is restricted to the beneficiary;
    /// outside callers cannot user-decrypt this.
    function getEncryptedTotal() external view returns (euint64) {
        return _encTotal;
    }

    /// Publicly decryptable bucket flags: (past25, past50, past75, past100).
    /// Each is `false` until the encrypted total crosses the corresponding
    /// fraction of `goal`. The frontend uses these for a coarse progress bar.
    function getProgressBuckets()
        external
        view
        returns (ebool, ebool, ebool, ebool)
    {
        return (_past25, _past50, _past75, _past100);
    }

    /// Recompute bucket flags from the current encrypted total. Each
    /// comparison is against a precomputed plaintext fraction of the goal
    /// (cipher-by-scalar). Only these flags are made publicly decryptable;
    /// the underlying total stays private to the beneficiary.
    function _refreshBuckets() private {
        _past25 = FHE.ge(_encTotal, FHE.asEuint64(goal / 4));
        _past50 = FHE.ge(_encTotal, FHE.asEuint64(goal / 2));
        _past75 = FHE.ge(_encTotal, FHE.asEuint64((uint64(uint256(goal)) * 3) / 4));
        _past100 = FHE.ge(_encTotal, FHE.asEuint64(goal));
        _publishBuckets();
    }

    function _publishBuckets() private {
        FHE.allowThis(_past25);
        FHE.allowThis(_past50);
        FHE.allowThis(_past75);
        FHE.allowThis(_past100);
        FHE.makePubliclyDecryptable(_past25);
        FHE.makePubliclyDecryptable(_past50);
        FHE.makePubliclyDecryptable(_past75);
        FHE.makePubliclyDecryptable(_past100);
    }
}
