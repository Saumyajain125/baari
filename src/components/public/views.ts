/**
 * View models for the public surfaces (TV, patient join + status). Builders
 * turn today's public tickets into plain props; previews feed fixtures
 * instead. Public tickets carry no names or phones, and nothing here adds any.
 */
import { pauseMessage } from "@/components/reception/handlers";
import {
  aheadCount,
  computeStats,
  doctorHasStarted,
  estimateWait,
  formatEstimate,
  servingFor,
  waitingFor,
} from "@/lib/queue/logic";
import { minutesOfDay } from "@/lib/time";
import type { Clinic, DeskTicket, Distance, Doctor, QueueDay, Ticket, TicketStatus } from "@/lib/types";
import { buildDoctorQueueView } from "@/lib/view";

/** How many upcoming tokens the TV lists per doctor. */
export const TV_NEXT_COUNT = 5;

export interface TvDoctorView {
  id: string;
  prefix: string;
  name: string;
  room: string;
  /** Token with the doctor now, e.g. "A-18", or null. */
  nowCalling: string | null;
  /** Changes on every Next / Call again (lastCallAt); the panel flashes when it does. */
  callKey: number | null;
  /** Up to five upcoming tokens, in call order. */
  next: string[];
  waitingCount: number;
  /** "Doctor is on a short break (Lunch). Back around 1:30 PM. Your place is safe." */
  pausedMessage: string | null;
  /** "Starts 11:00 AM" while the doctor hasn't started yet. */
  startsAtLabel: string | null;
}

export interface TvView {
  clinicName: string;
  /** "Thu, 29 Oct" */
  dateLabel: string;
  /** "10:51 AM" */
  clock: string;
  doctors: TvDoctorView[];
}

/**
 * Public tickets dressed as desk tickets with blank names, so the TV reuses the
 * desk's own rules for "starts later", pause and ordering.
 */
function anonymous(tickets: Ticket[]): DeskTicket[] {
  return tickets.map((t) => ({ ...t, name: "", phone: null, pending: false }));
}

function pauseText(paused: { reason: string; backAtLabel: string | null } | null): string | null {
  return paused ? pauseMessage(paused.reason, paused.backAtLabel) : null;
}

export function buildTvDoctor(
  doctor: Doctor,
  tickets: Ticket[],
  queue: QueueDay | undefined,
  now: number,
  timezone: string,
): TvDoctorView {
  const view = buildDoctorQueueView(doctor, anonymous(tickets), queue, now, timezone);
  const serving = servingFor(tickets, doctor.id);
  return {
    id: doctor.id,
    prefix: doctor.prefix,
    name: doctor.name,
    room: doctor.room,
    nowCalling: serving?.label ?? null,
    callKey: serving?.lastCallAt ?? null,
    next: view.rows.slice(0, TV_NEXT_COUNT).map((r) => r.label),
    waitingCount: view.doctor.waitingCount,
    pausedMessage: pauseText(view.paused),
    startsAtLabel: view.doctor.startsAtLabel,
  };
}

/**
 * Minutes, in 5-minute steps, before the doctor calls anyone: until a break's
 * "back around" time or a later start time, whichever is further off. null
 * while on a break with no return time ("Not sure").
 */
