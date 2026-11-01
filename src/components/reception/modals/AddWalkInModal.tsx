"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { IssuedSlip, WalkInFormInput } from "@/components/reception/handlers";
import { CheckIcon, PrinterIcon } from "@/components/icons";
import { normalizePhone, VISIT_TYPE_LABEL } from "@/lib/queue/logic";
import type { VisitType } from "@/lib/types";
import type { DoctorTabView } from "@/lib/view";
import { Dialog } from "./Dialog";
import {
  CloseButton,
  cx,
  fieldErrorClass,
  inputClass,
  panelClass,
  secondaryButtonClass,
  ToggleButton,
} from "./controls";
import { PrintableTokenSlip, TokenSlip } from "./TokenSlip";

const VISIT_TYPES: VisitType[] = ["new", "follow_up", "emergency"];

/** What the form holds while it's being filled in (phone as typed). */
export interface WalkInDraft {
  doctorId: string;
  name: string;
  phone: string;
  visitType: VisitType;
}

export interface AddWalkInModalProps {
  open: boolean;
  doctors: DoctorTabView[];
  defaultDoctorId: string;
  /** "A-25" → button "Issue token A-25". */
  nextTokenLabelFor(doctorId: string): string;
  onClose(): void;
  /** Issues the token. Rejecting keeps the form filled and shows an error. */
  onSubmit(input: WalkInFormInput): Promise<IssuedSlip>;
  /** Design previews only: paint the artboard's solid backdrop. */
  solidBackdrop?: boolean;
  /** Design previews only: open with this draft and an already-issued slip (artboard 02). */
  preview?: { draft?: Partial<WalkInDraft>; slip?: IssuedSlip };
}

/**
 * Artboard 02. On wide screens the issued slip sits beside the form, which
 * resets for the next walk-in (doctor kept); on narrow screens the slip
 * replaces the form.
 */
export function AddWalkInModal(props: AddWalkInModalProps) {
  // Mounting the body only while open gives every opening a fresh form.
  return props.open ? <WalkInDialog {...props} /> : null;
}

interface FieldErrors {
  name?: string;
  phone?: string;
}

