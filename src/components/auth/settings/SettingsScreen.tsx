"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential, type User } from "firebase/auth";
import { ClinicGate, type ClinicSession } from "@/components/auth/ClinicGate";
import { AccountProblem, signOutOfClinic } from "@/components/auth/account";
import { AuthLoading } from "@/components/auth/AuthStatus";
import { PinLock } from "@/components/reception/lock/PinLock";
import { useReceptionLock } from "@/components/reception/useReceptionLock";
import {
  addStaff,
  removeStaff,
  resetStaffPin,
  setDoctorActive,
  updateClinic,
  upsertDoctor,
} from "@/lib/clinic-admin";
import { useClinic, useDoctors, useNow, usePublicTickets, useStaff } from "@/lib/hooks";
import { initialsOf } from "@/lib/pin";
import { dateKey, formatDayShort } from "@/lib/time";
import type { Ticket } from "@/lib/types";
import { SettingsView, type SettingsActions } from "./SettingsView";

/** /settings: the clinic owner's controls, behind the clinic account and the desk's PIN lock. */
export function SettingsScreen() {
  return <ClinicGate>{(session) => <SettingsData key={session.clinicId} session={session} />}</ClinicGate>;
}

/** Proves whoever is at the device knows the clinic account's password, not just a staff PIN. */
async function confirmClinicPassword(user: User, password: string): Promise<void> {
  if (!user.email) throw new Error("The clinic account has no email to check a password against.");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
}

/** Tickets still in each doctor's queue (waiting, or with the doctor now). */
function countInQueue(tickets: Ticket[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    if (t.status === "waiting" || t.status === "serving") counts[t.doctorId] = (counts[t.doctorId] ?? 0) + 1;
  }
  return counts;
}

function SettingsData({ session }: { session: ClinicSession }) {
  const { clinicId, user } = session;
  const router = useRouter();
  const clinic = useClinic(clinicId).data ?? session.clinic;
  const doctors = useDoctors(clinicId);
  const staff = useStaff(clinicId);
  const now = useNow(30_000);
  const tickets = usePublicTickets(clinicId, dateKey(now, clinic.timezone));
  // The same lock as the desk (shared through localStorage): a locked desk can't be got
  // round by opening Settings, and Settings locks itself after the same idle time.
  const lock = useReceptionLock(clinicId, staff.data, clinic.lockAfterMin);
  const [signingOut, setSigningOut] = useState(false);

  const actions = useMemo<SettingsActions>(
    () => ({
      updateClinic: (patch) => updateClinic(clinicId, patch),
      saveDoctor: (doctor) => upsertDoctor(clinicId, doctor),
      setDoctorActive: (doctorId, active) => setDoctorActive(clinicId, doctorId, active),
      addStaff: (input, order) => addStaff(clinicId, input, order),
      resetStaffPin: (staffId, pin) => resetStaffPin(clinicId, staffId, pin),
      removeStaff: (staffId) => removeStaff(clinicId, staffId),
      confirmPassword: (password) => confirmClinicPassword(user, password),
      // ClinicGate notices the signed-out state and takes the device to /login.
      signOut: () => signOutOfClinic(clinicId),
    }),
    [clinicId, user],
  );

  // An unreadable queue counts as unknown, which keeps Deactivate blocked rather than guessing.
  const inQueue = useMemo(
    () => (tickets.loading || tickets.error ? null : countInQueue(tickets.data)),
    [tickets.loading, tickets.error, tickets.data],
  );

  // Forgot PIN: as on the desk, sign the device out; the clinic password gets back in, unlocked.
  const forgotPin = useCallback(() => {
    setSigningOut(true);
    signOutOfClinic(clinicId).catch((e: unknown) => {
      console.error("Sign out failed", e);
      setSigningOut(false);
    });
  }, [clinicId]);

  const loadError = doctors.error ?? staff.error;
  if (signingOut) return <AuthLoading label="Signing out…" />;
  if (loadError) return <AccountProblem error={loadError} clinicId={clinicId} />;
  if (doctors.loading || staff.loading) return <AuthLoading label="Opening settings…" />;

  if (lock.locked) {
    return (
      <PinLock
        clinicName={clinic.name}
        dateLabel={formatDayShort(now, clinic.timezone)}
        lockAfterMin={clinic.lockAfterMin}
        staff={lock.staff.map((s) => ({ id: s.id, name: s.name, initials: s.initials || initialsOf(s.name) }))}
        defaultStaffId={lock.staffId ?? undefined}
        onVerify={lock.verify}
        onUnlocked={lock.unlock}
        onForgot={forgotPin}
      />
    );
  }

  return (
    <SettingsView
      clinic={clinic}
      doctors={doctors.data}
      inQueue={inQueue}
      staff={staff.data}
      accountEmail={user.email}
      actions={actions}
      onBack={() => router.push("/reception")}
    />
  );
}
