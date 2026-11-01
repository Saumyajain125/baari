/**
 * Long-run insights from the tickets the desk already writes. Every Next tap
 * stores how long the consult took (`consultMs`); over days and weeks those
 * records add up to a picture of each doctor's work. Pure functions only, so
 * the screen, its preview and the tests all compute the same numbers.
 */
import { VISIT_TYPE_LABEL } from "@/lib/queue/logic";
import { minutesOfDay } from "@/lib/time";
import type { Ticket, VisitType } from "@/lib/types";

const DAY_MS = 86_400_000;

/**
 * Consults outside this window are left out of averages: under 30 seconds is
 * almost always Next tapped through by mistake, over an hour is a consult left
 * running over lunch or the end of the day.
 */
export const CONSULT_MIN_MS = 30_000;
export const CONSULT_MAX_MS = 60 * 60_000;
/** Waits beyond this come from a wrong device clock (same cut-off as the desk's stats). */
const WAIT_MAX_MS = 12 * 60 * 60_000;
/** Below this many timed consults a visit type gets no comparison sentence. */
const MIN_COMPARABLE = 3;

export type InsightsRangeKey = "7d" | "30d" | "3m";
export type BucketKind = "day" | "week";

export interface InsightsRange {
  key: InsightsRangeKey;
  label: string;
  /** Number of clinic-local days, ending today. */
  days: number;
  bucket: BucketKind;
}

/** "3 months" is 13 whole weeks, so every weekly point covers seven days. */
export const INSIGHTS_RANGES: readonly InsightsRange[] = [
  { key: "7d", label: "7 days", days: 7, bucket: "day" },
  { key: "30d", label: "30 days", days: 30, bucket: "day" },
  { key: "3m", label: "3 months", days: 91, bucket: "week" },
];

export const DEFAULT_RANGE: InsightsRangeKey = "30d";

export function rangeFor(key: InsightsRangeKey): InsightsRange {
  return INSIGHTS_RANGES.find((r) => r.key === key) ?? INSIGHTS_RANGES[1];
}

export function isRangeKey(value: unknown): value is InsightsRangeKey {
  return INSIGHTS_RANGES.some((r) => r.key === value);
}

// ------------------------------------------------------------------ date keys

function keyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Moves a clinic-local "YYYY-MM-DD" by whole days (calendar maths, so no DST surprises). */
export function shiftDateKey(key: string, days: number): string {
  return new Date(keyToUtc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` ("2026-10-01" → "2026-10-03" is 2). */
export function daysBetween(from: string, to: string): number {
  return Math.round((keyToUtc(to) - keyToUtc(from)) / DAY_MS);
}

/** First and last date of a range that ends today. */
export function rangeBounds(today: string, range: InsightsRange): { from: string; to: string } {
  return { from: shiftDateKey(today, -(range.days - 1)), to: today };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "29 Oct", or "Thu, 29 Oct" with the weekday. */
export function formatDateKey(key: string, withWeekday = false): string {
  const d = new Date(keyToUtc(key));
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return withWeekday ? `${WEEKDAYS[d.getUTCDay()]}, ${day}` : day;
}

/** 9 → "9 am", 12 → "12 pm", 0 → "12 am". */
export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
}

// ------------------------------------------------------------------ summary

export interface InsightsBucket {
  /** First date the bucket covers. */
  start: string;
  /** Last date it covers (same as `start` for a day). */
  end: string;
  /** Patients called in on these dates. */
  seen: number;
  /** Average of the timed consults, in minutes, or null when there were none. */
  consultMin: number | null;
  /** Timed consults behind `consultMin`. */
  consults: number;
}

export interface HourSlot {
  /** 0 to 23, clinic time. */
  hour: number;
  /** Tokens taken in this hour over the whole range. */
  total: number;
  /** `total` spread over the OPD days: patients joining in this hour on an average day. */
  perDay: number;
}

export interface VisitRow {
  type: VisitType;
  label: string;
  seen: number;
  consults: number;
  consultMin: number | null;
}

export interface InsightsSummary {
  /** Patients called in: consult finished, or still in the room. */
  seen: number;
  /** Days with at least one token, i.e. days the OPD ran. */
  opdDays: number;
  /** `seen` per OPD day, or null without any OPD day. */
  perDay: number | null;
  /** Average timed consult in minutes, or null without any. */
  consultMin: number | null;
  /** Timed consults behind `consultMin`. */
  consults: number;
  /** Finished consults left out of averages for being implausibly short or long. */
  leftOut: number;
  /** Average time from taking a token to being called in, in minutes. */
  waitMin: number | null;
  noShows: number;
  /** No-shows as a share of everyone who was called or marked absent (0 to 1). */
  noShowRate: number | null;
  bucket: BucketKind;
  buckets: InsightsBucket[];
  /** The hours tokens were taken in, at least six of them, in order. */
  hours: HourSlot[];
  /** Hour with the most tokens, or null when there were none. */
  peakHour: number | null;
  /** Only visit types somebody was seen for. */
  visits: VisitRow[];
  /**
   * Average consult over the last three points minus the first three, in
   * minutes; negative means consults got shorter. Null with under six points.
   */
  trendMin: number | null;
}

export interface SummaryOptions {
  from: string;
  to: string;
  bucket: BucketKind;
  timezone: string;
}

const VISIT_ORDER: VisitType[] = ["new", "follow_up", "emergency"];

const isSeen = (t: Ticket) => t.status === "done" || t.status === "serving";

function timedConsult(t: Ticket): number | null {
  if (t.status !== "done" || t.consultMs == null) return null;
  return t.consultMs >= CONSULT_MIN_MS && t.consultMs <= CONSULT_MAX_MS ? t.consultMs : null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Everything the insights screen shows for one set of tickets (filter by
 * doctor first). Tickets outside `from`..`to` and removed tickets are ignored.
 */
export function summarise(tickets: Ticket[], { from, to, bucket, timezone }: SummaryOptions): InsightsSummary {
  const span = daysBetween(from, to) + 1;
  const size = bucket === "day" ? 1 : 7;
  const count = Math.max(1, Math.ceil(span / size));
  const consultsBy: number[][] = Array.from({ length: count }, () => []);
  const seenBy = new Array<number>(count).fill(0);
  const visit = new Map<VisitType, { seen: number; consults: number[] }>();
  const days = new Set<string>();
  const hourTotals = new Array<number>(24).fill(0);
  const consults: number[] = [];
  const waits: number[] = [];
  let seen = 0;
  let leftOut = 0;
  let noShows = 0;

  for (const t of tickets) {
    if (t.status === "removed" || t.date < from || t.date > to) continue;
    const index = Math.floor(daysBetween(from, t.date) / size);
    days.add(t.date);
    hourTotals[Math.floor(minutesOfDay(t.createdAt, timezone) / 60)]++;
    if (t.status === "no_show") noShows++;
    if (!isSeen(t)) continue;

    seen++;
    seenBy[index]++;
    const v = visit.get(t.visitType) ?? { seen: 0, consults: [] };
    v.seen++;
    visit.set(t.visitType, v);

    const ms = timedConsult(t);
    if (ms != null) {
      consults.push(ms);
      consultsBy[index].push(ms);
      v.consults.push(ms);
    } else if (t.status === "done" && t.consultMs != null) {
      leftOut++;
    }
    if (t.calledAt != null) {
      const wait = t.calledAt - t.createdAt;
      if (wait >= 0 && wait <= WAIT_MAX_MS) waits.push(wait);
    }
  }

  const toMin = (ms: number | null) => (ms == null ? null : ms / 60_000);
  const buckets: InsightsBucket[] = seenBy.map((s, i) => {
    const start = shiftDateKey(from, i * size);
    const last = shiftDateKey(start, size - 1);
    return {
      start,
      end: last > to ? to : last,
      seen: s,
      consultMin: toMin(mean(consultsBy[i])),
      consults: consultsBy[i].length,
    };
  });

  const opdDays = days.size;
  const hours = hourSlots(hourTotals, opdDays);
  const peak = hours.reduce<HourSlot | null>((best, h) => (h.total > (best?.total ?? 0) ? h : best), null);

  return {
    seen,
    opdDays,
    perDay: opdDays ? seen / opdDays : null,
    consultMin: toMin(mean(consults)),
    consults: consults.length,
    leftOut,
    waitMin: toMin(mean(waits)),
    noShows,
    noShowRate: seen + noShows ? noShows / (seen + noShows) : null,
    bucket,
    buckets,
    hours,
    peakHour: peak?.hour ?? null,
    visits: VISIT_ORDER.flatMap((type) => {
      const v = visit.get(type);
      return v
        ? [{ type, label: VISIT_TYPE_LABEL[type], seen: v.seen, consults: v.consults.length, consultMin: toMin(mean(v.consults)) }]
        : [];
    }),
    trendMin: trend(buckets),
  };
}

/** The hours with tokens, widened to at least six so a short OPD still reads as a day. */
function hourSlots(totals: number[], opdDays: number): HourSlot[] {
  const used = totals.flatMap((n, h) => (n > 0 ? [h] : []));
  if (!used.length) return [];
  let first = used[0];
  let last = used[used.length - 1];
  while (last - first < 5) {
    if (last < 23) last++;
    else first--;
  }
  const slots: HourSlot[] = [];
  for (let h = first; h <= last; h++) slots.push({ hour: h, total: totals[h], perDay: totals[h] / opdDays });
  return slots;
}

function trend(buckets: InsightsBucket[]): number | null {
  const points = buckets.flatMap((b) => (b.consultMin == null ? [] : [b.consultMin]));
  if (points.length < 6) return null;
  return mean(points.slice(-3))! - mean(points.slice(0, 3))!;
}

// ------------------------------------------------------------------ per doctor

export interface DoctorSummary {
  doctorId: string;
  summary: InsightsSummary;
}

/** One summary per doctor id, in the order given; doctors with no tokens in range are dropped. */
export function summariseByDoctor(tickets: Ticket[], doctorIds: string[], options: SummaryOptions): DoctorSummary[] {
  const groups = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const list = groups.get(t.doctorId);
    if (list) list.push(t);
    else groups.set(t.doctorId, [t]);
  }
  return doctorIds.flatMap((doctorId) => {
    const summary = summarise(groups.get(doctorId) ?? [], options);
    return summary.opdDays ? [{ doctorId, summary }] : [];
  });
}

// ------------------------------------------------------------------ sentences

/** "5.8 min" or "12 min": one decimal under 10 minutes. */
export function formatMinutesShort(min: number): string {
  return min < 10 ? `${min.toFixed(1)} min` : `${Math.round(min)} min`;
}

/** "12.4" or "31": one decimal under 10. */
export function formatPerDay(n: number): string {
  return n < 10 ? n.toFixed(1) : String(Math.round(n));
}

/** "Consults are 0.4 min shorter than at the start of these 30 days." */
export function trendSentence(trendMin: number | null, rangeLabel: string): string | null {
  if (trendMin == null) return null;
  if (Math.abs(trendMin) < 0.2) return `Consults have held steady over these ${rangeLabel}.`;
  const by = Math.abs(trendMin) < 10 ? Math.abs(trendMin).toFixed(1) : String(Math.round(Math.abs(trendMin)));
  return `Consults are ${by} min ${trendMin < 0 ? "shorter" : "longer"} than at the start of these ${rangeLabel}.`;
}

/** "New patients take about twice as long as follow-ups." */
export function visitSentence(visits: VisitRow[]): string | null {
  const newRow = visits.find((v) => v.type === "new");
  const follow = visits.find((v) => v.type === "follow_up");
  if (!newRow?.consultMin || !follow?.consultMin) return null;
  if (newRow.consults < MIN_COMPARABLE || follow.consults < MIN_COMPARABLE) return null;
  const ratio = newRow.consultMin / follow.consultMin;
  if (ratio >= 0.9 && ratio <= 1.1) return "New patients and follow-ups take about the same time.";
  if (ratio > 1.1) {
    const how = ratio >= 1.85 && ratio <= 2.15 ? "about twice as long" : `${ratio.toFixed(1)} times as long`;
    return `New patients take ${how} as follow-ups.`;
  }
  return `Follow-ups take ${(1 / ratio).toFixed(1)} times as long as new patients.`;
}
