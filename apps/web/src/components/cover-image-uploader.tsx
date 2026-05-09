"use client";

import { useState } from "react";
import { pinCoverImage } from "@/app/actions";
import { gatewayUrl } from "@/lib/ipfs-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CoverImage } from "@/components/cover-image";

export function CoverImageUploader({
  onChange,
  disabled,
}: {
  onChange: (cid: string | undefined) => void;
  disabled?: boolean;
}) {
  const [cid, setCid] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // local preview while we upload
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const newCid = await pinCoverImage(fd);
      setCid(newCid);
      onChange(newCid);
      setPreviewUrl(gatewayUrl(newCid));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setCid(undefined);
      onChange(undefined);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setCid(undefined);
    setPreviewUrl(undefined);
    onChange(undefined);
  }

  return (
    <div className="space-y-2">
      <Label>Cover image (optional)</Label>
      {previewUrl ? (
        <div className="space-y-2">
          <CoverImage src={previewUrl} alt="cover preview" />
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {busy ? (
              <span className="text-primary">// pinning to ipfs…</span>
            ) : cid ? (
              <span className="text-primary">// pinned · {cid.slice(0, 12)}…</span>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled || busy}>
              remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 border border-dashed border-border bg-card/40 p-4">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={disabled || busy}
            onChange={onFile}
            className="block w-full font-mono text-[11px] file:mr-3 file:cursor-pointer file:border file:border-primary file:bg-primary file:px-3 file:py-1 file:font-mono file:text-[10px] file:uppercase file:tracking-widest file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>
      )}
      {error && <p className="font-mono text-xs text-destructive">// {error}</p>}
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
        // pinned to ipfs · shown on browse + campaign page
      </p>
    </div>
  );
}
