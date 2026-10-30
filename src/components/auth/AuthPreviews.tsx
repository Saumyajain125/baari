"use client";

/**
 * Dev-only renders of the account screens with fake callbacks, for the
 * /preview routes. Nothing here talks to Firebase.
 */
import { useState } from "react";
import { initialsOf } from "@/lib/pin";
import type { Clinic, Doctor } from "@/lib/types";
import { newDoctorDraft, newStaffDraft } from "./clinic-form";
import { AuthLoading } from "./AuthStatus";
import { FirebaseNotConfigured } from "./FirebaseNotConfigured";
import { LoginForm, type LoginMode } from "./LoginForm";
import { SettingsView, type SettingsActions } from "./settings/SettingsView";
import type { StaffRow } from "./settings/StaffCard";
import { SetupWizard, useSetupFlow, type SetupDraft, type SetupStep } from "./SetupWizard";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function LoginPreview({ mode, state }: { mode: LoginMode; state?: string }) {
  if (state === "unconfigured") return <FirebaseNotConfigured />;
  if (state === "loading") return <AuthLoading />;
  return (
    <LoginForm
      initialMode={mode}
      initialEmail={state === "error" ? "reception@sharmaclinic.in" : ""}
      initialError={state === "error" ? "That email and password don't match. Try again, or reset your password." : undefined}
      onSubmit={async () => {
        await wait(600);
        throw Object.assign(new Error("preview"), { code: "auth/invalid-credential" });
      }}
      onResetPassword={() => wait(600)}
    />
  );
}

/** The design's clinic, as someone would type it during setup. */
function designSetupDraft(): SetupDraft {
  return {
    clinicName: "Sharma Family Clinic",
    timezone: "Asia/Kolkata",
    doctors: [
      newDoctorDraft("A", { name: "Dr. Anita Sharma", room: "Room 2" }),
      newDoctorDraft("B", { name: "Dr. Rohit Verma", room: "Room 3", startsAt: "11:00" }),
    ],
    staff: [
      newStaffDraft({ name: "Rekha Kumari", pin: "1234", pinAgain: "1234" }),
      newStaffDraft({ name: "Suresh Mehta", pin: "5678", pinAgain: "56" }),
    ],
  };
}

export function SetupPreview({ step, filled }: { step: SetupStep; filled: boolean }) {
  const flow = useSetupFlow({ step, draft: filled ? designSetupDraft() : undefined });
  return (
    <SetupWizard
      accountEmail="reception@sharmaclinic.in"
      draft={flow.draft}
      setDraft={flow.setDraft}
      step={flow.step}
      setStep={flow.setStep}
      creating={flow.creating}
      createError={flow.createError}
      onCreate={() => void flow.create(() => wait(1200))}
      onSignOut={() => window.alert("Sign out")}
    />
  );
}

const designClinic: Clinic = {
  id: "sharma-family-clinic",
  name: "Sharma Family Clinic",
  ownerUid: "preview",
  timezone: "Asia/Kolkata",
  defaultConsultMin: 6,
  lockAfterMin: 10,
  createdAt: 0,
};

const designDoctorsList: Doctor[] = [
  { id: "anita", name: "Dr. Anita Sharma", prefix: "A", room: "Room 2", order: 0, startsAt: null, active: true },
  { id: "rohit", name: "Dr. Rohit Verma", prefix: "B", room: "Room 3", order: 1, startsAt: "11:00", active: true },
  { id: "meera", name: "Dr. Meera Iyer", prefix: "C", room: "Room 4", order: 2, startsAt: null, active: false },
];

const designStaffList: StaffRow[] = [
  { id: "rekha", name: "Rekha Kumari", initials: "RK", order: 0 },
  { id: "suresh", name: "Suresh Mehta", initials: "SM", order: 1 },
];

/** Dr. Sharma still has the design's queue, so her Deactivate shows the "still in the queue" refusal. */
const designInQueue: Record<string, number> = { anita: 10 };

/** Any clinic password passes in the preview except this one, to show the refusal. */
const PREVIEW_WRONG_PASSWORD = "wrong";

/** Settings against in-memory data: every change applies locally, as it would offline. */
export function SettingsPreview() {
  const [clinic, setClinic] = useState(designClinic);
  const [doctors, setDoctors] = useState(designDoctorsList);
  const [staff, setStaff] = useState(designStaffList);
  let seq = 0;
  const newId = () => `preview-${Date.now()}-${(seq += 1)}`;

  const actions: SettingsActions = {
    updateClinic: async (patch) => setClinic((c) => ({ ...c, ...patch })),
    saveDoctor: async ({ id, ...input }) =>
      setDoctors((list) =>
        id
          ? list.map((d) => (d.id === id ? { ...d, ...input } : d))
          : [...list, { ...input, id: newId(), active: true }],
      ),
    setDoctorActive: async (doctorId, active) =>
      setDoctors((list) => list.map((d) => (d.id === doctorId ? { ...d, active } : d))),
    addStaff: async (input, order) =>
      setStaff((list) => [...list, { id: newId(), name: input.name, initials: initialsOf(input.name), order }]),
    resetStaffPin: () => wait(300),
    removeStaff: async (staffId) => setStaff((list) => list.filter((s) => s.id !== staffId)),
    confirmPassword: async (password) => {
      await wait(500);
      if (password === PREVIEW_WRONG_PASSWORD) {
        throw Object.assign(new Error("preview"), { code: "auth/invalid-credential" });
      }
    },
    signOut: async () => {
      await wait(600);
      window.alert("Signed out (preview)");
    },
  };

  return (
    <SettingsView
      clinic={clinic}
      doctors={doctors}
      inQueue={designInQueue}
      staff={staff}
      accountEmail="reception@sharmaclinic.in"
      actions={actions}
      onBack={() => window.alert("Back to reception (preview)")}
    />
  );
}