export function holdMinutes(
  doctor: Pick<Doctor, "id" | "startsAt">,
  tickets: Ticket[],
  queue: QueueDay | undefined,
  now: number,
  timezone: string,
): number | null {
  const paused = queue?.paused;
  if (paused && paused.backAt == null) return null;
  const breakMin = paused?.backAt != null ? (paused.backAt - now) / 60_000 : 0;
  // Same rule as the desk's "Starts 11:00 AM": only until anyone has been called.
  const started = doctorHasStarted(tickets, doctor.id);
  const startMin = doctor.startsAt && !started ? hhmmToMinutes(doctor.startsAt) - minutesOfDay(now, timezone) : 0;
  return Math.round(Math.max(0, breakMin, startMin) / 5) * 5;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * "approx 25 to 30 min", or "You're next" when nobody is ahead (same wording
 * as the token slip). `holdMin` (see holdMinutes) pushes the range back by a
 * break or a later start; null words it as "after the break".
 */
export function etaText(ahead: number, avgConsultMin: number, holdMin: number | null = 0): string {
  if (holdMin === null) {
    return ahead === 0 ? "Right after the break" : `${formatEstimate(estimateWait(ahead, avgConsultMin))} after the break`;
  }
  if (ahead === 0 && holdMin === 0) return "You're next";
  const e = estimateWait(ahead, avgConsultMin);
  return formatEstimate({ lowMin: e.lowMin + holdMin, highMin: e.highMin + holdMin });
}

/** Today's mean consult for a doctor, falling back to the clinic default before the first one ends. */
export function avgConsultFor(tickets: Ticket[], doctorId: string, clinic: Pick<Clinic, "defaultConsultMin">): number {
  return computeStats(tickets, doctorId).avgConsultMin ?? clinic.defaultConsultMin;
}

/* ---------- Patient join ---------- */

export interface JoinDoctorOption {
  id: string;
  prefix: string;
  name: string;
  room: string;
  waitingCount: number;
  /** Wait for someone joining now: "approx 50 to 60 min", "You'd be next" or "… after the break". */
  etaText: string;
  /** "Paused · back around 1:30 PM" */
  pausedNote: string | null;
  startsAtLabel: string | null;
}

export function buildJoinDoctorOption(
  doctor: Doctor,
  tickets: Ticket[],
  queue: QueueDay | undefined,
  clinic: Pick<Clinic, "defaultConsultMin" | "timezone">,
  now: number,
): JoinDoctorOption {
  const view = buildDoctorQueueView(doctor, anonymous(tickets), queue, now, clinic.timezone);
  const waiting = view.doctor.waitingCount;
  const paused = view.paused;
  const hold = holdMinutes(doctor, tickets, queue, now, clinic.timezone);
  let eta: string;
  if (waiting === 0 && hold === 0) eta = "You'd be next";
  else if (waiting === 0 && hold === null) eta = "You'd be next, after the break";
  else eta = etaText(waiting, avgConsultFor(tickets, doctor.id, clinic), hold);
  return {
    id: doctor.id,
    prefix: doctor.prefix,
    name: doctor.name,
    room: doctor.room,
    waitingCount: waiting,
    etaText: eta,
    pausedNote: paused ? (paused.backAtLabel ? `Paused · back around ${paused.backAtLabel}` : "Paused for a short break") : null,
    startsAtLabel: view.doctor.startsAtLabel,
  };
}

/* ---------- Patient status ---------- */

/** Where the patient's ticket is. "expired" = an unfinished token from an earlier day. */
export type PatientPhase = "waiting" | "serving" | "done" | "no_show" | "removed" | "expired";

export interface PatientStatusView {
  clinicName: string;
  doctorName: string;
  room: string;
  label: string;
  /** The name they joined with; only readable on the phone that joined. */
  name: string | null;
  phase: PatientPhase;
  /** The patient left on their own (vs. removed at the desk). */
  leftByPatient: boolean;
  /** People ahead in the waiting list, or null while the list is loading. */
  ahead: number | null;
  /** "approx 25 to 30 min" / "You're next" / "… after the break", or null while loading. */
  etaText: string | null;
  /** Token with the doctor now. */
  nowServing: string | null;
  pausedMessage: string | null;
  /** They were called, didn't come in, and were moved back. */
  noReply: boolean;
  distance: Distance;
  /** The phone that joined may change distance and leave; any other phone only watches. */
  canEdit: boolean;
  /** Changes on every call while serving; the page re-alerts when it does. */
  callKey: number | null;
  /** "Thu, 29 Oct" of the ticket, for expired tokens. */
  dateLabel: string;
}

const PHASES: Record<TicketStatus, PatientPhase> = {
  waiting: "waiting",
  serving: "serving",
  done: "done",
  no_show: "no_show",
  removed: "removed",
};

export interface PatientStatusInput {
  clinic: Pick<Clinic, "name" | "defaultConsultMin" | "timezone">;
  doctor: Pick<Doctor, "id" | "name" | "room" | "startsAt">;
  ticket: Ticket;
  /** Today's public tickets for the clinic, or null while loading. */
  tickets: Ticket[] | null;
  queue: QueueDay | undefined;
  today: string;
  dateLabel: string;
  name: string | null;
  canEdit: boolean;
  backAtLabel: string | null;
  /** For ETAs that wait out a break or a later start. */
  now: number;
}

export function buildPatientStatus(input: PatientStatusInput): PatientStatusView {
  const { clinic, doctor, ticket, tickets, queue } = input;
  const unfinished = ticket.status === "waiting" || ticket.status === "serving";
  const phase: PatientPhase = unfinished && ticket.date !== input.today ? "expired" : PHASES[ticket.status];

  // The ticket list can lag the ticket's own snapshot; until it includes this
  // ticket, the count would be wrong (often "You're next"), so show nothing.
  const listed = tickets?.some((t) => t.id === ticket.id) ?? false;
  let ahead: number | null = null;
  let eta: string | null = null;
  if (tickets && listed && phase === "waiting") {
    ahead = aheadCount(waitingFor(tickets, doctor.id), ticket.id);
    const hold = holdMinutes(doctor, tickets, queue, input.now, clinic.timezone);
    eta = etaText(ahead, avgConsultFor(tickets, doctor.id, clinic), hold);
  }

  return {
    clinicName: clinic.name,
    doctorName: doctor.name,
    room: doctor.room,
    label: ticket.label,
    name: input.name,
    phase,
    leftByPatient: ticket.status === "removed" && ticket.updatedBy === "patient",
    ahead,
    etaText: eta,
    nowServing: tickets ? (servingFor(tickets, doctor.id)?.label ?? null) : null,
    pausedMessage: queue?.paused ? pauseMessage(queue.paused.reason, input.backAtLabel) : null,
    noReply: ticket.noReplyAt != null && phase === "waiting",
    distance: ticket.distance,
    canEdit: input.canEdit,
    callKey: ticket.status === "serving" ? ticket.lastCallAt : null,
    dateLabel: input.dateLabel,
  };
}
