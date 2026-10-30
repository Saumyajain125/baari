"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Per-device desk preferences (selected doctor, lock state) kept in
 * localStorage. Reads are synchronous on mount, so a refresh comes back locked
 * before the queue paints, and other tabs on the same device follow along via
 * the "storage" event. When storage is blocked or full the value lives in
 * memory for this tab instead, so the desk never gets stuck.
 */

const SAME_TAB_EVENT = "baari:stored-state";

/** Values that couldn't be written to localStorage (null = removed). */
const memory = new Map<string, string | null>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string | null): void {
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
  // The "storage" event only reaches other tabs; tell this one too.
  window.dispatchEvent(new Event(SAME_TAB_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SAME_TAB_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SAME_TAB_EVENT, onChange);
  };
}

function parse<T>(raw: string | null, fallback: T, isValid: (value: unknown) => value is T): T {
  if (raw === null) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Writes (or with null, clears) a stored value from outside React, e.g. while signing out. */
export function writeStoredState<T>(key: string, value: T | null): void {
  writeRaw(key, value === null ? null : JSON.stringify(value));
}

/**
 * A JSON value in localStorage under `key`. `fallback` and `isValid` must be
 * stable (module-level) so the parsed value keeps its identity between renders.
 * The setter takes an updater so it always builds on the latest stored value,
 * even one another tab wrote a moment ago.
 */
export function useStoredState<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (update: (prev: T) => T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const value = useMemo(() => parse(raw, fallback, isValid), [raw, fallback, isValid]);
  const update = useCallback(
    (fn: (prev: T) => T) => writeRaw(key, JSON.stringify(fn(parse(readRaw(key), fallback, isValid)))),
    [key, fallback, isValid],
  );
  return [value, update];
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}
