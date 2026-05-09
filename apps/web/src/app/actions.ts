"use server";

import { pinBlob, pinJson } from "@/lib/ipfs";

/// Read PINATA_JWT lazily (per-call) so a freshly-set Vercel env var is
/// picked up without a rebuild. Module-level caching of process.env can
/// stick to the build-time value in some serverless runtimes.
function pinataConfigured(): boolean {
  return !!process.env.PINATA_JWT;
}

function pinataNotConfiguredError(): Error {
  return new Error(
    "IPFS pinning is not configured (PINATA_JWT missing on the server). " +
      "Without this, the campaign metadata can't be saved and your story would never load. " +
      "Ask the operator to set PINATA_JWT and redeploy.",
  );
}

export async function pinStory(input: {
  title: string;
  pseudonym?: string;
  story: string;
  category: number;
  coverCid?: string;
  createdAt: number;
}): Promise<string> {
  if (!pinataConfigured()) throw pinataNotConfiguredError();
  return pinJson({
    schema: "privacyfundme/story@3",
    title: input.title,
    pseudonym: input.pseudonym ?? null,
    story: input.story,
    category: input.category,
    coverCid: input.coverCid ?? null,
    createdAt: input.createdAt,
  });
}

export async function pinUpdate(input: {
  body: string;
  postedAt: number;
}): Promise<string> {
  if (!pinataConfigured()) throw pinataNotConfiguredError();
  return pinJson({
    schema: "privacyfundme/update@1",
    body: input.body,
    postedAt: input.postedAt,
  });
}

export async function pinVoucher(input: {
  name: string;
  message: string;
  attestedAt: number;
}): Promise<string> {
  if (!pinataConfigured()) throw pinataNotConfiguredError();
  return pinJson({
    schema: "privacyfundme/voucher@1",
    name: input.name,
    message: input.message,
    attestedAt: input.attestedAt,
  });
}

export async function pinCoverImage(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("missing file");
  if (!pinataConfigured()) throw pinataNotConfiguredError();
  const buf = await file.arrayBuffer();
  return pinBlob(file.name || "cover", new Blob([buf], { type: file.type }));
}
