import type { Metadata } from "next";
import { Michroma } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { Providers } from "./providers";
import { ConnectWallet } from "@/components/connect-wallet";
import { DemoBanner } from "@/components/demo-banner";
import { Logo } from "@/components/logo";
import { ScanOverlay } from "@/components/scan-overlay";
import "./globals.css";

// Headlines + section headers — Michroma (futurist geometric mono, all-caps).
const display = Michroma({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://confidential-gofundme.vercel.app";
const SITE_NAME = "Confidential GoFundMe";
const TAGLINE = "Public causes. Private donations. Encrypted on-chain.";
const DESCRIPTION =
  "Global crowdfunding where every individual donation amount is encrypted on-chain using Zama FHE. Causes, goals, and recipient wallets are public — donor amounts stay sealed. No leaderboard, no platform fee.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Zama",
    "FHE",
    "fhEVM",
    "fully homomorphic encryption",
    "confidential",
    "crowdfunding",
    "GoFundMe",
    "Ethereum",
    "Sepolia",
    "ERC-7984",
    "private donations",
    "encrypted donations",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistMono.variable} ${display.variable} dark`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <ScanOverlay />
          <DemoBanner />
          <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
            <div className="container flex h-14 items-center justify-between gap-3">
              <Link href="/" aria-label="Confidential GoFundMe home" className="transition-opacity hover:opacity-80">
                <Logo markClassName="text-primary" textClassName="text-foreground" />
              </Link>
              <nav className="hidden items-center gap-7 font-mono text-xs uppercase tracking-wider md:flex">
                <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
                  Browse
                </Link>
                <Link href="/create" className="text-muted-foreground transition-colors hover:text-foreground">
                  Create
                </Link>
                <Link href="/me" className="text-muted-foreground transition-colors hover:text-foreground">
                  Mine
                </Link>
                <Link href="/wallet" className="text-muted-foreground transition-colors hover:text-foreground">
                  Wallet
                </Link>
                <Link href="/inbox" className="text-muted-foreground transition-colors hover:text-foreground">
                  Inbox
                </Link>
                <Link href="/guardian" className="text-muted-foreground transition-colors hover:text-foreground">
                  Vouch
                </Link>
                <Link href="/faucet" className="text-muted-foreground transition-colors hover:text-foreground">
                  Test funds
                </Link>
              </nav>
              <ConnectWallet />
            </div>
          </header>
          <main className="container py-8 sm:py-10 md:py-12">{children}</main>
          <footer className="mt-24 border-t border-border">
            <div className="container flex flex-col gap-3 py-8 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:flex-row sm:justify-between">
              <span>// Privacy powered by Zama FHE</span>
              <span>// No platform fee · only network costs</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
