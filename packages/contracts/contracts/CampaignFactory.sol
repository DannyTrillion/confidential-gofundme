// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {Campaign} from "./Campaign.sol";

/// Deploys Campaign contracts and tracks them. Goals are denominated in the
/// token's base units (cUSDC has 6 decimals, so 100 USD = 100_000_000 base).
contract CampaignFactory is ZamaEthereumConfig {
    address public immutable token;
    address public admin;

    address[] public campaigns;
    mapping(address => bool) public isCampaign;

    event CampaignCreated(
        address indexed campaign,
        address indexed creator,
        address indexed beneficiary,
        uint64 goal,
        uint8 category,
        string ipfsHash
    );
    event AdminTransferred(address indexed newAdmin);

    constructor(address token_) {
        token = token_;
        admin = msg.sender;
    }

    function createCampaign(
        uint64 goal,
        uint8 category,
        bytes32 recipientPubkey,
        address beneficiary,
        string calldata ipfsHash
    ) external returns (address campaignAddr) {
        require(goal > 0, "goal must be > 0");
        require(category < 5, "invalid category");
        require(beneficiary != address(0), "zero beneficiary");

        Campaign c = new Campaign(
            token,
            msg.sender,
            ipfsHash,
            goal,
            category,
            recipientPubkey,
            beneficiary
        );
        campaignAddr = address(c);

        campaigns.push(campaignAddr);
        isCampaign[campaignAddr] = true;

        emit CampaignCreated(campaignAddr, msg.sender, beneficiary, goal, category, ipfsHash);
    }

    function campaignsCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getCampaigns(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        uint256 n = campaigns.length;
        if (offset >= n) return new address[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        page = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) page[i - offset] = campaigns[i];
    }

    function transferAdmin(address newAdmin) external {
        require(msg.sender == admin, "not admin");
        admin = newAdmin;
        emit AdminTransferred(newAdmin);
    }
}
