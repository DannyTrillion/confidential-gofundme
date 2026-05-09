/// Returns a same-origin proxy URL that fetches IPFS content via our own
/// `/api/ipfs/[cid]` route. The proxy tries the configured Pinata gateway
/// first, then falls through to public gateways — bypassing the CORS issue
/// on `gateway.pinata.cloud` for newly-pinned (uncached) content.
export function gatewayUrl(cid: string): string {
  const clean = cid.replace(/^ipfs:\/\//, "");
  return `/api/ipfs/${encodeURIComponent(clean)}`;
}
