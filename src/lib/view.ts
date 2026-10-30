/**
 * View models: the plain props every reception layout renders from. Builders
 * here turn live Firestore data into these shapes; design previews feed them
 * fixture values instead (see src/lib/fixtures.ts). Components never touch
 * Firestore types directly, so they stay pure and previewable.
 */
import type { Clinic, DeskTicket, Doctor, QueueDay } from "@/lib/types";
import {
  computeStats,
  doctorHasStarted,
  formatAvgMinutes,
  servingFor,
  toRowView,
  tokenLabel,
  VISIT_TYPE_LABEL,
  waitingFor,
  type QueueRowView,
} from "@/lib/queue/logic";
import { formatClock, formatDayShort, formatElapsed, formatHHmm, minutesOfDay, sessionOf } from "@/lib/time";

export type { QueueRowView } from "@/lib/queue/logic";

export interface HeaderStatsView {
  inQueue: number;
  served: number;
  /** "5.8 min" */
  avgConsult: string;
  /** True when no consult has finished today and avgConsult is the clinic default. */
  avgConsultIsDefault: boolean;
  /** "22 min", or null before anyone has been called (the tile is hidden then). */
  avgWait: string | null;
}

export interface ClinicHeaderView {
  clinicName: string;
  /** "Thu, 29 Oct" */
  dateLabel: string;
  /** "Morning" | "Afternoon" | "Evening" */
  session: string;
  stats: HeaderStatsView;
}

export interface DoctorTabView {
  id: string;
  prefix: string;
  name: string;
  room: string;
  waitingCount: number;
  /** "Starts 11:00 AM" pill text while the doctor hasn't started, else null. */
  startsAtLabel: string | null;
  paused: boolean;
}

export interface ServingView {
  ticketId: string;
  label: string;
  name: string;
  phoneMasked: string | null;
  visitTypeLabel: string;
  /** Time in room, "6:12". */
  inRoom: string;
  /** Whole minutes in room so far, for "Saves A-18 as done · 6 min consult". */
  consultMin: number;
  /** Local change not yet synced ("Saved offline, not synced"). */
  pending: boolean;
}

export interface NextUpView {
  ticketId: string;
  label: string;
  /** Display name, e.g. "Baby Arjun" or "Walk-in: Kamla Bai". */
  name: string;
  priority: boolean;
}

export interface PauseView {
  /** "Lunch" */
  reason: string;
  /** "1:30 PM", or null for "Not sure". */
  backAtLabel: string | null;
}

export interface DoctorQueueView {
  doctor: DoctorTabView;
  serving: ServingView | null;
  nextUp: NextUpView | null;
  rows: QueueRowView[];
  /** Label the next issued token will get, e.g. "A-01" at the start of the day. */
  nextTokenLabel: string;
  /** Last token number issued today (0 if none); the offline walk-in fallback needs it. */
  lastToken: number;
  paused: PauseView | null;
  /** Doctor's room button page has checked in within the last 90 s. */
  doctorButtonLinked: boolean;
}

export function buildHeaderStats(tickets: DeskTicket[], clinic: Pick<Clinic, "defaultConsultMin">): HeaderStatsView {
  const s = computeStats(tickets);
  return {
    inQueue: s.waiting,
    served: s.served,
    avgConsult: formatAvgMinutes(s.avgConsultMin ?? clinic.defaultConsultMin),
    avgConsultIsDefault: s.avgConsultMin == null,
    avgWait: s.avgWaitMin == null ? null : formatAvgMinutes(s.avgWaitMin),
  };
}

export function buildClinicHeader(clinic: Clinic, tickets: DeskTicket[], now: number): ClinicHeaderView {
  return {
    clinicName: clinic.name,
    dateLabel: formatDayShort(now, clinic.timezone),
    session: sessionOf(now, clinic.timezone),
    stats: buildHeaderStats(tickets, clinic),
  };
}

export function buildDoctorQueueView(
  doctor: Doctor,
  tickets: DeskTicket[],
  queue: QueueDay | undefined,
  now: number,
  timezone: string,
): DoctorQueueView {
  const waiting = waitingFor(tickets, doctor.id);
  const serving = servingFor(tickets, doctor.id);
  const head = waiting[0] ?? null;
  const lastToken = queue?.lastToken ?? 0;
  const startsLater =
    doctor.startsAt != null &&
    !doctorHasStarted(tickets, doctor.id) &&
    minutesOfDay(now, timezone) < toMinutes(doctor.startsAt);

  return {
    doctor: {
      id: doctor.id,
      prefix: doctor.prefix,
      name: doctor.name,
      room: doctor.room,
      waitingCount: waiting.length,
      startsAtLabel: startsLater && doctor.startsAt ? `Starts ${formatHHmm(doctor.startsAt)}` : null,
      paused: !!queue?.paused,
    },
    serving: serving
      ? {
          ticketId: serving.id,
          label: serving.label,
          name: serving.name,
          phoneMasked: toRowView(serving, now).phoneMasked,
          visitTypeLabel: VISIT_TYPE_LABEL[serving.visitType],
          inRoom: formatElapsed(now - (serving.calledAt ?? now)),
          consultMin: Math.round((now - (serving.calledAt ?? now)) / 60000),
          pending: serving.pending,
        }
      : null,
    nextUp: head
      ? { ticketId: head.id, label: head.label, name: toRowView(head, now).displayName, priority: head.priority }
      : null,
    rows: waiting.map((t) => toRowView(t, now)),
    nextTokenLabel: tokenLabel(doctor.prefix, lastToken + 1),
    lastToken,
    paused: queue?.paused
      ? {
          reason: queue.paused.reason,
          backAtLabel: queue.paused.backAt != null ? formatClock(queue.paused.backAt, timezone) : null,
        }
      : null,
    doctorButtonLinked: queue?.doctorButtonSeenAt != null && now - queue.doctorButtonSeenAt < 90_000,
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
