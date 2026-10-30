"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UndoEntry } from "@/lib/queue/actions";

/** How long an action stays undoable; the queue panel promises "Undo appears for 5 s". */
export const UNDO_WINDOW_MS = 5000;

export interface UndoSlot {
  /** The action on offer, with whole seconds left for the toast ("Undo · 4s"). */
  current: { entry: UndoEntry; secondsLeft: number } | null;
  /** Offers `entry` for undo. A newer action replaces the older one. */
  push(entry: UndoEntry): void;
  /** Takes the entry out of the slot, at most once; null when nothing is undoable. */
  take(): UndoEntry | null;
  /** Withdraws the offer: any entry, or only `entryId` (e.g. its write was refused). */
  dismiss(entryId?: string): void;
}

interface Slot {
  entry: UndoEntry;
  deadline: number;
}

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

/**
 * Single-entry undo slot behind the UndoToast and Ctrl+Z. A ref mirrors the
 * state so `take` is synchronous: a double-tapped Undo, or Ctrl+Z seen by two
 * listeners, reverts the action only once.
 */
export function useUndoSlot(windowMs: number = UNDO_WINDOW_MS): UndoSlot {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const slotRef = useRef<Slot | null>(null);

  const replace = useCallback((next: Slot | null) => {
    slotRef.current = next;
    setSlot(next);
    if (next) setSecondsLeft(secondsUntil(next.deadline));
  }, []);

  useEffect(() => {
    if (!slot) return;
    // Polls a little faster than once a second so the countdown never skips a
    // number; React skips the re-render when the whole-second value is unchanged.
    const id = setInterval(() => {
      const left = secondsUntil(slot.deadline);
      if (left > 0) {
        setSecondsLeft(left);
      } else if (slotRef.current === slot) {
        slotRef.current = null;
        setSlot(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [slot]);

  const push = useCallback(
    (entry: UndoEntry) => replace({ entry, deadline: Date.now() + windowMs }),
    [replace, windowMs],
  );

  const take = useCallback((): UndoEntry | null => {
    const s = slotRef.current;
    if (!s || Date.now() >= s.deadline) return null;
    replace(null);
    return s.entry;
  }, [replace]);

  const dismiss = useCallback(
    (entryId?: string) => {
      const s = slotRef.current;
      if (!s || (entryId !== undefined && s.entry.id !== entryId)) return;
      replace(null);
    },
    [replace],
  );

  return { current: slot ? { entry: slot.entry, secondsLeft: Math.max(1, secondsLeft) } : null, push, take, dismiss };
}
