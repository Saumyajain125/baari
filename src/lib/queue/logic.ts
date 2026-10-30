/**
 * Pure queue rules: ordering, moves, stats, ETAs and display formatting.
 * No Firebase imports here so every rule is unit-testable and shared by the
 * reception desk, TV display and patient pages alike.
 */
import type { DeskTicket, Distance, Ticket, VisitType } from "@/lib/types";
import { formatElapsed, formatMinutes } from "@/lib/time";

/** Spacing between positions of freshly issued tokens. */
export const POSITION_STEP = 1000;

/** A wait at or above this many minutes is shown in warning orange. */
export const LONG_WAIT_MIN = 30;

/** How many places "Back 2" / "Not here" moves a patient. */
export const MOVE_BACK_PLACES = 2;

export function tokenLabel(prefix: string, token: number): string {
  return `${prefix}-${String(token).padStart(2, "0")}`;
}

export function positionForToken(token: number): number {
  return token * POSITION_STEP;
}

/** "9829012345" → "98290 •••45"; null → null. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 5)} •••${digits.slice(-2)}`;
}

/** Keeps the last 10 digits of an Indian mobile; returns null if it isn't one. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  new: "New",
  follow_up: "Follow-up",
  emergency: "Emergency",
};

export const DISTANCE_LABEL: Record<Distance, string> = {
  here: "Here",
  under_15: "Under 15 min",
  "15_30": "15 to 30 min",
  over_30: "Over 30 min",
};

/** Shorter labels used in the laptop table's Distance column. */
export const DISTANCE_LABEL_COMPACT: Record<Distance, string> = {
  here: "Here",
  under_15: "Under 15",
  "15_30": "15 to 30",
  over_30: "Over 30",
};

/** Ordering of the waiting list: priority first, then position, then token. */
export function compareWaiting(a: Pick<Ticket, "priority" | "position" | "token">, b: typeof a): number {
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  if (a.position !== b.position) return a.position - b.position;
  return a.token - b.token;
}

/** Waiting tickets for one doctor, in call order. */
export function waitingFor<T extends Ticket>(tickets: T[], doctorId: string): T[] {
  return tickets.filter((t) => t.doctorId === doctorId && t.status === "waiting").sort(compareWaiting);
}

/** The ticket currently with the doctor, if any (latest call wins if data is odd). */
export function servingFor<T extends Ticket>(tickets: T[], doctorId: string): T | null {
  let best: T | null = null;
  for (const t of tickets) {
    if (t.doctorId !== doctorId || t.status !== "serving") continue;
    if (!best || (t.calledAt ?? 0) > (best.calledAt ?? 0)) best = t;
  }
  return best;
}

/**
 * True once the doctor has called anyone today: someone is with them or done,
 * or was called and then moved back, marked no-show or removed. Removing or
 * no-showing a patient nobody called doesn't count, so a later start time
 * ("Starts 11:30 AM") holds until the first real call.
 */
export function doctorHasStarted(
  tickets: Pick<Ticket, "doctorId" | "status" | "callCount">[],
  doctorId: string,
): boolean {
  return tickets.some(
    (t) => t.doctorId === doctorId && (t.status === "serving" || t.status === "done" || t.callCount > 0),
  );
}

/**
 * Position that places a (non-priority) ticket at index `index` of `others`
 * once sorted with compareWaiting. `others` must be sorted and must not
 * contain the ticket being placed. Priority tickets always stay ahead, so the
 * index is clamped to land among the non-priority ones.
 */
export function positionAtIndex(others: Pick<Ticket, "priority" | "position">[], index: number): number {
  const priorityCount = others.filter((t) => t.priority).length;
  const normal = others.filter((t) => !t.priority);
  const k = Math.min(Math.max(0, index - priorityCount), normal.length);
  if (normal.length === 0) return POSITION_STEP;
  if (k === 0) return normal[0].position - POSITION_STEP;
  if (k === normal.length) return normal[k - 1].position + POSITION_STEP;
  return (normal[k - 1].position + normal[k].position) / 2;
}

/** New position after moving `ticketId` back `places` spots in `waiting`. */
export function positionAfterMoveBack(waiting: Ticket[], ticketId: string, places = MOVE_BACK_PLACES): number {
  const index = waiting.findIndex((t) => t.id === ticketId);
  const others = waiting.filter((t) => t.id !== ticketId);
  return positionAtIndex(others, (index < 0 ? 0 : index) + places);
}

/** New position that sends `ticketId` to the end of `waiting`. */
export function positionAtEnd(waiting: Ticket[], ticketId: string): number {
  const others = waiting.filter((t) => t.id !== ticketId);
  return positionAtIndex(others, others.length);
}

/** "Next" taps this soon after a call are treated as accidental double taps. */
export const DOUBLE_TAP_MS = 3000;

/**
 * True when the patient with the doctor was called moments ago: a second
 * "Next" now (double tap, or the doctor's button racing the desk) would mark
 * them done before they reached the room.
 */
