/**
 * Firestore data model. All timestamps are epoch milliseconds from the
 * writing device's clock: reception must keep working offline, and
 * serverTimestamp() values are null until they sync, which breaks the
 * ordering and timers the desk relies on.
 *
 *   clinics/{clinicId}                     Clinic          public read
 *   clinics/{clinicId}/members/{uid}       Member          staff devices allowed to run the desk
 *   clinics/{clinicId}/doctors/{doctorId}  Doctor          public read
 *   clinics/{clinicId}/staff/{staffId}     Staff           members only (holds PIN hashes)
 *   clinics/{clinicId}/queues/{queueId}    QueueDay        public read; queueId = `${doctorId}_${date}`
 *   clinics/{clinicId}/tickets/{ticketId}  Ticket          public read; no names or phone numbers
 *   clinics/{clinicId}/ticketPrivate/{id}  TicketPrivate   members + the patient who joined
 *   users/{uid}                            UserProfile     the signed-in clinic account
 */

export type VisitType = "new" | "follow_up" | "emergency";

/** How far the patient said they are from the clinic. Walk-ins are "here". */
export type Distance = "here" | "under_15" | "15_30" | "over_30";

export type TicketStatus = "waiting" | "serving" | "done" | "no_show" | "removed";

export type TicketSource = "walk_in" | "qr";

export interface Clinic {
  id: string;
  name: string;
  ownerUid: string;
  /** IANA zone used to decide what "today" is. */
  timezone: string;
  /** Used for ETAs until the day has real consult data. */
  defaultConsultMin: number;
  /** Reception auto-locks after this many idle minutes. */
  lockAfterMin: number;
  createdAt: number;
}

export interface Member {
  uid: string;
  role: "owner" | "desk";
  addedAt: number;
}

export interface Doctor {
  id: string;
  name: string;
  /** Single letter used in token labels and keyboard shortcuts, e.g. "A". */
  prefix: string;
  room: string;
  /** Sort order of the doctor tabs. */
  order: number;
  /** "HH:mm" in clinic time if the doctor starts later in the day, else null. */
  startsAt: string | null;
  active: boolean;
}

export interface Staff {
  id: string;
  name: string;
  initials: string;
  /** hex(SHA-256(salt + ":" + pin)) */
  pinHash: string;
  pinSalt: string;
  order: number;
}

export interface PauseInfo {
  /** Short reason shown to patients, e.g. "Lunch". */
  reason: string;
  since: number;
  /** When the doctor is expected back, or null for "Not sure". */
  backAt: number | null;
}

export interface QueueDay {
  id: string;
  clinicId: string;
  doctorId: string;
  /** Clinic-local date, "YYYY-MM-DD". */
  date: string;
  /** Last token number issued today. Next token is lastToken + 1. */
  lastToken: number;
  paused: PauseInfo | null;
  /** Heartbeat from the doctor's button page, for "Doctor's button linked". */
  doctorButtonSeenAt: number | null;
}

export interface Ticket {
  id: string;
  clinicId: string;
  doctorId: string;
  date: string;
  token: number;
  /** Display label, e.g. "A-25". */
  label: string;
  status: TicketStatus;
  /**
   * Sort key inside the waiting list (ascending). Joining sets token * 1000,
   * so later arrivals sort last; moves rewrite it to sit between neighbours.
   */
  position: number;
  /** Priority tickets sort ahead of everyone else (then by position). */
  priority: boolean;
  visitType: VisitType;
  distance: Distance;
  source: TicketSource;
  createdAt: number;
  /** When the patient was first called in: the consult timer starts here. */
  calledAt: number | null;
  /** Last time the token was announced (Next or Call again); the TV flashes on change. */
  lastCallAt: number | null;
  callCount: number;
  /** Set when a called patient didn't come in and was moved back. Drives "Called, no reply". */
  noReplyAt: number | null;
  /** When the ticket left the queue (done, no-show or removed). */
  finishedAt: number | null;
  /** Consult duration, set when the ticket is marked done. */
  consultMs: number | null;
  /** Staff id of whoever made the last change at the desk, or "patient". */
  updatedBy: string | null;
  updatedAt: number;
}

export interface TicketPrivate {
  id: string;
  clinicId: string;
  date: string;
  name: string;
  /** 10-digit mobile, or null when the patient has no phone. */
  phone: string | null;
  /** Anonymous-auth uid of a patient who joined by QR, so they can read their own ticket. */
  patientUid: string | null;
}

export interface UserProfile {
  uid: string;
  clinicId: string;
}

/** A ticket as the desk sees it: public fields + private fields + sync state. */
export interface DeskTicket extends Ticket {
  name: string;
  phone: string | null;
  /** True while this ticket has local writes that haven't reached the server. */
  pending: boolean;
}
