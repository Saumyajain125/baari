/** Clinic-local date/time helpers. Everything takes an IANA timezone. */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

function parts(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ms))) out[p.type] = p.value;
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: Number(out.hour),
    minute: Number(out.minute),
    weekday: out.weekday,
  };
}

/** "YYYY-MM-DD" in the clinic's timezone. The queue resets when this changes. */
export function dateKey(ms: number, timeZone: string = DEFAULT_TIMEZONE): string {
  const p = parts(ms, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes since local midnight in the clinic's timezone. */
export function minutesOfDay(ms: number, timeZone: string = DEFAULT_TIMEZONE): number {
  const p = parts(ms, timeZone);
  return p.hour * 60 + p.minute;
}

export type Session = "Morning" | "Afternoon" | "Evening";

export function sessionOf(ms: number, timeZone: string = DEFAULT_TIMEZONE): Session {
  const h = parts(ms, timeZone).hour;
  if (h < 14) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

/** "Thu, 29 Oct" */
export function formatDayShort(ms: number, timeZone: string = DEFAULT_TIMEZONE): string {
  const p = parts(ms, timeZone);
  const month = new Intl.DateTimeFormat("en-GB", { timeZone, month: "short" }).format(new Date(ms));
  return `${p.weekday}, ${Number(p.day)} ${month}`;
}

/** "10:51 AM" */
export function formatClock(ms: number, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(
    new Date(ms),
  );
}

/** "29-10-2026 · 10:51 AM", as printed on the token slip. */
export function formatSlipStamp(ms: number, timeZone: string = DEFAULT_TIMEZONE): string {
  const p = parts(ms, timeZone);
  return `${p.day}-${p.month}-${p.year} · ${formatClock(ms, timeZone)}`;
}

/** "HH:mm" (clinic time) → "11:00 AM". */
export function formatHHmm(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Elapsed time as "m:ss", e.g. "6:12" or "1:40". Hours roll into minutes. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Whole minutes, e.g. "38 min". */
export function formatMinutes(ms: number): string {
  return `${Math.max(0, Math.floor(ms / 60000))} min`;
}
