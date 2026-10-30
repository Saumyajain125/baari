"use client";

import { useEffect, useRef } from "react";

export interface IdleLockOptions {
  /** Idle time before onIdle fires; 0 or less turns the lock off. */
  minutes: number;
  /** False while already locked (or before the desk is ready): no timer runs. */
  enabled: boolean;
  onIdle(): void;
  /**
   * localStorage key shared by every tab of the same desk. Activity in any of
   * them keeps all of them awake, so a forgotten background tab can't lock
   * (through the shared lock state) the tab someone is working in.
   */
  sharedActivityKey?: string;
}

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;

/** Activity is shared at most this often; the idle limit is minutes, so a few seconds' lag is harmless. */
const SHARE_EVERY_MS = 5000;

function readShared(key: string | undefined): number {
  if (!key) return 0;
  try {
    const value = Number(window.localStorage.getItem(key));
    // A stamp from the future (the clock was set back) would keep every tab awake for that long.
    return Number.isFinite(value) && value <= Date.now() ? value : 0;
  } catch {
    return 0;
  }
}

function writeShared(key: string, at: number): void {
  try {
    window.localStorage.setItem(key, String(at));
  } catch {
    // Storage blocked: this tab's own timer still works.
  }
}

/**
 * Calls onIdle once nobody has touched, clicked or typed for `minutes`.
 * Activity only stamps a time; one timer re-checks at the deadline, so a
 * stream of pointermoves costs nothing. Browsers throttle timers on hidden
 * pages, so when the page becomes visible again an overdue deadline locks
 * straight away; otherwise coming back counts as activity.
 */
export function useIdleLock({ minutes, enabled, onIdle, sharedActivityKey }: IdleLockOptions): void {
  // Latest callback without restarting the countdown on every render.
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  });

  useEffect(() => {
    if (!enabled || !(minutes > 0)) return;
    const limitMs = minutes * 60_000;
    let lastActivity = Date.now();
    let lastShared = 0;
    let fired = false;
    let timer: number | undefined;

    /** Latest activity in this tab or, with a shared key, any tab of the desk. */
    function latestActivity() {
      return Math.max(lastActivity, readShared(sharedActivityKey));
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, Math.max(0, latestActivity() + limitMs - Date.now()));
    }

    function check() {
      if (Date.now() - latestActivity() < limitMs) {
        schedule();
        return;
      }
      fired = true;
      onIdleRef.current();
    }

    function markActive() {
      lastActivity = Date.now();
      if (sharedActivityKey && lastActivity - lastShared >= SHARE_EVERY_MS) {
        lastShared = lastActivity;
        writeShared(sharedActivityKey, lastActivity);
      }
      // After firing no timer is pending; activity (if the caller kept us enabled) starts a new countdown.
      if (fired) {
        fired = false;
        schedule();
      }
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible" || fired) return;
      if (Date.now() - latestActivity() >= limitMs) {
        window.clearTimeout(timer);
        check();
      } else {
        markActive();
      }
    }

    const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, markActive, listenerOptions);
    document.addEventListener("visibilitychange", handleVisibility);
    schedule();

    return () => {
      window.clearTimeout(timer);
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, markActive, listenerOptions);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, minutes, sharedActivityKey]);
}
