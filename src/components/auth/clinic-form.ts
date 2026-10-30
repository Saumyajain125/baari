/**
 * Form drafts and validation shared by the first-run setup and Settings.
 * Drafts hold raw input strings; `toDoctorInput` / `toStaffInput` turn a
 * valid draft into what src/lib/clinic-admin.ts writes.
 */
import type { DoctorInput, StaffInput } from "@/lib/clinic-admin";
import { DEFAULT_TIMEZONE } from "@/lib/time";

/** "W" is the laptop desk's Add walk-in shortcut, so no doctor can own it. */
export const RESERVED_PREFIXES = new Set(["W"]);

export const MAX_DOCTORS = 12;

export interface DoctorDraft {
  /** React list key only. */
  key: string;
  name: string;
  prefix: string;
  room: string;
  /** "HH:mm" or "" for "from opening". */
  startsAt: string;
}

export interface StaffDraft {
  key: string;
  name: string;
  pin: string;
  pinAgain: string;
}

export type DoctorErrors = Partial<Record<"name" | "prefix" | "room" | "startsAt", string>>;
export type StaffErrors = Partial<Record<"name" | "pin" | "pinAgain", string>>;

let draftSeq = 0;
function draftKey(kind: string): string {
  draftSeq += 1;
  return `${kind}-${draftSeq}`;
}

export function newDoctorDraft(prefix = "", seed: Partial<Omit<DoctorDraft, "key">> = {}): DoctorDraft {
  return { key: draftKey("doctor"), name: "", prefix, room: "", startsAt: "", ...seed };
}

export function newStaffDraft(seed: Partial<Omit<StaffDraft, "key">> = {}): StaffDraft {
  return { key: draftKey("staff"), name: "", pin: "", pinAgain: "", ...seed };
}

/** First letter A-Z not taken (and not reserved), or "" when all are used. */
export function nextFreePrefix(taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (p) => p.trim().toUpperCase()));
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter) && !RESERVED_PREFIXES.has(letter)) return letter;
  }
  return "";
}

/** Keeps the prefix box to one upper-case letter as the user types. */
export function cleanPrefix(raw: string): string {
  const letters = raw.toUpperCase().replace(/[^A-Z]/g, "");
  return letters.slice(-1);
}

/** Digits only, at most four: what the PIN boxes accept. */
export function cleanPin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

/** "2" → "Room 2"; anything with words ("Cabin 1", "OPD") is kept as typed. */
export function normalizeRoom(room: string): string {
  const trimmed = room.trim().replace(/\s+/g, " ");
  return /^\d+[A-Za-z]?$/.test(trimmed) ? `Room ${trimmed}` : trimmed;
}

export function validateClinicName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Type the clinic's name, as patients know it.";
  if (trimmed.length > 60) return "Keep the name under 60 characters.";
  return null;
}

/**
 * `others` are the doctors this one must not clash with: every other draft
 * during setup, the other active doctors in Settings.
 */
export function validateDoctor(d: DoctorDraft, others: Pick<DoctorInput, "prefix" | "name">[]): DoctorErrors {
  const errors: DoctorErrors = {};
  const prefix = d.prefix.trim().toUpperCase();

  if (!d.name.trim()) errors.name = "Type the doctor's name.";
  else if (d.name.trim().length > 60) errors.name = "Keep the name under 60 characters.";

  if (!/^[A-Z]$/.test(prefix)) errors.prefix = "One letter, A to Z.";
  else if (RESERVED_PREFIXES.has(prefix)) errors.prefix = "W is the walk-in key. Pick another letter.";
  else {
    const clash = others.find((o) => o.prefix.trim().toUpperCase() === prefix);
    if (clash) errors.prefix = `${prefix} is taken by ${clash.name.trim() || "another doctor"}.`;
  }

  if (!d.room.trim()) errors.room = "Where patients go, e.g. Room 2.";
  else if (d.room.trim().length > 24) errors.room = "Keep it short, e.g. Room 2.";

  if (d.startsAt && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startsAt)) errors.startsAt = "Use a time like 11:00.";

  return errors;
}

export function validateStaff(s: StaffDraft, otherNames: string[]): StaffErrors {
  const errors: StaffErrors = {};
  const name = s.name.trim();
  if (!name) errors.name = "Type their name.";
  else if (name.length > 40) errors.name = "Keep the name under 40 characters.";
  else if (otherNames.some((n) => n.trim().toLowerCase() === name.toLowerCase()))
    errors.name = "Someone already has this name. Add a surname or initial.";
  Object.assign(errors, validatePinPair(s.pin, s.pinAgain));
  return errors;
}

export function validatePinPair(pin: string, pinAgain: string): Pick<StaffErrors, "pin" | "pinAgain"> {
  if (!/^\d{4}$/.test(pin)) return { pin: "PIN must be 4 digits." };
  if (pinAgain !== pin) return { pinAgain: "The two PINs don't match." };
  return {};
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

export function toDoctorInput(d: DoctorDraft): DoctorInput {
  return {
    name: d.name.trim(),
    prefix: d.prefix.trim().toUpperCase(),
    room: normalizeRoom(d.room),
    startsAt: d.startsAt || null,
  };
}

export function toStaffInput(s: StaffDraft): StaffInput {
  return { name: s.name.trim(), pin: s.pin };
}

/** Zones offered at setup; the device's own zone is added when it isn't listed. */
export const TIMEZONES: { value: string; label: string }[] = [
  { value: DEFAULT_TIMEZONE, label: "India (IST, UTC+5:30)" },
  { value: "Asia/Kathmandu", label: "Nepal (UTC+5:45)" },
  { value: "Asia/Dhaka", label: "Bangladesh (UTC+6)" },
  { value: "Asia/Colombo", label: "Sri Lanka (UTC+5:30)" },
  { value: "Asia/Karachi", label: "Pakistan (UTC+5)" },
  { value: "Asia/Dubai", label: "UAE (UTC+4)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "Africa/Nairobi", label: "Kenya (UTC+3)" },
  { value: "Europe/London", label: "United Kingdom" },
  { value: "America/New_York", label: "US Eastern" },
];

export function timezoneOptions(current: string): { value: string; label: string }[] {
  return TIMEZONES.some((z) => z.value === current) ? TIMEZONES : [...TIMEZONES, { value: current, label: current }];
}
