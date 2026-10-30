"use client";

import { use, useState } from "react";
import { previewJoinUrl, previewTv } from "@/components/public/fixtures";
import { TvDisplay } from "@/components/public/tv/TvDisplay";

/**
 * TV display with design data, at 1920×1080 or 1280×720.
 * `?doctors=1..4`, `?paused=1` and `?flash=1` show the other states.
 */
export default function TvPreview({
  searchParams,
}: {
  searchParams: Promise<{ doctors?: string; paused?: string; flash?: string }>;
}) {
  const params = use(searchParams);
  const [soundOn, setSoundOn] = useState(false);
  const view = previewTv(Number(params.doctors ?? 2), params.paused === "1");
  const first = view.doctors[0];
  const flashing = params.flash === "1" && first.callKey != null ? { [first.id]: first.callKey } : {};
  return (
    <TvDisplay
      view={view}
      joinUrl={previewJoinUrl}
      flashing={flashing}
      sound={{ on: soundOn, onToggle: () => setSoundOn((on) => !on) }}
      onFullscreen={() => void document.documentElement.requestFullscreen?.().catch(() => {})}
    />
  );
}
