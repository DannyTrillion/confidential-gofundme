"use server";

const PINATA_PIN = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";

function jwt() {
  const t = process.env.PINATA_JWT;
  if (!t) throw new Error("PINATA_JWT not configured");
  return t;
}

export async function pinJson(payload: unknown): Promise<string> {
  const res = await fetch(PINATA_PIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt()}`,
    },
    body: JSON.stringify({ pinataContent: payload }),
  });
  if (!res.ok) throw new Error(`Pinata pin failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

export async function pinBlob(name: string, blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, name);
  const res = await fetch(PINATA_FILE, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt()}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`Pinata pin failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

