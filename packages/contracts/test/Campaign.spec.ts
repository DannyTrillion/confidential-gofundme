import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

const FAR_FUTURE = 4_000_000_000n;

describe("Privacyfundme — public stories, private donations", function () {
  let creator: any, donor: any, beneficiary: any;
  let token: any, factory: any;
  let tokenAddr: string, factoryAddr: string;

  before(async () => {
    const signers = await ethers.getSigners();
    [creator, donor, beneficiary] = signers;
  });

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip();

    const Token = await ethers.getContractFactory("ConfidentialUSDC");
    token = await Token.deploy();
    tokenAddr = await token.getAddress();

    const Factory = await ethers.getContractFactory("CampaignFactory");
    factory = await Factory.deploy(tokenAddr);
    factoryAddr = await factory.getAddress();
  });

  async function mint(signer: any, amount: bigint) {
    const enc = await fhevm
      .createEncryptedInput(tokenAddr, signer.address)
      .add64(amount)
      .encrypt();
    await token.connect(signer).mint(enc.handles[0], enc.inputProof);
  }

  async function newCampaign(opts: {
    goal?: bigint;
    category?: number;
    recipientPubkey?: string;
    beneficiaryAddr?: string;
    ipfsHash?: string;
  } = {}) {
    const tx = await factory
      .connect(creator)
      .createCampaign(
        opts.goal ?? 1000n,
        opts.category ?? 0,
        opts.recipientPubkey ?? ethers.ZeroHash,
        opts.beneficiaryAddr ?? beneficiary.address,
        opts.ipfsHash ?? "ipfs://Qm.../story.json",
      );
    const receipt = await tx.wait();
    const log = receipt.logs.find((l: any) => l.fragment?.name === "CampaignCreated");
    const campaignAddr: string = log.args.campaign;
    return ethers.getContractAt("Campaign", campaignAddr);
  }

  it("creates a campaign with a public goal, public beneficiary, and tracks public total", async () => {
    const campaign = await newCampaign({ goal: 1000n });
    expect(await campaign.goal()).to.eq(1000n);
    expect(await campaign.beneficiary()).to.eq(beneficiary.address);
    expect(await campaign.publicDonorCount()).to.eq(0n);

    const initialTotal = await campaign.getEncryptedTotal();
    expect(await fhevm.publicDecryptEuint(FhevmType.euint64, initialTotal)).to.eq(0n);

    await mint(donor, 10_000n);
    const campaignAddr = await campaign.getAddress();
    await token.connect(donor).setOperator(campaignAddr, FAR_FUTURE);

    const donateEnc = await fhevm
      .createEncryptedInput(campaignAddr, donor.address)
      .add64(1500n)
      .encrypt();
    await campaign
      .connect(donor)
      .donate(donateEnc.handles[0], donateEnc.inputProof, "0x");

    expect(await campaign.publicDonorCount()).to.eq(1n);

    const totalHandle = await campaign.getEncryptedTotal();
    expect(await fhevm.publicDecryptEuint(FhevmType.euint64, totalHandle)).to.eq(1500n);
  });

  it("rejects zero address as beneficiary", async () => {
    await expect(
      newCampaign({ beneficiaryAddr: ethers.ZeroAddress }),
    ).to.be.revertedWith("zero beneficiary");
  });

  it("multiple donations accumulate correctly", async () => {
    const campaign = await newCampaign({ goal: 1000n });
    const campaignAddr = await campaign.getAddress();

    await mint(donor, 10_000n);
    await token.connect(donor).setOperator(campaignAddr, FAR_FUTURE);

    async function donate(amount: bigint) {
      const e = await fhevm
        .createEncryptedInput(campaignAddr, donor.address)
        .add64(amount)
        .encrypt();
      await campaign.connect(donor).donate(e.handles[0], e.inputProof, "0x");
    }

    await donate(200n);
    await donate(300n);
    await donate(450n);

    expect(await campaign.publicDonorCount()).to.eq(3n);
    const totalHandle = await campaign.getEncryptedTotal();
    expect(await fhevm.publicDecryptEuint(FhevmType.euint64, totalHandle)).to.eq(950n);
  });

  it("stores category and rejects out-of-range categories", async () => {
    const campaign = await newCampaign({ category: 2 });
    expect(await campaign.category()).to.eq(2);

    await expect(newCampaign({ category: 99 })).to.be.revertedWith("invalid category");
  });

  it("creator can post updates; non-creator cannot", async () => {
    const campaign = await newCampaign();
    await campaign.connect(creator).postUpdate("ipfs://Qm.../update-1.json");
    expect(await campaign.updatesCount()).to.eq(1n);
    expect(await campaign.updates(0)).to.eq("ipfs://Qm.../update-1.json");

    await expect(
      campaign.connect(donor).postUpdate("ipfs://other"),
    ).to.be.revertedWith("not creator");
  });

  it("stores recipientPubkey + emits donor notes in Donated events", async () => {
    const fakePubkey = "0xdeadbeef".padEnd(66, "0") as `0x${string}`;
    const campaign = await newCampaign({ recipientPubkey: fakePubkey });
    const campaignAddr = await campaign.getAddress();
    expect(await campaign.recipientPubkey()).to.eq(fakePubkey);

    await mint(donor, 10_000n);
    await token.connect(donor).setOperator(campaignAddr, FAR_FUTURE);

    const donateEnc = await fhevm
      .createEncryptedInput(campaignAddr, donor.address)
      .add64(100n)
      .encrypt();
    const sealedNote = "0xa1b2c3d4";
    const donateTx = await campaign
      .connect(donor)
      .donate(donateEnc.handles[0], donateEnc.inputProof, sealedNote);
    const donateReceipt = await donateTx.wait();
    const donatedLog = donateReceipt.logs.find(
      (l: any) => l.fragment?.name === "Donated",
    );
    expect(donatedLog.args.note).to.eq(sealedNote);
  });

  it("anyone can vouch; vouches accumulate", async () => {
    const campaign = await newCampaign();

    await campaign.connect(donor).vouch("ipfs://Qm.../voucher-1.json");
    await campaign.connect(beneficiary).vouch("ipfs://Qm.../voucher-2.json");

    expect(await campaign.vouchersCount()).to.eq(2n);
    const v0 = await campaign.vouchers(0);
    expect(v0.attester).to.eq(donor.address);
    expect(v0.cid).to.eq("ipfs://Qm.../voucher-1.json");
  });

  it("only the public beneficiary can withdraw", async () => {
    const campaign = await newCampaign({ goal: 100n });

    // Non-beneficiary attempts revert with the public require.
    await expect(campaign.connect(donor).withdraw()).to.be.revertedWith("not beneficiary");
    await expect(campaign.connect(creator).withdraw()).to.be.revertedWith("not beneficiary");

    // Beneficiary can call, but with no donations there's nothing to withdraw.
    await expect(campaign.connect(beneficiary).withdraw()).to.be.revertedWith("no donations");
  });

  it("creator can close the campaign; donations revert after close", async () => {
    const campaign = await newCampaign();
    const campaignAddr = await campaign.getAddress();

    expect(await campaign.closed()).to.eq(false);
    await expect(campaign.connect(donor).close()).to.be.revertedWith("not creator");

    await expect(campaign.connect(creator).close())
      .to.emit(campaign, "Closed")
      .withArgs(creator.address, anyUint());
    expect(await campaign.closed()).to.eq(true);
    expect(await campaign.closedAt()).to.be.gt(0n);

    await expect(campaign.connect(creator).close()).to.be.revertedWith("already closed");

    await mint(donor, 10_000n);
    await token.connect(donor).setOperator(campaignAddr, FAR_FUTURE);
    const donateEnc = await fhevm
      .createEncryptedInput(campaignAddr, donor.address)
      .add64(100n)
      .encrypt();
    await expect(
      campaign
        .connect(donor)
        .donate(donateEnc.handles[0], donateEnc.inputProof, "0x"),
    ).to.be.revertedWith("campaign closed");
  });
});

function anyUint() {
  return (v: any) => typeof v === "bigint" && v > 0n;
}
