/**
 * Writes a patient makes from their own phone after scanning the QR poster.
 * Patients sign in anonymously, and their uid is stored on the ticket's
 * private doc, so Firestore rules can let them (and only them) read their
 * name and phone back, change how far away they are, or leave the queue.
 *
 * Unlike the desk, joining is a transaction: a patient needs a connection to
 * get a token, and the number must never clash with a walk-in issued at the
 * desk at the same moment.
 */
import { signInAnonymously, type User } from "firebase/auth";
import { collection, doc, runTransaction, updateDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import type { Distance, Doctor, QueueDay, Ticket, TicketPrivate, VisitType } from "@/lib/types";
import { positionForToken, tokenLabel } from "@/lib/queue/logic";

/** `updatedBy` value for every change a patient makes. */
export const PATIENT_ACTOR = "patient";

/** Longest name firestore.rules accepts on a ticket's private doc. */
export const MAX_NAME_LENGTH = 80;

/**
 * An error whose message is written for the patient and can be shown as is.
 * Anything else (Firebase, network, browser) gets the join page's generic copy.
 */
export class PatientFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatientFacingError";
  }
}

/**
 * What a refused join tells the patient. The usual cause is a phone clock more
 * than 5 minutes off the server's (firestore.rules isNearNow).
 */
const JOIN_REFUSED =
  "Couldn't get a token. Make sure your phone's date and time are set automatically, then try again, or ask at reception.";

