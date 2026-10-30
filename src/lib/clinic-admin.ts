/**
 * Clinic account administration: the first-run setup and the Settings page.
 * The desk's own writes live in src/lib/queue/actions.ts.
 *
 * Settings writes resolve when the server has them. Like desk writes they
 * apply locally at once (the live snapshots show the change), so UI code
 * should catch errors rather than wait on the promise while offline.
 */
import { collection, deleteDoc, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import { hashPin, initialsOf, newSalt } from "@/lib/pin";
import type { Clinic, Doctor, Member, Staff } from "@/lib/types";

/** ETA basis until the day has real consult data. */
export const DEFAULT_CONSULT_MIN = 6;
/** Reception locks itself after this many idle minutes. */
export const DEFAULT_LOCK_AFTER_MIN = 10;

export interface DoctorInput {
  name: string;
  /** One upper-case letter, unique among the clinic's active doctors. */
  prefix: string;
  /** As patients see it on slips and the TV, e.g. "Room 2". */
  room: string;
  /** "HH:mm" in clinic time when the doctor starts later in the day, else null. */
  startsAt: string | null;
}

export interface StaffInput {
  name: string;
  /** Four digits. Only a salted hash is stored. */
  pin: string;
}

export interface ClinicSetupInput {
  name: string;
  /** IANA zone, e.g. "Asia/Kolkata". */
  timezone: string;
  doctors: DoctorInput[];
  staff: StaffInput[];
}

export type ClinicPatch = Partial<Pick<Clinic, "name" | "timezone" | "defaultConsultMin" | "lockAfterMin">>;

function doctorFields(input: DoctorInput): Pick<Doctor, "name" | "prefix" | "room" | "startsAt"> {
  return {
    name: input.name.trim(),
    prefix: input.prefix.trim().toUpperCase(),
    room: input.room.trim(),
    startsAt: input.startsAt || null,
  };
}

async function pinFields(pin: string): Promise<Pick<Staff, "pinHash" | "pinSalt">> {
  const pinSalt = newSalt();
  return { pinHash: await hashPin(pin, pinSalt), pinSalt };
}

async function staffDoc(input: StaffInput, order: number): Promise<Omit<Staff, "id">> {
  const name = input.name.trim();
  return { name, initials: initialsOf(name), ...(await pinFields(input.pin)), order };
}

/**
 * Creates the clinic, makes `uid` its owner and a desk member, points
 * users/{uid} at it and adds the doctors and staff, all in one batch so a
 * half-made clinic can never exist. Resolves with the new clinic id.
 */
export async function createClinicWithSetup(uid: string, input: ClinicSetupInput): Promise<string> {
  // Hash PINs before the batch: nothing async may happen between its writes.
  const staff = await Promise.all(input.staff.map((s, i) => staffDoc(s, i)));

  const db = getDb();
  // paths.ts names single clinics only; the parent of any clinic ref is the
  // clinics collection, which mints a fresh auto id without a second path string.
  const clinicRef = doc(doc(db, paths.clinic("_")).parent);
  const clinicId = clinicRef.id;
  const now = Date.now();

  const clinic: Omit<Clinic, "id"> = {
    name: input.name.trim(),
    ownerUid: uid,
    timezone: input.timezone,
    defaultConsultMin: DEFAULT_CONSULT_MIN,
    lockAfterMin: DEFAULT_LOCK_AFTER_MIN,
    createdAt: now,
  };
  const member: Member = { uid, role: "owner", addedAt: now };

  const batch = writeBatch(db);
  batch.set(clinicRef, clinic);
  batch.set(doc(db, paths.member(clinicId, uid)), member);
  batch.set(doc(db, paths.user(uid)), { clinicId });
  input.doctors.forEach((d, order) => {
    const doctor: Omit<Doctor, "id"> = { ...doctorFields(d), order, active: true };
    batch.set(doc(collection(db, paths.doctors(clinicId))), doctor);
  });
  for (const s of staff) batch.set(doc(collection(db, paths.staff(clinicId))), s);
  await batch.commit();
  return clinicId;
}

export function updateClinic(clinicId: string, patch: ClinicPatch): Promise<void> {
  const fields: ClinicPatch = { ...patch };
  if (fields.name !== undefined) fields.name = fields.name.trim();
  return updateDoc(doc(getDb(), paths.clinic(clinicId)), fields);
}

/**
 * Adds a doctor (no `id`) as an active tab at `order`, or edits an existing
 * doctor's details in place (their active flag is left alone).
 */
export function upsertDoctor(clinicId: string, doctor: DoctorInput & { id?: string; order: number }): Promise<void> {
  const db = getDb();
  const fields = { ...doctorFields(doctor), order: doctor.order };
  if (doctor.id) return updateDoc(doc(db, paths.doctor(clinicId, doctor.id)), fields);
  const created: Omit<Doctor, "id"> = { ...fields, active: true };
  return setDoc(doc(collection(db, paths.doctors(clinicId))), created);
}

/** Inactive doctors keep their history but drop off the desk, TV and join page. */
export function setDoctorActive(clinicId: string, doctorId: string, active: boolean): Promise<void> {
  return updateDoc(doc(getDb(), paths.doctor(clinicId, doctorId)), { active });
}

export async function addStaff(clinicId: string, input: StaffInput, order: number): Promise<void> {
  const staff = await staffDoc(input, order);
  return setDoc(doc(collection(getDb(), paths.staff(clinicId))), staff);
}

/** Replaces the PIN with a fresh salt, so the old hash can't be reused. */
export async function resetStaffPin(clinicId: string, staffId: string, pin: string): Promise<void> {
  const fields = await pinFields(pin);
  return updateDoc(doc(getDb(), paths.staffMember(clinicId, staffId)), fields);
}

export function removeStaff(clinicId: string, staffId: string): Promise<void> {
  return deleteDoc(doc(getDb(), paths.staffMember(clinicId, staffId)));
}
