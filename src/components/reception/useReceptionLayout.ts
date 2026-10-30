"use client";

import { useSyncExternalStore } from "react";

export type ReceptionLayout = "phone" | "tablet" | "laptop";

/** Phone below 768px, tablet up to 1279px, laptop from 1280px. */
const TABLET_QUERY = "(min-width: 768px)";
const LAPTOP_QUERY = "(min-width: 1280px)";

function subscribe(onChange: () => void): () => void {
  const lists = [TABLET_QUERY, LAPTOP_QUERY].map((q) => window.matchMedia(q));
  for (const l of lists) l.addEventListener("change", onChange);
  return () => {
    for (const l of lists) l.removeEventListener("change", onChange);
  };
}

function current(): ReceptionLayout {
  if (window.matchMedia(LAPTOP_QUERY).matches) return "laptop";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
  return "phone";
}

/**
 * Which reception layout fits the viewport. Read synchronously on the client
 * (unlike useMediaQuery, which starts false), so a tablet never flashes the
 * phone layout on mount. Null during server rendering.
 */
export function useReceptionLayout(): ReceptionLayout | null {
  return useSyncExternalStore(subscribe, current, () => null);
}
