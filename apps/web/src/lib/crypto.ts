"use client";

import { x25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

/// X25519 + AES-GCM helpers used for sealing donor → recipient messages
/// (Phase 2). Story encryption (AES-GCM with URL-fragment keys) was removed
/// in v2: stories are now public, so donors can read what they're funding.

const KEYPAIR_LS_KEY = "cgfm:enc-keypair-v1";

export type EncKeypair = { publicKey: string; privateKey: string };

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function getOrCreateEncKeypair(): Promise<EncKeypair> {
  if (typeof window === "undefined") throw new Error("client only");
  const existing = localStorage.getItem(KEYPAIR_LS_KEY);
  if (existing) return JSON.parse(existing) as EncKeypair;
  const priv = x25519.utils.randomPrivateKey();
  const pub = x25519.getPublicKey(priv);
  const pair: EncKeypair = { publicKey: bytesToHex(pub), privateKey: bytesToHex(priv) };
  localStorage.setItem(KEYPAIR_LS_KEY, JSON.stringify(pair));
  return pair;
}

/// Read the existing keypair without creating one. Returns null if absent.
export function readEncKeypair(): EncKeypair | null {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(KEYPAIR_LS_KEY);
  return existing ? (JSON.parse(existing) as EncKeypair) : null;
}

/// Replace the stored keypair with a freshly generated one. Returns the new pair.
/// Old privkey is destroyed — past sealed notes become unreadable.
export async function regenerateEncKeypair(): Promise<EncKeypair> {
  if (typeof window === "undefined") throw new Error("client only");
  const priv = x25519.utils.randomPrivateKey();
  const pub = x25519.getPublicKey(priv);
  const pair: EncKeypair = { publicKey: bytesToHex(pub), privateKey: bytesToHex(priv) };
  localStorage.setItem(KEYPAIR_LS_KEY, JSON.stringify(pair));
  return pair;
}

/// Replace the stored keypair from an imported backup (e.g. paste/upload).
export function importEncKeypair(pair: EncKeypair): void {
  if (typeof window === "undefined") throw new Error("client only");
  localStorage.setItem(KEYPAIR_LS_KEY, JSON.stringify(pair));
}

async function aesGcmEncrypt(keyBytes: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext as BufferSource),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

async function aesGcmDecrypt(keyBytes: Uint8Array, ivAndCt: Uint8Array): Promise<Uint8Array> {
  const iv = ivAndCt.slice(0, 12);
  const ct = ivAndCt.slice(12);
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, "AES-GCM", false, ["decrypt"]);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource),
  );
}

/// Sealed box for donor notes (Phase 2):
///   ephemeralPub(32) || iv(12) || ciphertext
export async function sealTo(recipientPubHex: string, payloadUtf8: string): Promise<Uint8Array> {
  const recipientPub = hexToBytes(recipientPubHex);
  const ephPriv = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephPriv);
  const shared = x25519.getSharedSecret(ephPriv, recipientPub);
  const aesKey = sha256(shared);
  const sealed = await aesGcmEncrypt(aesKey, new TextEncoder().encode(payloadUtf8));
  const out = new Uint8Array(ephPub.length + sealed.length);
  out.set(ephPub, 0);
  out.set(sealed, ephPub.length);
  return out;
}

export async function openSealed(blob: Uint8Array, kp: EncKeypair): Promise<string> {
  const ephPub = blob.slice(0, 32);
  const rest = blob.slice(32);
  const shared = x25519.getSharedSecret(hexToBytes(kp.privateKey), ephPub);
  const aesKey = sha256(shared);
  const pt = await aesGcmDecrypt(aesKey, rest);
  return new TextDecoder().decode(pt);
}

export function bytesToHexStr(b: Uint8Array): string {
  return "0x" + bytesToHex(b);
}
