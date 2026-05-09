import { ImageResponse } from "next/og";
import { findMockCampaign } from "@/lib/demo";
import { CATEGORIES } from "@/lib/categories";

export const runtime = "edge";
export const alt = "Confidential GoFundMe campaign";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#FFDA00";
const BG = "#000202";
const FG = "#F5F5F5";
const MUTED = "rgba(245,245,245,0.55)";

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function shortAddress(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export default async function Image({ params }: { params: { address: string } }) {
  const addr = params.address;

  // Try the local mock first (works in demo and dev). A future enhancement
  // can fetch live data from IPFS / RPC server-side for unknown addresses.
  const mock = findMockCampaign(addr);
  const title = mock?.title ?? "Confidential GoFundMe campaign";
  const pseudonym = mock?.pseudonym ?? "—";
  const goalUsd = mock?.goalUsd ?? 0;
  const raisedUsd = mock?.raisedUsd ?? 0;
  const donors = mock?.donors ?? 0;
  const categoryLabel =
    mock !== undefined
      ? CATEGORIES.find((c) => c.id === mock.category)?.label ?? "Other"
      : "Other";
  const pct = goalUsd > 0 ? Math.min(100, Math.round((raisedUsd / goalUsd) * 100)) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: FG,
          padding: "56px 64px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          position: "relative",
        }}
      >
        {/* corner brackets */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            width: 24,
            height: 24,
            borderLeft: `2px solid ${ACCENT}`,
            borderTop: `2px solid ${ACCENT}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            width: 24,
            height: 24,
            borderRight: `2px solid ${ACCENT}`,
            borderTop: `2px solid ${ACCENT}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            width: 24,
            height: 24,
            borderLeft: `2px solid ${ACCENT}`,
            borderBottom: `2px solid ${ACCENT}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 24,
            height: 24,
            borderRight: `2px solid ${ACCENT}`,
            borderBottom: `2px solid ${ACCENT}`,
          }}
        />

        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 18,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 12, height: 12, background: ACCENT }} />
            <div style={{ color: ACCENT, display: "flex" }}>// confidential gofundme</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex" }}>{categoryLabel}</span>
            <span style={{ color: "rgba(245,245,245,0.3)", display: "flex" }}>·</span>
            <span style={{ display: "flex" }}>{`campaign ${shortAddress(addr).toUpperCase()}`}</span>
          </div>
        </div>

        {/* title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 80,
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: FG,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {`${pseudonym} · ${donors} donors`}
          </div>
        </div>

        {/* progress bar */}
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 22,
            }}
          >
            <span style={{ color: ACCENT, fontWeight: 600, display: "flex" }}>{formatUsd(raisedUsd)}</span>
            <span style={{ color: MUTED, display: "flex" }}>{`raised of ${formatUsd(goalUsd)}`}</span>
            <span style={{ color: ACCENT, marginLeft: "auto", fontWeight: 600, display: "flex" }}>{`${pct}%`}</span>
          </div>
          <div
            style={{
              display: "flex",
              height: 16,
              border: `1px solid ${ACCENT}`,
              background: "rgba(255,218,0,0.05)",
            }}
          >
            <div style={{ width: `${pct}%`, height: "100%", background: ACCENT }} />
          </div>
        </div>

        {/* footer privacy claim */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          <span style={{ display: "flex" }}>// public cause · private giving</span>
          <span style={{ color: ACCENT, display: "flex" }}>powered by zama fhe</span>
        </div>
      </div>
    ),
    size,
  );
}
