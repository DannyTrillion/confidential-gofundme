import { CreateCampaignForm } from "@/components/create-campaign-form";
import { SectionMarker } from "@/components/section-marker";
import { WalletGate } from "@/components/wallet-gate";

export default function CreatePage() {
  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="new campaign" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Tell your story.<br />
          <span className="text-primary">Keep the donations private.</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Your story, your goal, and the recipient wallet are all public so donors can verify
          what they&apos;re supporting. What stays private: each individual donation amount,
          encrypted on the donor&apos;s device before it leaves.
        </p>
      </div>

      <WalletGate
        title="Connect your wallet to launch a campaign"
        description="You need a connected wallet on Sepolia to deploy a campaign contract."
      >
        <CreateCampaignForm />
      </WalletGate>
    </div>
  );
}
