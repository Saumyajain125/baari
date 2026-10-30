"use client";

import type { ReactNode } from "react";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { initialsOf } from "@/lib/pin";
import { cleanPin, cleanPrefix, type DoctorDraft, type DoctorErrors, type StaffDraft, type StaffErrors } from "./clinic-form";
import { TextField, cx } from "./ui";

/**
 * Panel holding one doctor's or staff member's fields: grey (the 04 preview
 * box) inside a white card, or a white card when it sits on the canvas.
 */
function DraftCard({
  badge,
  title,
  removeLabel,
  onRemove,
  surface = false,
  children,
}: {
  badge: ReactNode;
  title: string;
  removeLabel: string;
  onRemove?: () => void;
  surface?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      className={cx(
        "m-0 flex min-w-0 flex-col gap-4 rounded-[16px] p-4",
        surface ? "border border-line bg-surface" : "border-0 bg-canvas",
      )}
    >
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3">
        {badge}
        <span aria-hidden="true" className="flex-1 text-[15px] font-semibold">
          {title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className="-my-1 flex size-11 items-center justify-center rounded-[12px] text-muted hover:bg-hover hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>
      {children}
    </fieldset>
  );
}

/** Teal letter tile, as the doctor tabs on the desk. */
export function LetterTile({ letter, muted = false, size = 36 }: { letter: string; muted?: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      className={cx(
        "flex shrink-0 items-center justify-center rounded-[10px] font-display leading-none font-extrabold",
        muted ? "bg-subtle text-faint" : "bg-teal text-white",
      )}
    >
      {letter || "?"}
    </span>
  );
}

/** Initials avatar, as the staff cards on the PIN lock. */
export function InitialsAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-teal-tint text-[15px] font-bold text-teal-dark"
    >
      {initialsOf(name) || "?"}
    </span>
  );
}

export interface DoctorFieldsProps {
  idBase: string;
  title: string;
  draft: DoctorDraft;
  errors: DoctorErrors;
  onChange(patch: Partial<DoctorDraft>): void;
  onRemove?: () => void;
  autoFocus?: boolean;
  /** White card for the canvas (setup) instead of the grey panel used inside cards. */
  surface?: boolean;
}

export function DoctorFields({ idBase, title, draft, errors, onChange, onRemove, autoFocus, surface }: DoctorFieldsProps) {
  return (
    <DraftCard
      badge={<LetterTile letter={draft.prefix} />}
      title={title}
      removeLabel={`Remove ${draft.name.trim() || title}`}
      onRemove={onRemove}
      surface={surface}
    >
      <TextField
        id={`${idBase}-name`}
        label="Name"
        placeholder="Dr. Anita Sharma"
        autoComplete="off"
        autoFocus={autoFocus}
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
      />
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-4 sm:grid-cols-[104px_minmax(0,1fr)_164px]">
        <TextField
          id={`${idBase}-prefix`}
          label="Letter"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={draft.prefix}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange({ prefix: cleanPrefix(e.target.value) })}
          error={errors.prefix}
          inputClassName="text-center font-display text-[22px] font-extrabold uppercase"
        />
        <TextField
          id={`${idBase}-room`}
          label="Room"
          placeholder="Room 2"
          autoComplete="off"
          value={draft.room}
          onChange={(e) => onChange({ room: e.target.value })}
          error={errors.room}
        />
        <TextField
          id={`${idBase}-starts`}
          className="col-span-2 sm:col-span-1"
          label="Starts at"
          labelHint="(optional)"
          type="time"
          value={draft.startsAt}
          onChange={(e) => onChange({ startsAt: e.target.value })}
          error={errors.startsAt}
          inputClassName="pr-2"
        />
      </div>
    </DraftCard>
  );
}

export interface StaffFieldsProps {
  idBase: string;
  title: string;
  draft: StaffDraft;
  errors: StaffErrors;
  onChange(patch: Partial<StaffDraft>): void;
  onRemove?: () => void;
  autoFocus?: boolean;
  /** White card for the canvas (setup) instead of the grey panel used inside cards. */
  surface?: boolean;
}

export function StaffFields({ idBase, title, draft, errors, onChange, onRemove, autoFocus, surface }: StaffFieldsProps) {
  return (
    <DraftCard
      badge={<InitialsAvatar name={draft.name} />}
      title={title}
      removeLabel={`Remove ${draft.name.trim() || title}`}
      onRemove={onRemove}
      surface={surface}
    >
      <TextField
        id={`${idBase}-name`}
        label="Name"
        placeholder="Rekha Kumari"
        autoComplete="off"
        autoFocus={autoFocus}
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        error={errors.name}
      />
      <PinPair idBase={idBase} draft={draft} errors={errors} onChange={onChange} />
    </DraftCard>
  );
}

/** PIN and confirmation, side by side. Masked digits with the numeric keypad on phones and tablets. */
export function PinPair({
  idBase,
  draft,
  errors,
  onChange,
  labels = ["PIN", "PIN again"],
  autoFocus,
}: {
  idBase: string;
  draft: Pick<StaffDraft, "pin" | "pinAgain">;
  errors: Pick<StaffErrors, "pin" | "pinAgain">;
  onChange(patch: Partial<Pick<StaffDraft, "pin" | "pinAgain">>): void;
  labels?: [string, string];
  autoFocus?: boolean;
}) {
  const pinInput = "font-display text-[22px] tracking-[0.4em] placeholder:font-sans placeholder:text-[16px] placeholder:tracking-normal";
  return (
    <div className="grid grid-cols-2 gap-2">
      <TextField
        id={`${idBase}-pin`}
        label={labels[0]}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        placeholder="4 digits"
        maxLength={4}
        autoFocus={autoFocus}
        value={draft.pin}
        onChange={(e) => onChange({ pin: cleanPin(e.target.value) })}
        error={errors.pin}
        inputClassName={pinInput}
      />
      <TextField
        id={`${idBase}-pin-again`}
        label={labels[1]}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Same 4 digits"
        maxLength={4}
        value={draft.pinAgain}
        onChange={(e) => onChange({ pinAgain: cleanPin(e.target.value) })}
        error={errors.pinAgain}
        inputClassName={pinInput}
      />
    </div>
  );
}

/** Dashed "add another" row under a list of draft cards. */
export function AddRowButton({ children, onClick, disabled }: { children: ReactNode; onClick(): void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[15px] font-semibold text-teal-dark hover:border-teal hover:bg-teal-tint disabled:border-line disabled:text-faint disabled:hover:bg-transparent"
    >
      <PlusIcon size={18} />
      {children}
    </button>
  );
}
