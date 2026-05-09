import { DEPLOYMENTS } from "@/lib/contracts";
import type { CategoryId } from "@/lib/categories";

export const DEMO_MODE = DEPLOYMENTS.factory === "0x0000000000000000000000000000000000000000";

export type MockUpdate = { postedAt: number; body: string };
export type MockVoucher = { address: `0x${string}`; name: string; message: string; attestedAt: number };

export type MockCampaign = {
  address: `0x${string}`;
  title: string;
  pseudonym: string;
  category: CategoryId;
  donors: number;
  goalUsd: number;
  raisedUsd: number;
  /// SVG-as-data-uri so we don't need a real CDN in demo mode
  coverDataUri?: string;
  story: string;
  updates: MockUpdate[];
  vouchers: MockVoucher[];
  /// Curve25519 pubkey hex (32 bytes / 64 chars). Empty string = donor notes disabled.
  recipientPubkey: string;
};

function makeCover(label: string, hue = 49): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 320' width='800' height='320'>
  <defs>
    <pattern id='g' width='40' height='40' patternUnits='userSpaceOnUse'>
      <path d='M 40 0 L 0 0 0 40' fill='none' stroke='hsla(${hue}, 100%, 50%, 0.12)' stroke-width='1'/>
    </pattern>
  </defs>
  <rect width='800' height='320' fill='hsl(180, 67%, 4%)'/>
  <rect width='800' height='320' fill='url(#g)'/>
  <rect x='40' y='40' width='720' height='240' fill='none' stroke='hsla(${hue}, 100%, 50%, 0.55)' stroke-width='1.5'/>
  <text x='60' y='280' font-family='ui-monospace, monospace' font-size='12' fill='hsla(${hue}, 100%, 50%, 0.7)' letter-spacing='2'>// ${label.toUpperCase()}</text>
  <circle cx='400' cy='160' r='40' fill='none' stroke='hsla(${hue}, 100%, 50%, 0.7)' stroke-width='1.5'/>
  <circle cx='400' cy='160' r='6' fill='hsla(${hue}, 100%, 50%, 1)'/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MOCK_CAMPAIGNS: MockCampaign[] = [
  {
    address: "0x7f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90",
    title: "Cancer treatment fund",
    pseudonym: "A.O.",
    category: 0,
    donors: 47,
    goalUsd: 8_500,
    raisedUsd: 5_100,
    coverDataUri: makeCover("medical · stage-2"),
    story:
      "## What I'm raising for\n\nI was diagnosed with **stage-2 cervical cancer** in November. The treatment plan includes six chemotherapy cycles and follow-up radiation.\n\nMy family has covered the first two cycles by selling our generator and most of my mother's jewelry, but we cannot pay for what comes next.\n\n## How the funds will be used\n\n- 4 remaining chemotherapy cycles · ~$4,800\n- Medication between cycles · ~$2,200\n- Travel + accommodation for treatments · ~$1,500\n\nAnything you can give will go directly to the hospital — my sister holds the receipts and will share them on request.\n\nThank you for reading.",
    updates: [
      {
        postedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        body: "**Update 1 — first chemo since the campaign.**\n\nThe oncology team started cycle 3 on Tuesday. The fundraising covered all of it. Side effects have been manageable so far. Thank you to everyone who has given.",
      },
      {
        postedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        body: "Cycle 3 receipts are with my sister. She'll share them with anyone who emails her directly. Heading into cycle 4 next week.",
      },
    ],
    vouchers: [
      {
        address: "0x1234567890123456789012345678901234567890",
        name: "Dr. F. Adeyemi (oncology)",
        message: "Confirming this patient is in active treatment under my care. Receipts on request.",
        attestedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
      },
      {
        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        name: "Sister (guardian)",
        message: "I'm her elder sister. Holding the bank receipts and willing to walk anyone through them.",
        attestedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
      },
    ],
    recipientPubkey: "a1b2c3d4e5f6071829304a5b6c7d8e9f0011223344556677889900aabbccddee",
  },
  {
    address: "0x4b2a8c9d1e3f5a7b6c8d9e0f1a2b3c4d5e6f7080",
    title: "Safe-house relocation",
    pseudonym: "K.",
    category: 1,
    donors: 12,
    goalUsd: 3_200,
    raisedUsd: 960,
    coverDataUri: makeCover("safety · relocation"),
    story:
      "I left an unsafe situation two weeks ago and am staying with a friend. I need:\n\n- First month's rent + deposit on a small apartment\n- A phone with a different number\n- Basic furniture\n\nI cannot return to my old life. **Individual donation amounts stay encrypted on this platform** — that's why I'm asking here instead of anywhere else.",
    updates: [],
    vouchers: [
      {
        address: "0xfeedfacefeedfacefeedfacefeedfacefeedfac0",
        name: "Survivor advocacy network",
        message: "K. is a verified survivor in our case-management program. We are coordinating her relocation.",
        attestedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
      },
    ],
    recipientPubkey: "b2c3d4e5f6071829304a5b6c7d8e9f0011223344556677889900aabbccddeef1",
  },
  {
    address: "0x9e1d3c5b7a8f6e4d2c1b0a9f8e7d6c5b4a3f2e10",
    title: "School fees — final term",
    pseudonym: "Mr. O.",
    category: 2,
    donors: 89,
    goalUsd: 1_800,
    raisedUsd: 1_800,
    coverDataUri: makeCover("education · funded"),
    story:
      "**Goal reached — thank you.**\n\nThe funds have been transferred directly to the school. This page stays up so any donor who wants to verify the campaign can read the full story.",
    updates: [
      {
        postedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
        body: "Final term receipt attached on request. The kids are back in school next week. Thank you all.",
      },
    ],
    vouchers: [],
    recipientPubkey: "c3d4e5f6071829304a5b6c7d8e9f0011223344556677889900aabbccddeef1a2",
  },
  {
    address: "0x2c4e6a8b0d1f3e5c7a9b1d3f5e7a9c1b3d5f7a90",
    title: "Father's heart surgery",
    pseudonym: "Anonymous",
    category: 0,
    donors: 23,
    goalUsd: 12_000,
    raisedUsd: 840,
    coverDataUri: makeCover("medical · cardiac"),
    story:
      "My father is scheduled for **cardiac valve surgery**. The deposit is due in three weeks.\n\nI'm not naming him publicly — he is a quiet person and would not want to be the subject of a fundraiser. Donations of any size help.",
    updates: [],
    vouchers: [],
    recipientPubkey: "", // donor-note feature disabled for this campaign
  },
];

export function findMockCampaign(addr: string): MockCampaign | undefined {
  return MOCK_CAMPAIGNS.find((c) => c.address.toLowerCase() === addr.toLowerCase());
}