/** Signs the phone in anonymously, reusing the persisted session if there is one. */
export async function ensurePatientAuth(): Promise<User> {
  const auth = getFirebaseAuth();
  // currentUser is null until the persisted session has been restored.
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export interface JoinInput {
  name: string;
  /** Normalised 10-digit mobile, or null. */
  phone: string | null;
  visitType: VisitType;
  distance: Distance;
}

export interface JoinedTicket {
  ticketId: string;
  token: number;
  /** "A-27" */
  label: string;
  joinedAt: number;
}

/**
 * Takes the next token for `doctor` on `date` and creates the public ticket
 * plus its private name/phone doc. An existing queue day only ever has its
 * `lastToken` bumped, so a patient can't touch the pause or heartbeat fields.
 * The ticket id is fixed before the transaction, so when the SDK retries it
 * (e.g. the commit landed but the reply was lost) it finds the ticket instead
 * of taking a second number. Pass the same `ticketId` (see newTicketId) when
 * the patient retries after the SDK gave up, for the same reason.
 */
export async function joinQueue(
  clinicId: string,
  date: string,
  doctor: Pick<Doctor, "id" | "prefix">,
  input: JoinInput,
  ticketId?: string,
): Promise<JoinedTicket> {
  const name = input.name.trim();
  if (!name) throw new PatientFacingError("A name is needed to join the queue.");
  // firestore.rules caps names at this length.
  if (name.length > MAX_NAME_LENGTH) {
    throw new PatientFacingError(`Please keep the name under ${MAX_NAME_LENGTH} characters.`);
  }

  const user = await ensurePatientAuth();
  const db = getDb();
  const queueRef = doc(db, paths.queue(clinicId, doctor.id, date));
  const ticketRef = ticketId ? doc(db, paths.ticket(clinicId, ticketId)) : doc(collection(db, paths.tickets(clinicId)));
  const privRef = doc(db, paths.ticketPrivate(clinicId, ticketRef.id));
  const now = Date.now();

  const token = await runTransaction(db, async (tx) => {
    // Writing again would be an update, which patients aren't allowed, so the
    // retry would fail and the patient's own retry would issue a duplicate.
    const existing = await tx.get(ticketRef);
    if (existing.exists()) {
      const data = existing.data();
      // Not this attempt's token: handing it back would send them to the wrong queue.
      if (data.doctorId !== doctor.id || data.date !== date) {
        throw new PatientFacingError("Something went wrong getting your token. Please try again.");
      }
      return Number(data.token);
    }
    const snap = await tx.get(queueRef);
    const token = (snap.exists() ? Number(snap.data().lastToken ?? 0) : 0) + 1;

    if (snap.exists()) {
      tx.update(queueRef, { lastToken: token });
    } else {
      const day: Omit<QueueDay, "id"> = {
        clinicId,
        doctorId: doctor.id,
        date,
        lastToken: token,
        paused: null,
        doctorButtonSeenAt: null,
      };
      tx.set(queueRef, day);
    }

    const ticket: Omit<Ticket, "id"> = {
      clinicId,
      doctorId: doctor.id,
      date,
      token,
      label: tokenLabel(doctor.prefix, token),
      status: "waiting",
      position: positionForToken(token),
      // Reception decides who jumps the queue; a patient can't mark themselves priority.
      priority: false,
      visitType: input.visitType,
      distance: input.distance,
      source: "qr",
      createdAt: now,
      calledAt: null,
      lastCallAt: null,
      callCount: 0,
      noReplyAt: null,
      finishedAt: null,
      consultMs: null,
      updatedBy: PATIENT_ACTOR,
      updatedAt: now,
    };
    const priv: Omit<TicketPrivate, "id"> = {
      clinicId,
      date,
      name,
      phone: input.phone,
      patientUid: user.uid,
    };
    tx.set(ticketRef, ticket);
    tx.set(privRef, priv);
    return token;
  }).catch((err: unknown) => {
    if (err instanceof Error && "code" in err && err.code === "permission-denied") {
      throw new PatientFacingError(JOIN_REFUSED);
    }
    throw err;
  });

  return { ticketId: ticketRef.id, token, label: tokenLabel(doctor.prefix, token), joinedAt: now };
}

/** A fresh ticket id, so a patient's manual retry of the same join can reuse it (see joinQueue). */
export function newTicketId(clinicId: string): string {
  return doc(collection(getDb(), paths.tickets(clinicId))).id;
}

type TicketRef = Pick<Ticket, "id" | "clinicId">;

/**
 * "I'm 15 to 30 min away": tells the desk how far the patient is. Resolves
 * once the server has it; the patient's own snapshot updates right away.
 */
export function updateDistance(ticket: TicketRef, distance: Distance): Promise<void> {
  return updateDoc(doc(getDb(), paths.ticket(ticket.clinicId, ticket.id)), {
    distance,
    updatedAt: Date.now(),
    updatedBy: PATIENT_ACTOR,
  });
}

/** The patient gives up their place. The desk sees the ticket disappear from its list. */
export function leaveQueue(ticket: TicketRef): Promise<void> {
  const now = Date.now();
  return updateDoc(doc(getDb(), paths.ticket(ticket.clinicId, ticket.id)), {
    status: "removed",
    finishedAt: now,
    updatedAt: now,
    updatedBy: PATIENT_ACTOR,
  });
}

/* ---------- The token this phone joined with, kept across reloads ---------- */

export interface RememberedTicket {
  ticketId: string;
  label: string;
  doctorId: string;
  /** Clinic-local "YYYY-MM-DD" the token belongs to. */
  date: string;
}

export function rememberedTicketKey(clinicId: string): string {
  return `baari:patient:${clinicId}`;
}

/** Raw stored value (a stable string, so it can back useSyncExternalStore). */
export function readRememberedTicketRaw(clinicId: string): string | null {
  try {
    return window.localStorage.getItem(rememberedTicketKey(clinicId));
  } catch {
    return null;
  }
}

/** Parses a stored value, keeping it only if it belongs to `date`. */
export function parseRememberedTicket(raw: string | null, date: string): RememberedTicket | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRememberedTicket(value) || value.date !== date) return null;
    return value;
  } catch {
    return null;
  }
}

export function rememberTicket(clinicId: string, ticket: RememberedTicket): void {
  try {
    window.localStorage.setItem(rememberedTicketKey(clinicId), JSON.stringify(ticket));
  } catch {
    // Private mode or storage full: the status link still works, we just can't offer it later.
  }
}

export function forgetTicket(clinicId: string): void {
  try {
    window.localStorage.removeItem(rememberedTicketKey(clinicId));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

function isRememberedTicket(v: unknown): v is RememberedTicket {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.ticketId === "string" &&
    typeof r.label === "string" &&
    typeof r.doctorId === "string" &&
    typeof r.date === "string"
  );
}
