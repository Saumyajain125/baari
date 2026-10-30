"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type Ref } from "react";
import { PlusIcon } from "@/components/icons";
import type { StaffInput } from "@/lib/clinic-admin";
import type { Staff } from "@/lib/types";
import { passwordCheckError } from "../auth-errors";
import {
  hasErrors,
  newStaffDraft,
  toStaffInput,
  validatePinPair,
  validateStaff,
  type StaffDraft,
  type StaffErrors,
} from "../clinic-form";
import { InitialsAvatar, PinPair, StaffFields } from "../DraftFields";
import { TextField } from "../ui";
import { Card, CardHeader, EditorActions, RowButton } from "./parts";

export type StaffRow = Pick<Staff, "id" | "name" | "initials" | "order">;

export interface StaffCardProps {
  staff: StaffRow[];
  onAdd(input: StaffInput, order: number): void;
  /**
   * Re-checks the clinic account's password; rejects when it's wrong or can't be checked.
   * Any staff PIN unlocks the desk (and so Settings), so changing someone else's PIN or
   * removing them takes the clinic password as well.
   */
  onConfirmPassword(password: string): Promise<void>;
  onResetPin(staff: StaffRow, pin: string): void;
  onRemove(staff: StaffRow): void;
}

type Mode = { kind: "idle" } | { kind: "add" } | { kind: "reset"; id: string } | { kind: "remove"; id: string };

type FormErrors = StaffErrors & { password?: string };

