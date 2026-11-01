"use client";

import { useEffect, useId, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { CheckIcon } from "@/components/icons";
import type { ClinicSetupInput } from "@/lib/clinic-admin";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import { AuthCard, PanelIntro } from "./AuthCard";
import { friendlyError } from "./auth-errors";
import {
  MAX_DOCTORS,
  hasErrors,
  newDoctorDraft,
  newStaffDraft,
  nextFreePrefix,
  timezoneOptions,
  toDoctorInput,
  toStaffInput,
  validateClinicName,
  validateDoctor,
  validateStaff,
  type DoctorDraft,
  type DoctorErrors,
  type StaffDraft,
  type StaffErrors,
} from "./clinic-form";
import { AddRowButton, DoctorFields, StaffFields } from "./DraftFields";
import {
  ErrorNote,
  Eyebrow,
  LinkButton,
  PrimaryButton,
  SecondaryButton,
  SelectChevron,
  TextField,
  cx,
  labelClass,
  selectClass,
} from "./ui";

export type SetupStep = "clinic" | "doctors" | "staff";

const STEPS: { id: SetupStep; label: string; detail: string; title: string; intro: string }[] = [
  {
    id: "clinic",
    label: "Clinic",
    detail: "Name and time zone",
    title: "Name your clinic",
    intro: "Patients see this name on the TV, their token slip and their phone.",
  },
  {
    id: "doctors",
    label: "Doctors",
    detail: "Token letters and rooms",
    title: "Who sees patients?",
    intro: "Each doctor gets their own queue and token letter: A-1, A-2 and so on.",
  },
  {
    id: "staff",
    label: "Desk staff",
    detail: "PINs for the lock screen",
    title: "Who runs the desk?",
    intro: "Reception locks itself when nobody is using it. Staff unlock it with their own 4 digit PIN.",
  },
];

export interface SetupDraft {
  clinicName: string;
  timezone: string;
  doctors: DoctorDraft[];
  staff: StaffDraft[];
}

export function emptySetupDraft(): SetupDraft {
  return { clinicName: "", timezone: DEFAULT_TIMEZONE, doctors: [newDoctorDraft("A")], staff: [newStaffDraft()] };
}

/** Saving longer than this usually means the connection dropped mid-way. */
const SLOW_SAVE_MS = 10_000;

/**
 * Wizard state, held by the screen rather than the wizard: creating the
 * clinic flips the account state (and briefly unmounts the wizard) before
 * the server confirms, and a refused write must come back to a filled form.
 */
export function useSetupFlow(initial?: { draft?: SetupDraft; step?: SetupStep }) {
  const [draft, setDraft] = useState<SetupDraft>(() => initial?.draft ?? emptySetupDraft());
  const [step, setStep] = useState<SetupStep>(initial?.step ?? "clinic");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function create(task: () => Promise<unknown>) {
    if (creating) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setCreateError("You're offline. Setting up needs the internet once; connect and try again.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await task();
    } catch (e) {
      console.error("Clinic setup failed", e);
      setCreateError(friendlyError(e, "Couldn't create the clinic. Please try again."));
    } finally {
      setCreating(false);
    }
  }

  return { draft, setDraft, step, setStep, creating, createError, create };
}

export interface SetupWizardProps {
  accountEmail: string | null;
  draft: SetupDraft;
  setDraft: Dispatch<SetStateAction<SetupDraft>>;
  step: SetupStep;
  setStep(step: SetupStep): void;
  creating: boolean;
  createError: string | null;
  onCreate(input: ClinicSetupInput): void;
  onSignOut?(): void;
}

interface StepErrors {
  clinicName?: string;
  doctors: DoctorErrors[];
  staff: StaffErrors[];
}

const NO_ERRORS: StepErrors = { doctors: [], staff: [] };

function validateStep(step: SetupStep, draft: SetupDraft): StepErrors {
  if (step === "clinic") {
    const clinicName = validateClinicName(draft.clinicName);
    return clinicName ? { ...NO_ERRORS, clinicName } : NO_ERRORS;
  }
  if (step === "doctors") {
    // Only the later of two clashing doctors is flagged, so the fix is obvious.
    const doctors = draft.doctors.map((d, i) => validateDoctor(d, draft.doctors.slice(0, i)));
    return doctors.some(hasErrors) ? { ...NO_ERRORS, doctors } : NO_ERRORS;
  }
  const staff = draft.staff.map((s, i) => validateStaff(s, draft.staff.slice(0, i).map((o) => o.name)));
  return staff.some(hasErrors) ? { ...NO_ERRORS, staff } : NO_ERRORS;
}

function isClean(errors: StepErrors): boolean {
  return !errors.clinicName && !errors.doctors.some(hasErrors) && !errors.staff.some(hasErrors);
}

/**
 * First-run setup in three steps (clinic, doctors, desk staff), in the PIN
 * lock's frame. Each step validates before moving on; the last creates
 * everything in one go.
 */
export function SetupWizard({
  accountEmail,
  draft,
  setDraft,
  step,
  setStep,
  creating,
  createError,
  onCreate,
  onSignOut,
}: SetupWizardProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [errors, setErrors] = useState<StepErrors>(NO_ERRORS);
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  // The card to focus after "Add another": its name field takes focus once.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const meta = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const shownStep = useRef(step);

  // Moving between steps: announce the new heading rather than leaving focus on a vanished button.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  useEffect(() => {
    if (!creating) return;
    const timer = setTimeout(() => setSlow(true), SLOW_SAVE_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [creating]);

  function goTo(next: SetupStep) {
    setErrors(NO_ERRORS);
    setStep(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const found = validateStep(step, draft);
    setErrors(found);
    if (!isClean(found)) {
      setAttempt((n) => n + 1);
      return;
    }
    if (!isLast) {
      goTo(STEPS[stepIndex + 1].id);
      return;
    }
    onCreate({
      name: draft.clinicName.trim(),
      timezone: draft.timezone,
      doctors: draft.doctors.map(toDoctorInput),
      staff: draft.staff.map(toStaffInput),
    });
  }

  function patchDoctor(key: string, patch: Partial<DoctorDraft>) {
    setDraft((d) => ({ ...d, doctors: d.doctors.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  }

  function patchStaff(key: string, patch: Partial<StaffDraft>) {
    setDraft((d) => ({ ...d, staff: d.staff.map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  }

  function addDoctor() {
    const doctor = newDoctorDraft(nextFreePrefix(draft.doctors.map((d) => d.prefix)));
    setFocusKey(doctor.key);
    setDraft((d) => ({ ...d, doctors: [...d.doctors, doctor] }));
  }

  function addStaff() {
    const member = newStaffDraft();
    setFocusKey(member.key);
    setDraft((d) => ({ ...d, staff: [...d.staff, member] }));
  }

  function removeDoctor(index: number) {
    setDraft((d) => ({ ...d, doctors: d.doctors.filter((_, i) => i !== index) }));
    setErrors((e) => ({ ...e, doctors: e.doctors.filter((_, i) => i !== index) }));
    headingRef.current?.focus();
  }

  function removeStaff(index: number) {
    setDraft((d) => ({ ...d, staff: d.staff.filter((_, i) => i !== index) }));
    setErrors((e) => ({ ...e, staff: e.staff.filter((_, i) => i !== index) }));
    headingRef.current?.focus();
  }

  const zones = timezoneOptions(draft.timezone);

  return (
    <AuthCard
      width="wide"
      panel={
        <>
          <PanelIntro title="Set up your clinic" subtitle="About two minutes. You can change all of it later in Settings." />
          <StepList current={stepIndex} />
        </>
      }
      footnote={<AccountLine email={accountEmail} onSignOut={onSignOut} inverse />}
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>
          Step {stepIndex + 1} of {STEPS.length} · {meta.label}
        </Eyebrow>
        <h1
          ref={headingRef}
          tabIndex={-1}
          id={`${id}-title`}
          className="font-display text-[26px] leading-[1.15] font-bold outline-none sm:text-[30px]"
        >
          {meta.title}
        </h1>
        <p className="text-[15px] leading-normal text-pretty text-muted">{meta.intro}</p>
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        aria-labelledby={`${id}-title`}
        aria-busy={creating || undefined}
        className="flex flex-col gap-[18px]"
      >
        {step === "clinic" && (
          <>
            <TextField
              id={`${id}-clinic-name`}
              label="Clinic name"
              placeholder="Sharma Family Clinic"
              autoComplete="organization"
              autoFocus
              value={draft.clinicName}
              onChange={(e) => setDraft((d) => ({ ...d, clinicName: e.target.value }))}
              error={errors.clinicName}
            />
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-tz`} className={labelClass}>
                Time zone
              </label>
              <div className="relative">
                <select
                  id={`${id}-tz`}
                  aria-describedby={`${id}-tz-note`}
                  value={draft.timezone}
                  onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
                  className={selectClass}
                >
                  {zones.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
              <p id={`${id}-tz-note`} className="text-[13px] leading-snug text-muted">
                Today&apos;s queue starts fresh at midnight in this zone.
              </p>
            </div>
          </>
        )}

        {step === "doctors" && (
          <>
            {draft.doctors.map((doctor, i) => (
              <DoctorFields
                key={doctor.key}
                idBase={`${id}-doctor-${i}`}
                title={`Doctor ${i + 1}`}
                draft={doctor}
                errors={errors.doctors[i] ?? {}}
                onChange={(patch) => patchDoctor(doctor.key, patch)}
                onRemove={draft.doctors.length > 1 ? () => removeDoctor(i) : undefined}
                autoFocus={doctor.key === focusKey}
                surface
              />
            ))}
            <AddRowButton onClick={addDoctor} disabled={draft.doctors.length >= MAX_DOCTORS}>
              Add another doctor
            </AddRowButton>
          </>
        )}

        {step === "staff" && (
          <>
            {draft.staff.map((member, i) => (
              <StaffFields
                key={member.key}
                idBase={`${id}-staff-${i}`}
                title={`Staff ${i + 1}`}
                draft={member}
                errors={errors.staff[i] ?? {}}
                onChange={(patch) => patchStaff(member.key, patch)}
                onRemove={() => removeStaff(i)}
                autoFocus={member.key === focusKey}
                surface
              />
            ))}
            {draft.staff.length === 0 && (
              <p className="rounded-[16px] border border-line bg-surface p-4 text-[15px] leading-normal text-muted">
                No PINs means reception never locks. You can add staff any time in Settings.
              </p>
            )}
            <AddRowButton onClick={addStaff}>
              {draft.staff.length === 0 ? "Add a staff member" : "Add another staff member"}
            </AddRowButton>
          </>
        )}

        {createError && isLast && <ErrorNote>{createError}</ErrorNote>}

        <div className="mt-1 flex gap-[10px]">
          {stepIndex > 0 && (
            <SecondaryButton onClick={() => goTo(STEPS[stepIndex - 1].id)} disabled={creating} className="flex-1">
              Back
            </SecondaryButton>
          )}
          <PrimaryButton type="submit" busy={creating} className="flex-[2]">
            {isLast ? (creating ? "Creating clinic…" : "Create clinic") : "Continue"}
          </PrimaryButton>
        </div>
        {slow && (
          <p role="status" className="text-center text-[14px] text-warn">
            Still saving. Check the internet connection.
          </p>
        )}
      </form>

      <div className="lg:hidden">
        <AccountLine email={accountEmail} onSignOut={onSignOut} />
      </div>
    </AuthCard>
  );
}

function StepList({ current }: { current: number }) {
  return (
    <ol aria-label="Setup steps" className="mt-6 flex flex-col gap-4">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} aria-current={active ? "step" : undefined} className="flex items-center gap-4">
            <span
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[18px] leading-none font-bold",
                active && "bg-white text-teal",
                done && "bg-white/16 text-white",
                !active && !done && "border-2 border-white/40 text-white/80",
              )}
            >
              {done ? <CheckIcon size={20} /> : i + 1}
              {done && <span className="sr-only">Done:</span>}
            </span>
            <span className={cx("flex flex-col", !active && "opacity-75")}>
              <span className="text-[17px] font-semibold">{s.label}</span>
              <span className="text-[14px] opacity-85">{s.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function AccountLine({ email, onSignOut, inverse = false }: { email: string | null; onSignOut?(): void; inverse?: boolean }) {
  if (!email && !onSignOut) return null;
  return (
    <p className={cx("flex flex-wrap items-center gap-x-3 text-[14px]", inverse ? "text-white" : "text-muted")}>
      {email && <span className="min-w-0 break-words">Signed in as {email}</span>}
      {onSignOut && (
        // -mx-1 cancels the button's padding so it lines up with the text when it wraps.
        <LinkButton
          onClick={onSignOut}
          className={cx("-mx-1 text-[14px]", inverse && "text-white underline hover:text-white")}
        >
          Not you? Sign out
        </LinkButton>
      )}
    </p>
  );
}
