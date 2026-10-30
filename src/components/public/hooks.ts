"use client";

import { useEffect, useSyncExternalStore } from "react";
import { joinPath } from "./ui";

const noopSubscribe = () => () => {};

/** This site's origin in the browser; null during SSR and hydration. */
export function useOrigin(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => null,
  );
}

/** Absolute join URL for QR codes, once the origin is known. */
export function useJoinUrl(clinicId: string): string | null {
  const origin = useOrigin();
  return origin ? `${origin}${joinPath(clinicId)}` : null;
}

/**
 * Keeps the screen awake while mounted (TV display, doctor's button). The
 * browser drops the lock whenever the tab is hidden, so it's re-taken on return.
 */
export function useWakeLock(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    async function request() {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) sentinel = next;
        else void next.release();
      } catch {
        // Denied (battery saver, unsupported context): the page still works.
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void request();
    }

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, [enabled]);
}