/** Desk staff who unlock reception with a PIN. PINs are only ever replaced, never shown. */
export function StaffCard({ staff, onAdd, onConfirmPassword, onResetPin, onRemove }: StaffCardProps) {
  const id = useId();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [draft, setDraft] = useState<StaffDraft>(() => newStaffDraft());
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Bumped whenever a form opens or closes, so a password check that finishes afterwards is ignored.
  const attempt = useRef(0);

  useEffect(() => {
    if (mode.kind !== "idle" || !focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [mode, focusId]);

  // A refused password stays in the form, selected, ready to retype.
  useEffect(() => {
    if (errors.password) passwordRef.current?.select();
  }, [errors]);

  function open(next: Mode) {
    attempt.current += 1;
    setDraft(newStaffDraft());
    setPassword("");
    setChecking(false);
    setErrors({});
    setMode(next);
  }

  function close(returnTo: string) {
    attempt.current += 1;
    setMode({ kind: "idle" });
    setPassword("");
    setChecking(false);
    setErrors({});
    setFocusId(returnTo);
  }

  function invalid(form: HTMLFormElement, found: FormErrors): boolean {
    setErrors(found);
    if (!hasErrors(found)) return false;
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return true;
  }

  /** Runs `then` once the clinic password checks out; otherwise the form stays open with the reason. */
  async function withPassword(then: () => void) {
    const mine = (attempt.current += 1);
    setChecking(true);
    try {
      await onConfirmPassword(password);
    } catch (e) {
      if (attempt.current !== mine) return;
      setChecking(false);
      setErrors({ password: passwordCheckError(e) });
      return;
    }
    if (attempt.current === mine) then();
  }

  function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateStaff(
      draft,
      staff.map((s) => s.name),
    );
    if (invalid(event.currentTarget, found)) return;
    const order = staff.reduce((max, s) => Math.max(max, s.order + 1), 0);
    onAdd(toStaffInput(draft), order);
    close(`${id}-add`);
  }

  function submitReset(event: FormEvent<HTMLFormElement>, member: StaffRow) {
    event.preventDefault();
    if (checking) return;
    const found: FormErrors = { ...validatePinPair(draft.pin, draft.pinAgain) };
    if (!hasErrors(found) && !password) found.password = "Type the clinic password.";
    if (invalid(event.currentTarget, found)) return;
    const pin = draft.pin;
    void withPassword(() => {
      onResetPin(member, pin);
      close(`${id}-reset-${member.id}`);
    });
  }

  function submitRemove(event: FormEvent<HTMLFormElement>, member: StaffRow) {
    event.preventDefault();
    if (checking) return;
    if (invalid(event.currentTarget, password ? {} : { password: "Type the clinic password." })) return;
    void withPassword(() => {
      onRemove(member);
      close(`${id}-add`);
    });
  }

  return (
    <Card labelledBy={`${id}-title`}>
      <CardHeader
        id={`${id}-title`}
        title="Desk staff"
        description="Each person unlocks reception with their own 4 digit PIN."
        action={
          <RowButton id={`${id}-add`} tone="primary" onClick={() => open({ kind: "add" })} disabled={mode.kind === "add"}>
            <PlusIcon size={18} />
            Add staff
          </RowButton>
        }
      />

      {staff.length === 0 && mode.kind !== "add" && (
        <p className="rounded-[14px] bg-canvas p-4 text-[15px] text-muted">
          No staff yet, so reception never locks. Add someone to turn the PIN lock on.
        </p>
      )}

      {staff.length > 0 && (
        <ul className="flex flex-col">
          {staff.map((member) => (
            <li key={member.id} className="border-b border-divider py-3 first:pt-0 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <InitialsAvatar name={member.name} size={40} />
                <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">{member.name}</p>
                <div className="flex basis-full justify-end gap-2 sm:basis-auto">
                  <RowButton
                    id={`${id}-reset-${member.id}`}
                    onClick={() => open({ kind: "reset", id: member.id })}
                    aria-label={`Reset PIN for ${member.name}`}
                    aria-expanded={mode.kind === "reset" && mode.id === member.id}
                  >
                    Reset PIN
                  </RowButton>
                  <RowButton
                    id={`${id}-remove-${member.id}`}
                    tone="danger"
                    onClick={() => open({ kind: "remove", id: member.id })}
                    aria-label={`Remove ${member.name}`}
                    aria-expanded={mode.kind === "remove" && mode.id === member.id}
                  >
                    Remove
                  </RowButton>
                </div>

                {mode.kind === "reset" && mode.id === member.id && (
                  <form
                    noValidate
                    onSubmit={(e) => submitReset(e, member)}
                    aria-label={`New PIN for ${member.name}`}
                    aria-busy={checking || undefined}
                    className="flex basis-full flex-col gap-4 rounded-[16px] bg-canvas p-4"
                  >
                    <PinPair
                      idBase={`${id}-reset-form`}
                      draft={draft}
                      errors={errors}
                      onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                      labels={["New PIN", "New PIN again"]}
                      autoFocus
                    />
                    <ClinicPasswordField
                      id={`${id}-reset-password`}
                      inputRef={passwordRef}
                      value={password}
                      error={errors.password}
                      onChange={setPassword}
                    />
                    <EditorActions
                      saveLabel={checking ? "Checking…" : "Save PIN"}
                      busy={checking}
                      onCancel={() => close(`${id}-reset-${member.id}`)}
                    />
                  </form>
                )}

                {mode.kind === "remove" && mode.id === member.id && (
                  <form
                    noValidate
                    onSubmit={(e) => submitRemove(e, member)}
                    aria-label={`Remove ${member.name}`}
                    aria-busy={checking || undefined}
                    className="flex basis-full flex-col gap-4 rounded-[14px] border border-danger-line bg-danger-tint p-4"
                  >
                    <p className="text-[14px] leading-normal text-danger">
                      Remove <strong>{member.name}</strong>? They won&apos;t be able to unlock reception.
                    </p>
                    <ClinicPasswordField
                      id={`${id}-remove-password`}
                      inputRef={passwordRef}
                      value={password}
                      error={errors.password}
                      onChange={setPassword}
                      autoFocus
                    />
                    <EditorActions
                      saveLabel={checking ? "Checking…" : "Remove"}
                      tone="danger-solid"
                      busy={checking}
                      onCancel={() => close(`${id}-remove-${member.id}`)}
                    />
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {mode.kind === "add" && (
        <form noValidate onSubmit={submitAdd} className="flex flex-col gap-4">
          <StaffFields
            idBase={`${id}-new`}
            title="New staff member"
            draft={draft}
            errors={errors}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            autoFocus
          />
          <EditorActions saveLabel="Add staff" onCancel={() => close(`${id}-add`)} />
        </form>
      )}
    </Card>
  );
}

function ClinicPasswordField({
  id,
  inputRef,
  value,
  error,
  onChange,
  autoFocus,
}: {
  id: string;
  inputRef: Ref<HTMLInputElement>;
  value: string;
  error?: string;
  onChange(value: string): void;
  autoFocus?: boolean;
}) {
  return (
    <TextField
      ref={inputRef}
      id={id}
      label="Clinic password"
      hint="The one this clinic signs in with, not a staff PIN. Don't let this browser save it."
      type="password"
      // Not "current-password": a browser that saved the clinic login would fill it in for anyone at the desk.
      name="clinic-confirm"
      autoComplete="new-password"
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
    />
  );
}
