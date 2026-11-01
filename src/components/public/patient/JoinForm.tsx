"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { ChoiceChips } from "@/components/public/ChoiceChips";
import { cx, primaryButtonClass } from "@/components/public/ui";
import type { JoinDoctorOption } from "@/components/public/views";
import { ClinicIdentity } from "@/components/reception/ClinicIdentity";
import { DISTANCE_LABEL, normalizePhone } from "@/lib/queue/logic";
import { MAX_NAME_LENGTH, PatientFacingError } from "@/lib/queue/patient";
import type { Distance, VisitType } from "@/lib/types";

const DISTANCES: Distance[] = ["here", "under_15", "15_30", "over_30"];

export interface JoinFormValues {
  doctorId: string;
  name: string;
  /** Normalised 10-digit mobile, or null. */
  phone: string | null;
  visitType: VisitType;
  distance: Distance;
}

export interface JoinFormProps {
  clinicName: string;
  /** "Thu, 29 Oct" */
  dateLabel: string;
  doctors: JoinDoctorOption[];
  /** A token this phone already holds today: "You already have token A-27". */
  existing: { label: string; href: string } | null;
  /** Resolves when the token is issued (the page then moves to the status screen). */
  onSubmit(values: JoinFormValues): Promise<void>;
  /** Preview only: start with these values filled in. */
  initial?: Partial<JoinFormValues>;
}

function fieldClass(invalid: boolean) {
  return cx(
    "h-14 w-full rounded-[14px] bg-surface px-4 text-[18px] text-ink placeholder:text-faint focus:outline-none",
    invalid ? "border-2 border-danger" : "border border-line-strong focus:border-2 focus:border-teal",
  );
}

/**
 * The page a patient lands on after scanning the QR poster: pick a doctor,
 * name, optional mobile, visit type and how far away they are, then
 * "Get my token". Sized for one-handed use on a phone.
 */
