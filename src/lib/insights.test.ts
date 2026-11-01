import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatDateKey,
  hourLabel,
  rangeBounds,
  rangeFor,
  shiftDateKey,
  summarise,
  summariseByDoctor,
  trendSentence,
  visitSentence,
  type SummaryOptions,
} from "@/lib/insights";
import type { Ticket } from "@/lib/types";

const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60_000;
const MIN = 60_000;

/** Epoch ms for a clinic-local (IST) date and time. */
function ist(date: string, hour: number, minute = 0): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d, hour, minute) - IST_OFFSET_MS;
}

let seq = 0;
function ticket(date: string, patch: Partial<Ticket> & { hour?: number } = {}): Ticket {
  const { hour = 10, ...rest } = patch;
  const createdAt = ist(date, hour);
  seq++;
  return {
    id: `t${seq}`,
    clinicId: "c",
    doctorId: "a",
    date,
    token: seq,
    label: `A-${seq}`,
    status: "done",
    position: seq * 1000,
    priority: false,
    visitType: "new",
    distance: "here",
    source: "walk_in",
    createdAt,
    calledAt: createdAt + 20 * MIN,
    lastCallAt: createdAt + 20 * MIN,
    callCount: 1,
    noReplyAt: null,
    finishedAt: createdAt + 26 * MIN,
    consultMs: 6 * MIN,
    updatedBy: null,
    updatedAt: createdAt,
    ...rest,
  };
}

const opts = (from: string, to: string, bucket: "day" | "week" = "day"): SummaryOptions => ({
  from,
  to,
  bucket,
  timezone: TZ,
});

