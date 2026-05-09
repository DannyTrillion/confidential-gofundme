import { NextRequest, NextResponse } from "next/server";

const PUBLIC_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { cid: string } },
) {
  const cid = params.cid?.replace(/^ipfs:\/\//, "");
  if (!cid) {
    return new NextResponse("missing cid", { status: 400 });
  }

  const configured = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
  const candidates = [
    ...(configured ? [configured.endsWith("/") ? configured : configured + "/"] : []),
    ...PUBLIC_GATEWAYS,
  ];

  let lastErr: string | undefined;
  for (const base of candidates) {
    try {
      const r = await fetch(`${base.replace(/\/$/, "")}/${cid}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        const ct = r.headers.get("content-type") ?? "application/octet-stream";
        return new NextResponse(buf, {
          status: 200,
          headers: {
            "content-type": ct,
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      }
      lastErr = `${base} → ${r.status}`;
    } catch (e: any) {
      lastErr = `${base} → ${e?.message ?? String(e)}`;
    }
  }
  return new NextResponse(`all gateways failed: ${lastErr ?? "unknown"}`, { status: 502 });
}
