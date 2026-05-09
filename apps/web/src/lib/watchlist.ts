"use client";

const KEY = "cgfm:inbox-watchlist-v1";

export function readWatchlist(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is `0x${string}` => typeof x === "string" && x.startsWith("0x"));
  } catch {
    return [];
  }
}

export function watchCampaign(addr: `0x${string}`): void {
  if (typeof window === "undefined") return;
  const list = readWatchlist();
  const lower = addr.toLowerCase();
  if (list.some((x) => x.toLowerCase() === lower)) return;
  localStorage.setItem(KEY, JSON.stringify([...list, addr]));
}

export function unwatchCampaign(addr: `0x${string}`): void {
  if (typeof window === "undefined") return;
  const list = readWatchlist().filter((x) => x.toLowerCase() !== addr.toLowerCase());
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function isWatching(addr: `0x${string}`): boolean {
  return readWatchlist().some((x) => x.toLowerCase() === addr.toLowerCase());
}
