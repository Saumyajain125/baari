"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ArrowRightIcon, BellIcon, QrIcon, TvIcon } from "@/components/icons";
import { ErrorToast } from "@/components/reception/ErrorToast";
import type { ClinicPatch, DoctorInput, StaffInput } from "@/lib/clinic-admin";
import type { Clinic, Doctor } from "@/lib/types";
import { friendlyError } from "../auth-errors";
import { ClinicDetailsCard } from "./ClinicDetailsCard";
import { DoctorsCard } from "./DoctorsCard";
import { Card, CardHeader, RowButton, RowLink } from "./parts";
import { StaffCard, type StaffRow } from "./StaffCard";

/** Every Settings write. Each resolves when the server has it; offline they apply locally first. */
export interface SettingsActions {
  updateClinic(patch: ClinicPatch): Promise<void>;
  saveDoctor(doctor: DoctorInput & { id?: string; order: number }): Promise<void>;
  setDoctorActive(doctorId: string, active: boolean): Promise<void>;
  addStaff(input: StaffInput, order: number): Promise<void>;
  resetStaffPin(staffId: string, pin: string): Promise<void>;
  removeStaff(staffId: string): Promise<void>;
  /** Re-checks the clinic account's password (needs the internet); rejects when it's wrong. */
  confirmPassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface SettingsViewProps {
  clinic: Clinic;
  /** Every doctor, active or not, in tab order. */
  doctors: Doctor[];
  /** Waiting or serving tickets per doctor id today; null while that's unknown (loading or failed). */
  inQueue: Record<string, number> | null;
  staff: StaffRow[];
  accountEmail: string | null;
  actions: SettingsActions;
  onBack(): void;
}

interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
}

const TOAST_MS = { info: 4000, error: 8000 } as const;

/**
 * Settings: clinic details, doctors, desk staff, links to the clinic's other
 * screens, and sign out. Presentational: every write goes through `actions`.
 */
export function SettingsView({ clinic, doctors, inQueue, staff, accountEmail, actions, onBack }: SettingsViewProps) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    setToast((t) => ({ id: (t?.id ?? 0) + 1, message, tone }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS[toast.tone]);
    return () => clearTimeout(timer);
  }, [toast]);

  /**
   * Writes apply locally at once and the lists update from the live snapshot,
   * so confirm straight away; a refusal from the server arrives as an error toast.
   */
  function run(write: Promise<void>, done: string) {
    notify(done);
    write.catch((e: unknown) => {
      console.error("Settings write failed", e);
      notify(friendlyError(e, "Couldn't save that change. Please try again."), "error");
    });
  }

  function signOut() {
    setSigningOut(true);
    actions.signOut().catch((e: unknown) => {
      console.error("Sign out failed", e);
      setSigningOut(false);
      notify("Couldn't sign out. Please try again.", "error");
    });
  }

  const activeDoctors = doctors.filter((d) => d.active);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-10 flex h-[72px] shrink-0 items-center gap-4 border-b border-line bg-surface px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-[10px]">
          <span className="flex-none">
            <LogoMark size={32} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-display text-[17px] leading-[1.1] font-bold">Settings</h1>
            <p className="truncate text-[12px] text-muted">{clinic.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 shrink-0 items-center gap-2 rounded-[14px] bg-teal px-[18px] text-[15px] font-semibold text-white hover:bg-teal-dark"
        >
          <ArrowRightIcon size={18} className="rotate-180" />
          <span className="hidden sm:inline">Back to reception</span>
          <span className="sm:hidden">Reception</span>
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-5 sm:px-5 sm:py-6">
        <ClinicDetailsCard clinic={clinic} onSave={(patch) => run(actions.updateClinic(patch), "Clinic details saved")} />

        <DoctorsCard
          doctors={doctors}
          inQueue={inQueue}
          onSave={(d) => run(actions.saveDoctor(d), d.id ? `${d.name} saved` : `${d.name} added`)}
          onSetActive={(d, active) =>
            run(actions.setDoctorActive(d.id, active), active ? `${d.name} is back on the desk` : `${d.name} deactivated`)
          }
          onProblem={(message) => notify(message, "error")}
        />

        <StaffCard
          staff={staff}
          onAdd={(input, order) => run(actions.addStaff(input, order), `${input.name} added`)}
          onConfirmPassword={actions.confirmPassword}
          onResetPin={(s, pin) => run(actions.resetStaffPin(s.id, pin), `New PIN saved for ${s.name}`)}
          onRemove={(s) => run(actions.removeStaff(s.id), `${s.name} removed`)}
        />

        <LinksCard clinicId={clinic.id} doctors={activeDoctors} />

        <AccountCard email={accountEmail} signingOut={signingOut} onSignOut={signOut} />
      </main>

      {toast && (
        <ErrorToast key={toast.id} message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

function LinksCard({ clinicId, doctors }: { clinicId: string; doctors: Doctor[] }) {
  const id = useId();
  const clinic = encodeURIComponent(clinicId);
  return (
    <Card labelledBy={`${id}-title`}>
      <CardHeader
        id={`${id}-title`}
        title="Screens and links"
        description="Open these on the clinic's other devices. They update live."
      />
      <ul className="flex flex-col">
        <LinkRow
          icon={<TvIcon size={22} />}
          title="TV display"
          detail="Tokens being called, for the waiting room TV."
          href={`/tv/${clinic}`}
        />
        <LinkRow
          icon={<QrIcon size={22} />}
          title="QR poster"
          detail="Print it for the entrance. Patients scan it to join."
          href={`/poster/${clinic}`}
        />
        {doctors.map((d) => (
          <LinkRow
            key={d.id}
            icon={<BellIcon size={22} />}
            title={`Doctor's button · ${d.name}`}
            detail={`A Next patient button for the phone or tablet in ${d.room}.`}
            href={`/doctor/${clinic}/${encodeURIComponent(d.id)}`}
          />
        ))}
      </ul>
    </Card>
  );
}

function LinkRow({ icon, title, detail, href }: { icon: ReactNode; title: string; detail: string; href: string }) {
  return (
    <li className="flex items-center gap-4 border-b border-divider py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-teal-tint text-teal-dark"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">{title}</p>
        <p className="text-[14px] leading-snug text-muted">{detail}</p>
      </div>
      <RowLink href={href} target="_blank" rel="noopener" aria-label={`Open ${title} in a new tab`}>
        Open
      </RowLink>
    </li>
  );
}

function AccountCard({ email, signingOut, onSignOut }: { email: string | null; signingOut: boolean; onSignOut(): void }) {
  const id = useId();
  return (
    <Card labelledBy={`${id}-title`}>
      <CardHeader
        id={`${id}-title`}
        title="Account"
        description={
          email ? (
            <>
              Signed in as <strong className="font-semibold text-ink">{email}</strong>
            </>
          ) : (
            "Signed in to this clinic."
          )
        }
        action={
          <RowButton tone="danger" size="lg" onClick={onSignOut} disabled={signingOut} aria-busy={signingOut || undefined}>
            {signingOut ? "Signing out…" : "Sign out"}
          </RowButton>
        }
      />
      <p className="-mt-2 text-[14px] leading-normal text-muted">
        Signing out only affects this device. The queue, TV and patient pages keep running.
      </p>
    </Card>
  );
}
