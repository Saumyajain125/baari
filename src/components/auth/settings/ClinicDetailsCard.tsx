"use client";

import { useId, useState, type FormEvent } from "react";
import type { ClinicPatch } from "@/lib/clinic-admin";
import type { Clinic } from "@/lib/types";
import { timezoneOptions, validateClinicName } from "../clinic-form";
import { SelectChevron, TextField, labelClass, selectClass } from "../ui";
import { Card, CardHeader, RowButton } from "./parts";

interface Edits {
  name?: string;
  consult?: string;
  lockAfter?: string;
  timezone?: string;
}

type Errors = Partial<Record<"name" | "consult" | "lockAfter", string>>;

/** Whole minutes within [min, max], or an error message. */
function parseMinutes(raw: string, min: number, max: number): number | string {
  const value = Number(raw.trim());
  if (!raw.trim() || !Number.isInteger(value)) return "Whole minutes, e.g. 6.";
  if (value < min || value > max) return `Between ${min} and ${max} minutes.`;
  return value;
}

const Suffix = () => <span className="pr-3 text-[15px] text-muted">min</span>;

/**
 * Clinic name, ETA default and auto-lock delay. Untouched fields follow the
 * live clinic doc, so a change made on another device shows up here.
 */
export function ClinicDetailsCard({ clinic, onSave }: { clinic: Clinic; onSave(patch: ClinicPatch): void }) {
  const id = useId();
  const [edits, setEdits] = useState<Edits>({});
  const [errors, setErrors] = useState<Errors>({});

  const name = edits.name ?? clinic.name;
  const consult = edits.consult ?? String(clinic.defaultConsultMin);
  const lockAfter = edits.lockAfter ?? String(clinic.lockAfterMin);
  const timezone = edits.timezone ?? clinic.timezone;
  const dirty =
    name.trim() !== clinic.name ||
    consult.trim() !== String(clinic.defaultConsultMin) ||
    lockAfter.trim() !== String(clinic.lockAfterMin) ||
    timezone !== clinic.timezone;

  function edit(patch: Edits) {
    setEdits((e) => ({ ...e, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameError = validateClinicName(name);
    const consultMin = parseMinutes(consult, 1, 60);
    const lockMin = parseMinutes(lockAfter, 0, 120);
    if (nameError || typeof consultMin === "string" || typeof lockMin === "string") {
      setErrors({
        name: nameError ?? undefined,
        consult: typeof consultMin === "string" ? consultMin : undefined,
        lockAfter: typeof lockMin === "string" ? lockMin : undefined,
      });
      const first = nameError ? "name" : typeof consultMin === "string" ? "consult" : "lock";
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    const patch: ClinicPatch = {};
    if (name.trim() !== clinic.name) patch.name = name.trim();
    if (consultMin !== clinic.defaultConsultMin) patch.defaultConsultMin = consultMin;
    if (lockMin !== clinic.lockAfterMin) patch.lockAfterMin = lockMin;
    if (timezone !== clinic.timezone) patch.timezone = timezone;
    if (Object.keys(patch).length > 0) onSave(patch);
    setEdits({});
    setErrors({});
  }

  function discard() {
    setEdits({});
    setErrors({});
  }

  return (
    <Card labelledBy={`${id}-title`}>
      <CardHeader id={`${id}-title`} title="Clinic" description="Shown on the TV, token slips and patients' phones." />
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <TextField
          id={`${id}-name`}
          label="Clinic name"
          autoComplete="organization"
          value={name}
          onChange={(e) => edit({ name: e.target.value })}
          error={errors.name}
        />
        <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-3">
          <TextField
            id={`${id}-consult`}
            label="Default consult time"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={consult}
            onChange={(e) => edit({ consult: e.target.value })}
            error={errors.consult}
            hint="Used for wait estimates until today has real consults."
            trailing={<Suffix />}
          />
          <TextField
            id={`${id}-lock`}
            label="Lock reception after"
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={lockAfter}
            onChange={(e) => edit({ lockAfter: e.target.value })}
            error={errors.lockAfter}
            hint="Minutes without a tap. 0 turns the auto-lock off."
            trailing={<Suffix />}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-tz`} className={labelClass}>
            Time zone
          </label>
          <div className="relative">
            <select
              id={`${id}-tz`}
              aria-describedby={`${id}-tz-note`}
              value={timezone}
              onChange={(e) => edit({ timezone: e.target.value })}
              className={selectClass}
            >
              {timezoneOptions(clinic.timezone).map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
          <p id={`${id}-tz-note`} className="text-[13px] leading-snug text-muted">
            The queue starts fresh at midnight here. Change it only if it&apos;s wrong.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <RowButton size="lg" onClick={discard}>
              Discard
            </RowButton>
          )}
          <RowButton size="lg" type="submit" tone="primary" disabled={!dirty}>
            Save changes
          </RowButton>
        </div>
      </form>
    </Card>
  );
}