describe("date keys", () => {
  it("shifts across month and year ends", () => {
    expect(shiftDateKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateKey("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("counts days between keys", () => {
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(30);
    expect(daysBetween("2026-10-31", "2026-10-31")).toBe(0);
  });

  it("builds ranges that end today", () => {
    expect(rangeBounds("2026-11-01", rangeFor("7d"))).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(rangeBounds("2026-11-01", rangeFor("30d"))).toEqual({ from: "2026-10-03", to: "2026-11-01" });
    // Three months is 13 whole weeks.
    expect(daysBetween(rangeBounds("2026-11-01", rangeFor("3m")).from, "2026-11-01") + 1).toBe(91);
  });

  it("formats keys and hours", () => {
    expect(formatDateKey("2026-10-29")).toBe("29 Oct");
    expect(formatDateKey("2026-10-29", true)).toBe("Thu, 29 Oct");
    expect(hourLabel(0)).toBe("12 am");
    expect(hourLabel(9)).toBe("9 am");
    expect(hourLabel(12)).toBe("12 pm");
    expect(hourLabel(19)).toBe("7 pm");
  });
});

describe("summarise", () => {
  it("counts patients seen, including whoever is still in the room", () => {
    const s = summarise(
      [
        ticket("2026-10-30"),
        ticket("2026-10-30", { status: "serving", consultMs: null, finishedAt: null }),
        ticket("2026-10-30", { status: "waiting", calledAt: null, consultMs: null }),
        ticket("2026-10-31"),
      ],
      opts("2026-10-30", "2026-10-31"),
    );
    expect(s.seen).toBe(3);
    expect(s.opdDays).toBe(2);
    expect(s.perDay).toBe(1.5);
  });

  it("ignores removed tickets and tickets outside the range", () => {
    const s = summarise(
      [ticket("2026-10-29"), ticket("2026-10-30", { status: "removed" }), ticket("2026-11-02"), ticket("2026-10-30")],
      opts("2026-10-30", "2026-10-31"),
    );
    expect(s.seen).toBe(1);
    expect(s.opdDays).toBe(1);
  });

  it("averages consults, leaving out tapped-through and left-running ones", () => {
    const s = summarise(
      [
        ticket("2026-10-30", { consultMs: 4 * MIN }),
        ticket("2026-10-30", { consultMs: 8 * MIN }),
        ticket("2026-10-30", { consultMs: 10_000 }),
        ticket("2026-10-30", { consultMs: 95 * MIN }),
      ],
      opts("2026-10-30", "2026-10-30"),
    );
    expect(s.consultMin).toBe(6);
    expect(s.consults).toBe(2);
    expect(s.leftOut).toBe(2);
    expect(s.seen).toBe(4);
  });

  it("averages waits from token to being called in", () => {
    const s = summarise(
      [
        ticket("2026-10-30", { calledAt: ist("2026-10-30", 10, 10) }),
        ticket("2026-10-30", { calledAt: ist("2026-10-30", 10, 30) }),
        // A wrong clock: called before the token was taken.
        ticket("2026-10-30", { calledAt: ist("2026-10-30", 9) }),
      ],
      opts("2026-10-30", "2026-10-30"),
    );
    expect(s.waitMin).toBe(20);
  });

  it("works out the no-show rate against everyone called or marked absent", () => {
    const s = summarise(
      [
        ticket("2026-10-30"),
        ticket("2026-10-30"),
        ticket("2026-10-30"),
        ticket("2026-10-30", { status: "no_show", consultMs: null }),
      ],
      opts("2026-10-30", "2026-10-30"),
    );
    expect(s.noShows).toBe(1);
    expect(s.noShowRate).toBe(0.25);
  });

  it("buckets by day, with empty days kept as gaps", () => {
    const s = summarise(
      [ticket("2026-10-26", { consultMs: 5 * MIN }), ticket("2026-10-28", { consultMs: 7 * MIN })],
      opts("2026-10-26", "2026-10-28"),
    );
    expect(s.buckets.map((b) => [b.start, b.seen, b.consultMin])).toEqual([
      ["2026-10-26", 1, 5],
      ["2026-10-27", 0, null],
      ["2026-10-28", 1, 7],
    ]);
  });

  it("buckets by week, the last week ending on the range's last day", () => {
    const from = "2026-08-03";
    const to = shiftDateKey(from, 90);
    const s = summarise([ticket(from), ticket(to), ticket(shiftDateKey(to, -6))], opts(from, to, "week"));
    expect(s.buckets).toHaveLength(13);
    expect(s.buckets[0]).toMatchObject({ start: from, end: shiftDateKey(from, 6), seen: 1 });
    expect(s.buckets[12]).toMatchObject({ start: shiftDateKey(to, -6), end: to, seen: 2 });
  });

  it("finds the busiest hour in clinic time and spreads tokens over OPD days", () => {
    const s = summarise(
      [
        ticket("2026-10-30", { hour: 10 }),
        ticket("2026-10-30", { hour: 11 }),
        ticket("2026-10-30", { hour: 11 }),
        ticket("2026-10-31", { hour: 11 }),
        ticket("2026-10-31", { hour: 18, status: "no_show", consultMs: null }),
      ],
      opts("2026-10-30", "2026-10-31"),
    );
    expect(s.peakHour).toBe(11);
    expect(s.hours[0].hour).toBe(10);
    expect(s.hours[s.hours.length - 1].hour).toBe(18);
    expect(s.hours.find((h) => h.hour === 11)).toMatchObject({ total: 3, perDay: 1.5 });
  });

  it("widens a short OPD to at least six hours", () => {
    const s = summarise([ticket("2026-10-30", { hour: 22 })], opts("2026-10-30", "2026-10-30"));
    expect(s.hours.map((h) => h.hour)).toEqual([18, 19, 20, 21, 22, 23]);
  });

  it("splits consults by visit type, skipping types nobody came for", () => {
    const s = summarise(
      [
        ticket("2026-10-30", { visitType: "new", consultMs: 9 * MIN }),
        ticket("2026-10-30", { visitType: "follow_up", consultMs: 4 * MIN }),
        ticket("2026-10-30", { visitType: "follow_up", consultMs: 5 * MIN }),
      ],
      opts("2026-10-30", "2026-10-30"),
    );
    expect(s.visits).toEqual([
      { type: "new", label: "New", seen: 1, consults: 1, consultMin: 9 },
      { type: "follow_up", label: "Follow-up", seen: 2, consults: 2, consultMin: 4.5 },
    ]);
  });

  it("measures the trend from the first and last three points", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"];
    const minutes = [7, 7, 7, 6, 6, 5.5];
    const s = summarise(
      days.map((d, i) => ticket(d, { consultMs: minutes[i] * MIN })),
      opts("2026-10-01", "2026-10-06"),
    );
    expect(s.trendMin).toBeCloseTo(-(7 - 17.5 / 3), 5);
  });

  it("has no trend with fewer than six points", () => {
    const s = summarise([ticket("2026-10-30")], opts("2026-10-30", "2026-10-30"));
    expect(s.trendMin).toBeNull();
  });

  it("is empty but well-formed with no tickets", () => {
    const s = summarise([], opts("2026-10-30", "2026-10-31"));
    expect(s).toMatchObject({ seen: 0, opdDays: 0, perDay: null, consultMin: null, waitMin: null, noShowRate: null, peakHour: null });
    expect(s.hours).toEqual([]);
    expect(s.buckets).toHaveLength(2);
  });
});

describe("summariseByDoctor", () => {
  it("keeps the given order and drops doctors without tokens", () => {
    const rows = summariseByDoctor(
      [ticket("2026-10-30", { doctorId: "b" }), ticket("2026-10-30", { doctorId: "a" }), ticket("2026-10-30", { doctorId: "b" })],
      ["a", "b", "c"],
      opts("2026-10-30", "2026-10-30"),
    );
    expect(rows.map((r) => [r.doctorId, r.summary.seen])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
});

describe("sentences", () => {
  it("describes the trend", () => {
    expect(trendSentence(-0.43, "30 days")).toBe("Consults are 0.4 min shorter than at the start of these 30 days.");
    expect(trendSentence(0.6, "3 months")).toBe("Consults are 0.6 min longer than at the start of these 3 months.");
    expect(trendSentence(0.1, "30 days")).toBe("Consults have held steady over these 30 days.");
    expect(trendSentence(null, "30 days")).toBeNull();
  });

  it("compares new patients with follow-ups once there are enough of each", () => {
    const row = (type: "new" | "follow_up", consultMin: number, consults = 5) => ({
      type,
      label: type,
      seen: consults,
      consults,
      consultMin,
    });
    expect(visitSentence([row("new", 8.8), row("follow_up", 4.4)])).toBe("New patients take about twice as long as follow-ups.");
    expect(visitSentence([row("new", 7.5), row("follow_up", 5)])).toBe("New patients take 1.5 times as long as follow-ups.");
    expect(visitSentence([row("new", 5.1), row("follow_up", 5)])).toBe("New patients and follow-ups take about the same time.");
    expect(visitSentence([row("new", 8, 2), row("follow_up", 4)])).toBeNull();
    expect(visitSentence([row("new", 8)])).toBeNull();
  });
});
