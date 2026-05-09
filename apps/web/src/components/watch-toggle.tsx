"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isWatching, unwatchCampaign, watchCampaign } from "@/lib/watchlist";

export function WatchToggle({ campaignAddress }: { campaignAddress: `0x${string}` }) {
  const [watching, setWatching] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWatching(isWatching(campaignAddress));
    setMounted(true);
  }, [campaignAddress]);

  function toggle() {
    if (watching) {
      unwatchCampaign(campaignAddress);
      setWatching(false);
    } else {
      watchCampaign(campaignAddress);
      setWatching(true);
    }
  }

  if (!mounted) return null;

  return (
    <Button variant="outline" size="sm" onClick={toggle} className="w-full">
      {watching ? "Watching · in inbox ✓" : "+ Watch as recipient"}
    </Button>
  );
}