function WalkInDialog({
  doctors,
  defaultDoctorId,
  nextTokenLabelFor,
  onClose,
  onSubmit,
  solidBackdrop,
  preview,
}: AddWalkInModalProps) {
  const titleId = useId();
  const nameId = useId();
  const phoneId = useId();
  const nameErrorId = useId();
  const phoneErrorId = useId();
  const emergencyHintId = useId();
  const slipTitleId = useId();

  const fallbackDoctorId = doctors.some((d) => d.id === defaultDoctorId) ? defaultDoctorId : (doctors[0]?.id ?? "");
  const [draft, setDraft] = useState<WalkInDraft>(() => ({
    doctorId: fallbackDoctorId,
    name: "",
    phone: "",
    visitType: "new",
    ...preview?.draft,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slip, setSlip] = useState<IssuedSlip | null>(preview?.slip ?? null);
  const [announcement, setAnnouncement] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLButtonElement>(null);

  // Closing mid-submit would hide whether the token was issued, inviting a duplicate.
  const requestClose = () => {
    if (!submitting) onClose();
  };

  function edit<K extends keyof WalkInDraft>(key: K, value: WalkInDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key === "name" || key === "phone") setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !draft.doctorId) return;

    const name = draft.name.trim().replace(/\s+/g, " ");
    const phoneText = draft.phone.trim();
    const phone = phoneText ? normalizePhone(phoneText) : null;
    const nextErrors: FieldErrors = {
      name: name ? undefined : "Enter the patient's name.",
      phone: phoneText && !phone ? "Enter a 10-digit mobile number, or leave it empty." : undefined,
    };
    if (nextErrors.name || nextErrors.phone) {
      setErrors(nextErrors);
      (nextErrors.name ? nameRef : phoneRef).current?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const issued = await onSubmit({ doctorId: draft.doctorId, name, phone, visitType: draft.visitType });
      // Commit synchronously so the Print button exists before focus moves to it.
      flushSync(() => {
        setSlip(issued);
        setAnnouncement(`Token ${issued.label} issued for ${name}.`);
        setDraft((d) => ({ ...d, name: "", phone: "", visitType: "new" }));
        setSubmitting(false);
      });
      printRef.current?.focus();
    } catch {
      setSubmitting(false);
      setSubmitError("Couldn't issue the token. Check the connection and try again.");
    }
  }

  const issueLabel = draft.doctorId ? `Issue token ${nextTokenLabelFor(draft.doctorId)}` : "Issue token";

  return (
    <Dialog
      open
      onClose={requestClose}
      labelledBy={titleId}
      initialFocusRef={nameRef}
      solidBackdrop={solidBackdrop}
      className="flex-col gap-6 lg:flex-row"
    >
      <p role="status" className="sr-only">
        {announcement}
      </p>

      <form
        noValidate
        onSubmit={handleSubmit}
        aria-busy={submitting}
        className={cx(panelClass, "w-full max-w-[540px]", slip && "max-lg:hidden")}
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-[22px] pb-2">
          <h2 id={titleId} className="font-display text-[26px] font-bold max-sm:leading-[1.15]">
            Add walk-in patient
          </h2>
          <CloseButton onClick={requestClose} disabled={submitting} />
        </div>

        <div className="flex flex-col gap-[18px] px-6 pt-3 pb-6">
          {doctors.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold">Doctor</legend>
              <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                {doctors.map((d) => (
                  <ToggleButton
                    key={d.id}
                    pressed={draft.doctorId === d.id}
                    onClick={() => edit("doctorId", d.id)}
                    className="h-14 rounded-[14px] px-3"
                  >
                    {`${d.prefix} · ${d.name}`}
                  </ToggleButton>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor={nameId} className="text-[15px] font-semibold">
              Patient name
            </label>
            <input
              ref={nameRef}
              id={nameId}
              type="text"
              required
              maxLength={60}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              value={draft.name}
              onChange={(e) => edit("name", e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? nameErrorId : undefined}
              className={inputClass(!!errors.name)}
            />
            {errors.name && (
              <p id={nameErrorId} className={fieldErrorClass}>
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={phoneId} className="text-[15px] font-semibold">
              Mobile <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              ref={phoneRef}
              id={phoneId}
              type="tel"
              inputMode="tel"
              maxLength={16}
              autoComplete="off"
              enterKeyHint="go"
              placeholder="10-digit number"
              value={draft.phone}
              onChange={(e) => edit("phone", e.target.value)}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? phoneErrorId : undefined}
              className={inputClass(!!errors.phone)}
            />
            {errors.phone && (
              <p id={phoneErrorId} className={fieldErrorClass}>
                {errors.phone}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-[15px] font-semibold">Visit type</legend>
            <div className="grid grid-cols-3 gap-2">
              {VISIT_TYPES.map((type) => (
                <ToggleButton
                  key={type}
                  pressed={draft.visitType === type}
                  tone={type === "emergency" ? "danger" : "teal"}
                  onClick={() => edit("visitType", type)}
                  aria-describedby={type === "emergency" ? emergencyHintId : undefined}
                  className="h-[52px] rounded-[14px] px-2"
                >
                  {VISIT_TYPE_LABEL[type]}
                </ToggleButton>
              ))}
            </div>
            <p
              id={emergencyHintId}
              className={cx(
                "mt-2 text-[14px] font-medium text-danger",
                draft.visitType !== "emergency" && "sr-only",
              )}
            >
              Emergency goes to the front of the queue.
            </p>
          </fieldset>

          {submitError && (
            <p role="alert" className="rounded-[14px] bg-danger-tint px-4 py-3 text-[14px] font-medium text-danger">
              {submitError}
            </p>
          )}

          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={requestClose}
              disabled={submitting}
              className={cx(secondaryButtonClass, "h-[60px] flex-1 px-1.5")}
            >
              Cancel
            </button>
            {/* aria-disabled, not disabled, while submitting: disabling the focused
                button would drop keyboard focus to <body> if the submit fails. */}
            <button
              type="submit"
              disabled={!draft.doctorId}
              aria-disabled={submitting || undefined}
              className="h-[60px] flex-2 rounded-2xl bg-teal px-1.5 font-display text-[19px] font-bold text-white hover:bg-teal-dark disabled:opacity-70 aria-disabled:cursor-progress aria-disabled:opacity-70"
            >
              {submitting ? "Issuing token…" : issueLabel}
            </button>
          </div>
        </div>
      </form>

      {slip && (
        <section
          aria-labelledby={slipTitleId}
          className={cx(panelClass, "w-full max-w-[360px] items-center gap-3.5 p-6")}
        >
          <h3 id={slipTitleId} className="flex items-center gap-2 text-[15px] font-semibold text-teal-dark">
            <CheckIcon size={20} />
            Token issued
          </h3>
          {slip.offline && (
            <p className="-mt-1.5 text-center text-[13px] font-semibold text-warn">
              Saved offline. It will sync when the internet is back.
            </p>
          )}
          <TokenSlip slip={slip} />
          <div className="flex w-full gap-2.5">
            <button
              ref={printRef}
              type="button"
              onClick={() => window.print()}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-teal px-1.5 text-[16px] font-semibold text-white hover:bg-teal-dark"
            >
              <PrinterIcon size={20} />
              Print slip
            </button>
            <button type="button" onClick={onClose} className={cx(secondaryButtonClass, "h-14 flex-1 px-1.5")}>
              Done
            </button>
          </div>
          <p className="text-center text-[13px] text-muted">
            No printer? Write the number on a paper token, or show this screen to the patient.
          </p>
          <PrintableTokenSlip slip={slip} />
        </section>
      )}
    </Dialog>
  );
}
