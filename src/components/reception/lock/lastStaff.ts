/**
 * Remembers who last unlocked this device so the PIN screen preselects them.
 * Storage can be missing or throw (private mode, blocked site data), in which
 * case the lock simply falls back to the first staff member.
 */
const KEY = "baari.lock.lastStaffId";

export function readLastStaffId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberLastStaffId(staffId: string): void {
  try {
    window.localStorage.setItem(KEY, staffId);
  } catch {
    // Not remembering is harmless: the picker defaults to the first staff member.
  }
}

/** useSyncExternalStore subscription: another tab unlocking updates the default here too. */
export function subscribeLastStaffId(onChange: () => void): () => void {
  const handle = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", handle);
  return () => window.removeEventListener("storage", handle);
}
