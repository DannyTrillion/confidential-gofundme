"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionMarker } from "@/components/section-marker";
import {
  type EncKeypair,
  getOrCreateEncKeypair,
  importEncKeypair,
  readEncKeypair,
  regenerateEncKeypair,
} from "@/lib/crypto";

export default function SetupPage() {
  const [pair, setPair] = useState<EncKeypair | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPair(readEncKeypair());
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const next = await getOrCreateEncKeypair();
      setPair(next);
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true);
    setConfirming(false);
    try {
      const next = await regenerateEncKeypair();
      setPair(next);
    } finally {
      setBusy(false);
    }
  }

  function copyPubkey() {
    if (!pair) return;
    navigator.clipboard.writeText(pair.publicKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function downloadBackup() {
    if (!pair) return;
    const json = JSON.stringify(
      { schema: "privacyfundme/keypair@1", ...pair },
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `confidential-gofundme-keypair-${pair.publicKey.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function importFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (
        typeof parsed.publicKey !== "string" ||
        typeof parsed.privateKey !== "string" ||
        parsed.publicKey.length !== 64 ||
        parsed.privateKey.length !== 64
      ) {
        throw new Error("not a valid keypair backup");
      }
      importEncKeypair({ publicKey: parsed.publicKey, privateKey: parsed.privateKey });
      setPair({ publicKey: parsed.publicKey, privateKey: parsed.privateKey });
    } catch (err: any) {
      setImportError(err?.message ?? String(err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-12">
      <div className="space-y-5">
        <SectionMarker label="setup · encryption keys" />
        <h1 className="max-w-3xl text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          Set up your private mailbox.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Donors can attach a sealed message to each donation — only you can read it.
          Generate a keypair below. Share the <strong className="text-foreground">public</strong>{" "}
          key with anyone fundraising on your behalf so they can paste it into their campaign.
          Keep the <strong className="text-foreground">private</strong> key safe — without it,
          past messages become unreadable.
        </p>
      </div>

      {!pair ? (
        <div className="border border-border bg-card/40 p-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
            No keypair on this device
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate one now. The keys are stored only in your browser.
          </p>
          <div className="mt-5">
            <Button onClick={generate} disabled={busy}>
              {busy ? "Generating…" : "Generate keypair →"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Public key */}
          <div className="border border-border bg-card/40 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
                Your public key
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                share with creators
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Paste this into the &quot;Recipient encryption pubkey&quot; field on the create-campaign form.
            </p>
            <div className="mt-4 break-all border border-border bg-background/40 p-4 font-mono text-[11px] leading-relaxed text-foreground">
              {pair.publicKey}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={copyPubkey}>
                {copied ? "Copied ✓" : "Copy public key"}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/create">Use in /create →</Link>
              </Button>
            </div>
          </div>

          {/* Private key (backup) */}
          <div className="border border-border bg-card/40 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-tight">
                Your private key
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                keep secret
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Anyone with this key can read every sealed message addressed to you. Download the
              backup and store it offline — without it, you lose access to past messages.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={downloadBackup} size="sm">
                Download backup (.json)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? "Importing…" : "Import backup"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={importFromFile}
              />
            </div>
            {importError && (
              <p className="mt-3 font-mono text-xs text-destructive">// {importError}</p>
            )}
          </div>

          {/* Danger zone */}
          <div className="border border-destructive/40 bg-destructive/5 p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-tight text-destructive">
              Danger zone
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Generating a fresh keypair destroys the existing private key. Any messages addressed
              to your old public key become unreadable forever.
            </p>
            {!confirming ? (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
                  Reset keypair…
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="destructive" size="sm" onClick={regenerate} disabled={busy}>
                  {busy ? "Resetting…" : "Yes, replace it"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