export function JoinForm({ clinicName, dateLabel, doctors, existing, onSubmit, initial }: JoinFormProps) {
  const ids = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const distanceName = `${ids}-dist`;
  const single = doctors.length === 1;

  const [doctorId, setDoctorId] = useState<string | null>(initial?.doctorId ?? (single ? doctors[0].id : null));
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [visitType, setVisitType] = useState<VisitType>(initial?.visitType ?? "new");
  const [distance, setDistance] = useState<Distance | null>(initial?.distance ?? null);
  const [errors, setErrors] = useState<{ doctor?: string; name?: string; phone?: string; distance?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const doctor = doctors.find((d) => d.id === doctorId) ?? null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    const normalized = phone.trim() ? normalizePhone(phone) : null;
    const next: typeof errors = {};
    if (!doctorId) next.doctor = "Choose a doctor.";
    if (!trimmed) next.name = "Please enter the patient's name.";
    if (phone.trim() && !normalized) next.phone = "Enter a 10 digit mobile number, or leave it empty.";
    if (!distance) next.distance = "Tell us how far you are.";
    setErrors(next);
    setSubmitError(null);
    if (Object.keys(next).length > 0) {
      if (next.name) nameRef.current?.focus();
      else if (next.phone) phoneRef.current?.focus();
      else formRef.current?.querySelector<HTMLInputElement>(`input[name="${next.doctor ? "doctor" : distanceName}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ doctorId: doctorId!, name: trimmed, phone: normalized, visitType, distance: distance! });
    } catch (err) {
      // Only our own copy is shown as is; Firebase and browser messages aren't meant for patients.
      setSubmitError(
        err instanceof PatientFacingError
          ? err.message
          : "Couldn't get a token. Check your internet connection and try again, or ask at reception.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="border-b border-line bg-surface px-4 py-[14px]">
        <div className="mx-auto w-full max-w-[480px]">
          <ClinicIdentity clinicName={clinicName} subtitle={`${dateLabel} · Walk-in queue`} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-4 pb-8">
        <div className="px-1">
          <h1 className="font-display text-[28px] leading-tight font-bold">Join the queue</h1>
          <p className="mt-1 text-[15px] leading-snug text-pretty text-muted">
            Get a token on your phone and wait anywhere. We&apos;ll show your place and tell you when it&apos;s your turn.
          </p>
        </div>

        {existing && (
          <Link
            href={existing.href}
            className="flex items-center gap-3 rounded-[18px] border-2 border-teal bg-teal-tint px-4 py-[14px] no-underline"
          >
            <span className="font-display text-[32px] leading-none font-extrabold text-teal">{existing.label}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold text-teal-dark">You already have token {existing.label}</span>
              <span className="text-[13px] text-muted">See your place in the queue</span>
            </span>
            <ArrowRightIcon size={22} className="flex-none text-teal-dark" />
          </Link>
        )}

        <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-3" aria-describedby={submitError ? `${ids}-submit` : undefined}>
          <fieldset
            className="rounded-[18px] border border-line bg-surface p-4"
            disabled={submitting}
            aria-describedby={errors.doctor ? `${ids}-doctor-error` : undefined}
          >
            {/* float + w-full lets the legend sit inside the card like any other label. */}
            <legend className="float-left mb-3 w-full text-[15px] font-semibold">
              {single ? "Doctor" : "Which doctor?"}
            </legend>
            <div className="clear-left flex flex-col gap-2">
              {doctors.map((d) => {
                const checked = d.id === doctorId;
                return (
                  <label key={d.id} className="relative flex">
                    <input
                      type="radio"
                      name="doctor"
                      value={d.id}
                      checked={checked}
                      onChange={() => {
                        setDoctorId(d.id);
                        setErrors((e) => ({ ...e, doctor: undefined }));
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={cx(
                        "flex flex-1 cursor-pointer items-center gap-3 rounded-[16px] px-[14px] py-3",
                        "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal",
                        checked ? "border-2 border-teal bg-teal-tint" : "border border-line-strong bg-surface hover:bg-hover",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "flex size-10 flex-none items-center justify-center rounded-[12px] font-display text-[20px] font-extrabold",
                          checked ? "bg-teal text-white" : "bg-teal-tint text-teal-dark",
                        )}
                      >
                        {d.prefix}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[16px] font-semibold">{d.name}</span>
                        <span className="truncate text-[13px] text-muted">
                          {d.startsAtLabel ?? d.room} · {d.waitingCount} waiting
                        </span>
                        {d.pausedNote && <span className="text-[13px] font-semibold text-warn">{d.pausedNote}</span>}
                        <span className="text-[13px] font-semibold text-teal-dark">{d.etaText}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.doctor && (
              <p id={`${ids}-doctor-error`} className="mt-2 text-[14px] font-medium text-danger">
                {errors.doctor}
              </p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-[18px] border border-line bg-surface p-4" disabled={submitting}>
            <legend className="sr-only">Patient details</legend>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${ids}-name`} className="text-[15px] font-semibold">
                Patient name
              </label>
              <input
                ref={nameRef}
                id={`${ids}-name`}
                name="name"
                autoComplete="name"
                required
                maxLength={MAX_NAME_LENGTH}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${ids}-name-error` : undefined}
                className={fieldClass(!!errors.name)}
              />
              {errors.name && (
                <p id={`${ids}-name-error`} className="text-[14px] font-medium text-danger">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`${ids}-phone`} className="text-[15px] font-semibold">
                Mobile <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                ref={phoneRef}
                id={`${ids}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }));
                }}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? `${ids}-phone-error` : undefined}
                className={fieldClass(!!errors.phone)}
              />
              {errors.phone && (
                <p id={`${ids}-phone-error`} className="text-[14px] font-medium text-danger">
                  {errors.phone}
                </p>
              )}
            </div>

            <ChoiceChips
              name={`${ids}-visit`}
              legend="Visit type"
              options={[
                { value: "new", label: "New" },
                { value: "follow_up", label: "Follow-up" },
              ]}
              value={visitType}
              onChange={setVisitType}
            />
            <p className="-mt-2 text-[13px] leading-snug text-muted">
              Emergency? Go straight to the reception desk, don&apos;t wait for your turn.
            </p>

            <div>
              <ChoiceChips
                name={distanceName}
                legend="How far are you?"
                description="So the desk knows who is already here."
                options={DISTANCES.map((d) => ({ value: d, label: DISTANCE_LABEL[d] }))}
                value={distance}
                onChange={(d) => {
                  setDistance(d);
                  setErrors((e) => ({ ...e, distance: undefined }));
                }}
              />
              {errors.distance && (
                <p role="alert" className="mt-2 text-[14px] font-medium text-danger">
                  {errors.distance}
                </p>
              )}
            </div>
          </fieldset>

          {submitError && (
            <p id={`${ids}-submit`} role="alert" className="px-1 text-[14px] font-medium text-danger">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={cx(primaryButtonClass, "mt-1 min-h-[72px] flex-col rounded-[20px] px-5 py-2")}
          >
            <span className="flex items-center gap-2 font-display text-[24px] leading-[1.1] font-extrabold">
              {submitting ? "Getting your token…" : "Get my token"}
              {!submitting && <ArrowRightIcon size={22} />}
            </span>
            {doctor && !submitting && (
              <span className="text-[12px] opacity-90">
                {doctor.name} · {doctor.waitingCount} waiting
              </span>
            )}
          </button>
          <p lang="hi" className="text-center text-[14px] text-muted">
            टोकन लें और कहीं भी इंतज़ार करें
          </p>
        </form>
      </main>
    </div>
  );
}
