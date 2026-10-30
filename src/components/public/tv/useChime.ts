"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREF_KEY = "baari:tv:sound";

function readPref(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the switch just won't be remembered.
  }
}

export interface Chime {
  /** Sound is allowed and the audio context is running. */
  on: boolean;
  /** Must run from a click or key press: browsers block audio until then. */
  enable(): Promise<void>;
  disable(): void;
  /** Two soft "ding-dong" notes. No-op while sound is off. */
  play(): void;
}

/**
 * Optional call chime for the TV, synthesised with WebAudio so there's no
 * audio file to load. The choice is remembered; because browsers only start
 * audio after a user gesture, a remembered "on" resumes on the first tap or key.
 */
export function useChime(): Chime {
  const ctxRef = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);

  const enable = useCallback(async () => {
    const ctx = (ctxRef.current ??= new AudioContext());
    try {
      await ctx.resume();
    } catch {
      // Still blocked: stays off until the next gesture.
    }
    const running = ctx.state === "running";
    setOn(running);
    if (running) writePref(true);
  }, []);

  const disable = useCallback(() => {
    writePref(false);
    setOn(false);
    void ctxRef.current?.suspend();
  }, []);

  const play = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== "running") return;
    const t0 = ctx.currentTime + 0.05;
    const notes: [frequency: number, offset: number][] = [
      [880, 0],
      [659.25, 0.45],
    ];
    for (const [frequency, offset] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const start = t0 + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.25);
    }
  }, []);

  // A remembered "on" resumes with the first interaction on the page.
  useEffect(() => {
    if (!readPref()) return;
    const resume = () => void enable();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [enable]);

  useEffect(
    () => () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  return { on, enable, disable, play };
}
