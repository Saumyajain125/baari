"use client";

import { useCallback, useState, type ReactNode } from "react";
import { signOutOfClinic } from "@/components/auth/account";
import { AuthLoading } from "@/components/auth/AuthStatus";
import { ClinicGate } from "@/components/auth/ClinicGate";
import { PinLock } from "@/components/reception/lock/PinLock";
import { useReceptionLock, type ReceptionLock } from "@/components/reception/useReceptionLock";
import { useNow, useStaff } from "@/lib/hooks";
import { initialsOf } from "@/lib/pin";
import { formatDayShort } from "@/lib/time";
import type { Clinic } from "@/lib/types";

export interface ReceptionLockGateProps {
  clinicId: string;
  clinic: Clinic;
  children: ReactNode;
}

/**
 * Keeps the desk's PIN lock in force on signed-in pages outside reception (the
 * doctor's button): on a locked device they show PinLock instead of the queue.
 * It never arms the idle timer, so a doctor-room device, which nobody locks,
 * is never interrupted.
 */
export function ReceptionLockGate({ clinicId, clinic, children }: ReceptionLockGateProps) {
  const staff = useStaff(clinicId);
  const lock = useReceptionLock(clinicId, staff.data, 0);
  const [signingOut, setSigningOut] = useState(false);

  // Forgot PIN: as on the desk, sign the device out; the clinic password gets back in, unlocked.
  const forgotPin = useCallback(() => {
    setSigningOut(true);
    signOutOfClinic(clinicId).catch((e: unknown) => {
      console.error("Sign out failed", e);
      setSigningOut(false);
    });
  }, [clinicId]);

  if (signingOut) return <AuthLoading label="Signing out…" />;
  // The lock reads as off until staff load: wait rather than flash patient names on a locked device.
  // A refused staff read leaves it off, as on the desk; such a device can't read names either.
  if (staff.loading) return <AuthLoading />;
  if (lock.locked) return <LockScreen clinic={clinic} lock={lock} onForgot={forgotPin} />;
  return children;
}

function LockScreen({ clinic, lock, onForgot }: { clinic: Clinic; lock: ReceptionLock; onForgot(): void }) {
  const now = useNow(30_000);
  return (
    <PinLock
      clinicName={clinic.name}
      dateLabel={formatDayShort(now, clinic.timezone)}
      lockAfterMin={clinic.lockAfterMin}
      staff={lock.staff.map((s) => ({ id: s.id, name: s.name, initials: s.initials || initialsOf(s.name) }))}
      defaultStaffId={lock.staffId ?? undefined}
      onVerify={lock.verify}
      onUnlocked={lock.unlock}
      onForgot={onForgot}
    />
  );
}

/**
 * ClinicGate + ReceptionLockGate for a server page whose screen brings its own
 * ClinicGate: the lock is checked before that screen mounts at all.
 */
export function ClinicLockGate({ children }: { children: ReactNode }) {
  return (
    <ClinicGate>
      {(session) => (
        <ReceptionLockGate clinicId={session.clinicId} clinic={session.clinic}>
          {children}
        </ReceptionLockGate>
      )}
    </ClinicGate>
  );
}
