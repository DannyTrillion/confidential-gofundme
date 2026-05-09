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

  it("creates a campaign; total stays private to beneficiary, buckets are public", async () => {
    const campaign = await newCampaign({ goal: 1000n });
    const campaignAddr = await campaign.getAddress();
    expect(await campaign.goal()).to.eq(1000n);
    expect(await campaign.beneficiary()).to.eq(beneficiary.address);
    expect(await campaign.publicDonorCount()).to.eq(0n);

    // Initial state: beneficiary can decrypt total (= 0), no buckets crossed.
    const initialTotal = await campaign.getEncryptedTotal();
    expect(
      await fhevm.userDecryptEuint(FhevmType.euint64, initialTotal, campaignAddr, beneficiary),
    ).to.eq(0n);

    const [b25, b50, b75, b100] = await campaign.getProgressBuckets();
    expect(await fhevm.publicDecryptEbool(b25)).to.eq(false);
    expect(await fhevm.publicDecryptEbool(b50)).to.eq(false);
    expect(await fhevm.publicDecryptEbool(b75)).to.eq(false);
    expect(await fhevm.publicDecryptEbool(b100)).to.eq(false);

    // Donate 600 (60% of goal) — past25 + past50 should flip true; past75/past100 stay false.
    await mint(donor, 10_000n);
    await token.connect(donor).setOperator(campaignAddr, FAR_FUTURE);

    const donateEnc = await fhevm
      .createEncryptedInput(campaignAddr, donor.address)
      .add64(600n)
      .encrypt();
    await campaign
      .connect(donor)
      .donate(donateEnc.handles[0], donateEnc.inputProof, "0x");

    expect(await campaign.publicDonorCount()).to.eq(1n);

    // Beneficiary decrypts the running total privately.
    const totalHandle = await campaign.getEncryptedTotal();
    expect(
      await fhevm.userDecryptEuint(FhevmType.euint64, totalHandle, campaignAddr, beneficiary),
    ).to.eq(600n);

    // Public bucket flags reflect coarse progress, nothing finer.
    const buckets = await campaign.getProgressBuckets();
    expect(await fhevm.publicDecryptEbool(buckets[0])).to.eq(true);  // past25
    expect(await fhevm.publicDecryptEbool(buckets[1])).to.eq(true);  // past50
    expect(await fhevm.publicDecryptEbool(buckets[2])).to.eq(false); // past75
    expect(await fhevm.publicDecryptEbool(buckets[3])).to.eq(false); // past100
  });

  it("running total is NOT publicly decryptable (privacy guarantee)", async () => {
    const campaign = await newCampaign({ goal: 1000n });
    const campaignAddr = await campaign.getAddress();

    await mint(donor, 5_000n);
    await token.connect(donor).setOperator(campaignAddr, FAR_FUTURE);
    const enc = await fhevm
      .createEncryptedInput(campaignAddr, donor.address)
      .add64(123n)
      .encrypt();
    await campaign.connect(donor).donate(enc.handles[0], enc.inputProof, "0x");

    const totalHandle = await campaign.getEncryptedTotal();
    // Random observer (the donor here) cannot publicly decrypt the total.
    let rejected = false;
    try {
      await fhevm.publicDecryptEuint(FhevmType.euint64, totalHandle);
    } catch {
      rejected = true;
    }
    expect(rejected, "publicDecrypt of _encTotal should be refused").to.eq(true);

    // Also: a non-beneficiary cannot user-decrypt it either.
    let userRejected = false;
    try {
      await fhevm.userDecryptEuint(FhevmType.euint64, totalHandle, campaignAddr, donor);
    } catch {
      userRejected = true;
    }
    expect(userRejected, "non-beneficiary userDecrypt should be refused").to.eq(true);
  });

  it("rejects zero address as beneficiary", async () => {
    await expect(
      newCampaign({ beneficiaryAddr: ethers.ZeroAddress }),
    ).to.be.revertedWith("zero beneficiary");
  });

  it("multiple donations accumulate; buckets transition at the right thresholds", async () => {
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

    async function bucketsAfter() {
      const [b25, b50, b75, b100] = await campaign.getProgressBuckets();
      return [
        await fhevm.publicDecryptEbool(b25),
        await fhevm.publicDecryptEbool(b50),
        await fhevm.publicDecryptEbool(b75),
        await fhevm.publicDecryptEbool(b100),
      ];
    }

    await donate(200n); // total 200 — no buckets crossed (250 = past25 threshold)
    expect(await bucketsAfter()).to.deep.eq([false, false, false, false]);

    await donate(300n); // total 500 — past25 + past50 cross
    expect(await bucketsAfter()).to.deep.eq([true, true, false, false]);

    await donate(450n); // total 950 — past75 crosses (750), past100 still false
    expect(await bucketsAfter()).to.deep.eq([true, true, true, false]);

    expect(await campaign.publicDonorCount()).to.eq(3n);

    // Beneficiary can decrypt the precise running total privately.
    const totalHandle = await campaign.getEncryptedTotal();
    expect(
      await fhevm.userDecryptEuint(FhevmType.euint64, totalHandle, campaignAddr, beneficiary),
    ).to.eq(950n);
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