export function calledJustNow(serving: Pick<Ticket, "calledAt"> | null, now: number): boolean {
  return serving?.calledAt != null && now - serving.calledAt >= 0 && now - serving.calledAt < DOUBLE_TAP_MS;
}

/** Waits outside this range come from a wrong device clock and are ignored in averages. */
const MAX_PLAUSIBLE_WAIT_MS = 12 * 60 * 60 * 1000;

/** Number of people ahead of `ticketId` in the waiting list (0 = next). */
export function aheadCount(waiting: Pick<Ticket, "id">[], ticketId: string): number {
  const i = waiting.findIndex((t) => t.id === ticketId);
  return i < 0 ? waiting.length : i;
}

export interface QueueStats {
  waiting: number;
  served: number;
  /** Mean consult length in minutes from today's finished consults, or null if none yet. */
  avgConsultMin: number | null;
  /** Mean time from joining to being called, in minutes, or null if nobody has been called. */
  avgWaitMin: number | null;
}

export function computeStats(tickets: Ticket[], doctorId?: string): QueueStats {
  const mine = doctorId ? tickets.filter((t) => t.doctorId === doctorId) : tickets;
  let waiting = 0;
  let served = 0;
  let consultSum = 0;
  let consultN = 0;
  let waitSum = 0;
  let waitN = 0;
  for (const t of mine) {
    if (t.status === "waiting") waiting++;
    if (t.status === "done") {
      served++;
      if (t.consultMs != null && t.consultMs > 0) {
        consultSum += t.consultMs;
        consultN++;
      }
    }
    if ((t.status === "done" || t.status === "serving") && t.calledAt != null) {
      const wait = t.calledAt - t.createdAt;
      if (wait >= 0 && wait <= MAX_PLAUSIBLE_WAIT_MS) {
        waitSum += wait;
        waitN++;
      }
    }
  }
  return {
    waiting,
    served,
    avgConsultMin: consultN ? consultSum / consultN / 60000 : null,
    avgWaitMin: waitN ? waitSum / waitN / 60000 : null,
  };
}

/** "5.8 min" / "22 min": one decimal under 10 minutes, whole minutes above. */
export function formatAvgMinutes(min: number): string {
  const rounded = min < 10 ? Math.round(min * 10) / 10 : Math.round(min);
  return `${rounded} min`;
}

export interface WaitEstimate {
  lowMin: number;
  highMin: number;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/** ETA range for someone with `ahead` people in front: ±10% of ahead × avg consult, in 5-minute steps. */
export function estimateWait(ahead: number, avgConsultMin: number): WaitEstimate {
  const mid = ahead * avgConsultMin;
  const low = Math.max(0, round5(mid * 0.9));
  const high = Math.max(low + 5, round5(mid * 1.1));
  return { lowMin: low, highMin: high };
}

/** "approx 35 to 45 min" */
export function formatEstimate(e: WaitEstimate): string {
  return `approx ${e.lowMin} to ${e.highMin} min`;
}

/** Visual tone of a queue row. */
export type RowTone = "priority" | "noReply" | "normal";

export interface QueueRowView {
  id: string;
  label: string;
  /** Name as entered. */
  name: string;
  /** Name for the tablet/phone lists: walk-ins read "Walk-in: Kamla Bai". */
  displayName: string;
  /** "98290 •••45", or null if no phone was given. */
  phoneMasked: string | null;
  isWalkIn: boolean;
  visitType: VisitType;
  visitTypeLabel: string;
  distance: Distance;
  distanceLabel: string;
  distanceLabelCompact: string;
  priority: boolean;
  /** "1:40" since the no-reply call, or null. */
  noReplyElapsed: string | null;
  waitedLabel: string;
  longWait: boolean;
  tone: RowTone;
  pending: boolean;
}

export function toRowView(t: DeskTicket, now: number): QueueRowView {
  const waitedMs = now - t.createdAt;
  const isWalkIn = t.source === "walk_in";
  return {
    id: t.id,
    label: t.label,
    name: t.name,
    displayName: isWalkIn ? `Walk-in: ${t.name}` : t.name,
    phoneMasked: maskPhone(t.phone),
    isWalkIn,
    visitType: t.visitType,
    visitTypeLabel: VISIT_TYPE_LABEL[t.visitType],
    distance: t.distance,
    distanceLabel: DISTANCE_LABEL[t.distance],
    distanceLabelCompact: DISTANCE_LABEL_COMPACT[t.distance],
    priority: t.priority,
    noReplyElapsed: t.noReplyAt != null ? formatElapsed(now - t.noReplyAt) : null,
    waitedLabel: formatMinutes(waitedMs),
    longWait: waitedMs >= LONG_WAIT_MIN * 60000,
    tone: t.priority ? "priority" : t.noReplyAt != null ? "noReply" : "normal",
    pending: t.pending,
  };
}
