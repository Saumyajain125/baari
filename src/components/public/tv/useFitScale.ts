"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/**
 * Scale that fits a fixed `width`×`height` stage inside the window (letterboxed),
 * so the TV is laid out once at 1920×1080 and lands exactly on 1280×720 and
 * every other screen. Null during SSR, before the window size is known.
 */
export function useFitScale(width: number, height: number): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.min(window.innerWidth / width, window.innerHeight / height),
    () => null,
  );
}
