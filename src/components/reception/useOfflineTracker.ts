"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { waitForPendingWrites } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useConnectivity } from "@/lib/hooks";
import { formatElapsed } from "@/lib/time";

/**
 * Snapshots served only from the local cache for this long mean Firestore
 * can't reach the server even though the browser reports a connection
 * (captive Wi-Fi, dead uplink). Shorter blips, like the cache-first snapshot
 * on page load, don't count.
 */
const CACHE_ONLY_GRACE_MS = 5000;

export interface OfflineView {
  /** Time since the connection dropped, "1:24". */
  offlineFor: string;
  /** Desk actions taken while offline that haven't reached the server yet. */
  pendingCount: number;
}

export interface OfflineTracker {
  /** Banner data while offline, null when online. */
  offline: OfflineView | null;
  /** Call after every desk write; it only counts while offline. */
  recordAction(): void;
}

/**
 * Drives the OfflineBanner. The tap count survives reconnecting until every
 * queued write has been acknowledged by the server, so a second drop before
 * the sync finishes keeps counting from where it left off.
 */
export function useOfflineTracker(fromCache: boolean, now: number): OfflineTracker {
  const { online, offlineSince } = useConnectivity();

  const [cacheSince, setCacheSince] = useState<number | null>(null);
  useEffect(() => setCacheSince(fromCache ? Date.now() : null), [fromCache]);

  const cacheOnly = cacheSince !== null && now - cacheSince >= CACHE_ONLY_GRACE_MS;
  const isOffline = !online || cacheOnly;

  let since: number | null = online ? null : offlineSince;
  if (cacheOnly && (since === null || cacheSince < since)) since = cacheSince;

  const [taps, setTaps] = useState(0);
  const offlineRef = useRef(isOffline);
  useEffect(() => {
    offlineRef.current = isOffline;
  });

  const recordAction = useCallback(() => {
    if (offlineRef.current || !navigator.onLine) setTaps((n) => n + 1);
  }, []);

  useEffect(() => {
    if (isOffline || taps === 0) return;
    let cancelled = false;
    waitForPendingWrites(getDb()).then(
      () => {
        if (!cancelled) setTaps(0);
      },
      // Rejected only when the signed-in user changes; the desk unmounts then anyway.
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [isOffline, taps]);

  return {
    offline: isOffline ? { offlineFor: formatElapsed(now - (since ?? now)), pendingCount: taps } : null,
    recordAction,
  };
}
