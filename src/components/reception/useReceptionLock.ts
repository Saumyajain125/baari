"use client";

import { useCallback, useMemo } from "react";
import { verifyPin } from "@/lib/pin";
import type { Staff } from "@/lib/types";
import { useIdleLock } from "@/components/reception/lock/useIdleLock";
import { useStoredState, writeStoredState } from "@/components/reception/useStoredState";

interface StoredLock {
  locked: boolean;
  /** Who unlocked this device last; recorded on every desk change. */
  staffId: string | null;
}

const UNLOCKED: StoredLock = { locked: false, staffId: null };

function isStoredLock(value: unknown): value is StoredLock {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.locked === "boolean" && (v.staffId === null || typeof v.staffId === "string");
}

const lockKey = (clinicId: string) => `baari:reception:lock:${clinicId}`;
const activityKey = (clinicId: string) => `baari:reception:activity:${clinicId}`;

/** Forgets the device's lock. Called after a clinic-password sign-in (LoginScreen), so whoever signs in starts unlocked. */
export function clearReceptionLock(clinicId: string): void {
  writeStoredState(lockKey(clinicId), null);
}

export interface ReceptionLock {
  /** False when the clinic has no staff PINs set up: the desk never locks then. */
  enabled: boolean;
  locked: boolean;
  /** Staff member at the desk, for DeskContext.staffId. */
  staffId: string | null;
  /** Staff who can unlock, sorted as in Settings. */
  staff: Staff[];
  lock(): void;
  unlock(staffId: string): void;
  verify(staffId: string, pin: string): Promise<boolean>;
}

/**
 * Reception PIN lock. The state lives in localStorage so a refresh (or another
 * tab on the same device) stays locked, and the idle timer engages it after
 * clinic.lockAfterMin minutes without a touch in any of the desk's tabs.
 */
export function useReceptionLock(clinicId: string, allStaff: Staff[], lockAfterMin: number): ReceptionLock {
  const [stored, update] = useStoredState(lockKey(clinicId), UNLOCKED, isStoredLock);

  const staff = useMemo(() => allStaff.filter((s) => s.pinHash && s.pinSalt), [allStaff]);
  const enabled = staff.length > 0;
  const locked = enabled && stored.locked;
  const staffId = stored.staffId !== null && staff.some((s) => s.id === stored.staffId) ? stored.staffId : null;

  const lock = useCallback(() => {
    if (enabled) update((prev) => ({ ...prev, locked: true }));
  }, [enabled, update]);

  const unlock = useCallback((id: string) => update(() => ({ locked: false, staffId: id })), [update]);

  const verify = useCallback(
    async (id: string, pin: string) => {
      const member = staff.find((s) => s.id === id);
      return member ? verifyPin(pin, member) : false;
    },
    [staff],
  );

  // The lock state is shared by every tab, so idleness must be too.
  useIdleLock({ minutes: lockAfterMin, enabled: enabled && !locked, onIdle: lock, sharedActivityKey: activityKey(clinicId) });

  return { enabled, locked, staffId, staff, lock, unlock, verify };
}
