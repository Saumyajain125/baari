"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * The visitor's "reduce motion" setting, safe to branch markup on: it reads
 * false while hydrating (matching the server HTML), then the real value, and
 * follows the setting if it changes. Motion's own useReducedMotion reads the
 * real value on the first client render, which can mismatch the server HTML.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
