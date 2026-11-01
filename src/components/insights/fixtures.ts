/**
 * Three months of made-up OPD days for the /preview/insights page: two doctors,
 * a morning and an evening rush, new cases taking about twice as long as
 * follow-ups, and Dr. Sharma's consults getting a little shorter over time.
 * Seeded, so every render shows the same numbers.
 */
import { shiftDateKey, daysBetween } from "@/lib/insights";
import type { Ticket, VisitType } from "@/lib/types";

const IST_OFFSET_MS = 5.5 * 60 * 60_000;
const MIN = 60_000;

export const DEMO_TODAY = "2026-10-29";
export const DEMO_DOCTORS = [
  { id: "sharma", name: "Dr. Anita Sharma", prefix: "A" },
  { id: "verma", name: "Dr. Rohit Verma", prefix: "B" },
];

/** mulberry32: small, fast, good enough for fixtures. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ist(date: string, minutes: number): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + minutes * MIN - IST_OFFSET_MS;
}

interface Profile {
  id: string;
  prefix: string;
  /** Tokens expected in each clinic hour (index = hour of day). */
  hourly: Record<number, number>;
  newMin: number;
  followMin: number;
  /** Minutes the average consult moves over the 13 weeks (negative = shorter). */
  drift: number;
}

const PROFILES: Profile[] = [
  {
    id: "sharma",
    prefix: "A",
    hourly: { 9: 3, 10: 6, 11: 7, 12: 4, 13: 2, 17: 3, 18: 6, 19: 7, 20: 3 },
    newMin: 9.4,
    followMin: 4.6,
    drift: -1.1,
  },
  {
    id: "verma",
    prefix: "B",
    hourly: { 10: 2, 11: 4, 12: 6, 13: 5, 14: 3, 15: 2 },
    newMin: 7.2,
    followMin: 4.4,
    drift: 0.6,
  },
];

export function demoTickets(today = DEMO_TODAY, days = 91): Ticket[] {
  const rand = rng(29);
  const from = shiftDateKey(today, -(days - 1));
  const out: Ticket[] = [];
  for (let i = 0; i < days; i++) {
    const date = shiftDateKey(from, i);
    // Closed on Sundays.
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) continue;
    const progress = daysBetween(from, date) / (days - 1);
    const isToday = date === today;
    for (const p of PROFILES) {
      let token = 0;
      for (const [hourText, expected] of Object.entries(p.hourly)) {
        const hour = Number(hourText);
        // Today is only half over.
        if (isToday && hour > 12) continue;
        const count = Math.max(0, Math.round(expected + (rand() - 0.5) * 3));
        for (let k = 0; k < count; k++) {
          token++;
          const createdAt = ist(date, hour * 60 + Math.floor(rand() * 60));
          const visitType: VisitType = rand() < 0.04 ? "emergency" : rand() < 0.42 ? "new" : "follow_up";
          const base = visitType === "follow_up" ? p.followMin : p.newMin;
          const consultMin = Math.max(1, base + p.drift * progress + (rand() - 0.5) * 3.2);
          const noShow = rand() < 0.045;
          const leftRunning = !noShow && rand() < 0.006;
          const calledAt = createdAt + Math.round((8 + rand() * 32) * MIN);
          const consultMs = leftRunning ? 95 * MIN : Math.round(consultMin * MIN);
          out.push({
            id: `${p.id}-${date}-${token}`,
            clinicId: "demo",
            doctorId: p.id,
            date,
            token,
            label: `${p.prefix}-${String(token).padStart(2, "0")}`,
            status: noShow ? "no_show" : "done",
            position: token * 1000,
            priority: visitType === "emergency",
            visitType,
            distance: "here",
            source: rand() < 0.6 ? "qr" : "walk_in",
            createdAt,
            calledAt: noShow ? null : calledAt,
            lastCallAt: calledAt,
            callCount: 1,
            noReplyAt: null,
            finishedAt: noShow ? calledAt : calledAt + consultMs,
            consultMs: noShow ? null : consultMs,
            updatedBy: null,
            updatedAt: calledAt,
          });
        }
      }
    }
  }
  return out;
}
