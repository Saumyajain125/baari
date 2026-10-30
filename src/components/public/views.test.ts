import { describe, expect, it } from "vitest";
import { positionForToken, tokenLabel } from "@/lib/queue/logic";
import { parseRememberedTicket } from "@/lib/queue/patient";
import type { Clinic, Doctor, QueueDay, Ticket } from "@/lib/types";
import { buildJoinDoctorOption, buildPatientStatus, buildTvDoctor, etaText, holdMinutes } from "./views";

const TZ = "Asia/Kolkata";
const TODAY = "2026-10-29";
// Thu 29 Oct 2026, 10:51 AM in Kolkata.
const NOW = Date.UTC(2026, 9, 29, 5, 21);

const clinic: Pick<Clinic, "name" | "defaultConsultMin" | "timezone"> = {
  name: "Sharma Family Clinic",
  defaultConsultMin: 6,
  timezone: TZ,
};

const doctor: Doctor = {
  id: "anita",
  name: "Dr. Anita Sharma",
  prefix: "A",
  room: "Room 2",
  order: 0,
  startsAt: null,
  active: true,
};

function t(token: number, patch: Partial<Ticket> = {}): Ticket {
  return {
    id: `A-${token}`,
    clinicId: "c",
    doctorId: "anita",
    date: TODAY,
    token,
    label: tokenLabel("A", token),
    status: "waiting",
    position: positionForToken(token),
    priority: false,
    visitType: "new",
    distance: "here",
    source: "qr",
    createdAt: NOW - (40 - token) * 60_000,
    calledAt: null,
    lastCallAt: null,
    callCount: 0,
    noReplyAt: null,
    finishedAt: null,
    consultMs: null,
    updatedBy: null,
    updatedAt: 0,
    ...patch,
  };
}

const queueDay = (patch: Partial<QueueDay> = {}): QueueDay => ({
  id: `anita_${TODAY}`,
  clinicId: "c",
  doctorId: "anita",
  date: TODAY,
  lastToken: 26,
  paused: null,
  doctorButtonSeenAt: null,
  ...patch,
});

describe("buildTvDoctor", () => {
  const tickets = [
    t(18, { status: "serving", calledAt: NOW - 372_000, lastCallAt: NOW - 372_000 }),
    ...[19, 20, 21, 22, 23, 24, 25].map((n) => t(n)),
    t(26, { priority: true }),
    t(17, { status: "done", consultMs: 5 * 60_000 }),
  ];

  it("shows the serving token, its call key and the next five in call order", () => {
    const tv = buildTvDoctor(doctor, tickets, queueDay(), NOW, TZ);
    expect(tv.nowCalling).toBe("A-18");
    expect(tv.callKey).toBe(NOW - 372_000);
    expect(tv.next).toEqual(["A-26", "A-19", "A-20", "A-21", "A-22"]);
    expect(tv.waitingCount).toBe(8);
    expect(tv.pausedMessage).toBeNull();
  });

  it("turns a pause into the patient-facing message", () => {
    const backAt = Date.UTC(2026, 9, 29, 8, 0); // 1:30 PM in Kolkata
    const tv = buildTvDoctor(doctor, tickets, queueDay({ paused: { reason: "Lunch", since: NOW, backAt } }), NOW, TZ);
    expect(tv.pausedMessage).toBe("Doctor is on a short break (Lunch). Back around 1:30 PM. Your place is safe.");
  });

  it("says when a doctor starts later and nobody has been called", () => {
    const tv = buildTvDoctor({ ...doctor, startsAt: "11:00" }, [], undefined, NOW, TZ);
    expect(tv.nowCalling).toBeNull();
    expect(tv.callKey).toBeNull();
    expect(tv.startsAtLabel).toBe("Starts 11:00 AM");
  });
});

describe("etaText", () => {
  it("matches the token slip's wording", () => {
    expect(etaText(0, 6)).toBe("You're next");
    expect(etaText(7, 5.8)).toBe("approx 35 to 45 min");
  });

  it("pushes the range back by a break or a later start", () => {
    expect(etaText(7, 5.8, 40)).toBe("approx 75 to 85 min");
    expect(etaText(0, 6, 40)).toBe("approx 40 to 45 min");
  });

  it("says 'after the break' when nobody knows when the doctor is back", () => {
    expect(etaText(7, 5.8, null)).toBe("approx 35 to 45 min after the break");
    expect(etaText(0, 6, null)).toBe("Right after the break");
  });
});

describe("holdMinutes", () => {
  const MIN = 60_000;
  const paused = (backAt: number | null) => queueDay({ paused: { reason: "Lunch", since: NOW, backAt } });

  it("is zero while the doctor is seeing patients", () => {
    expect(holdMinutes(doctor, [t(19)], queueDay(), NOW, TZ)).toBe(0);
    expect(holdMinutes(doctor, [t(19)], undefined, NOW, TZ)).toBe(0);
  });

  it("waits out a break, in 5-minute steps, and ignores a return time already past", () => {
    expect(holdMinutes(doctor, [t(19)], paused(NOW + 38 * MIN), NOW, TZ)).toBe(40);
    expect(holdMinutes(doctor, [t(19)], paused(NOW - 10 * MIN), NOW, TZ)).toBe(0);
    expect(holdMinutes(doctor, [t(19)], paused(null), NOW, TZ)).toBeNull();
  });

  it("waits for a later start until someone has been called", () => {
    const late = { ...doctor, startsAt: "11:30" }; // NOW is 10:51
    expect(holdMinutes(late, [t(19)], undefined, NOW, TZ)).toBe(40);
    expect(holdMinutes(late, [t(18, { status: "serving", calledAt: NOW }), t(19)], undefined, NOW, TZ)).toBe(0);
    // Taking off a patient nobody called doesn't start the doctor's day.
    expect(holdMinutes(late, [t(17, { status: "removed" }), t(18, { status: "no_show" }), t(19)], undefined, NOW, TZ)).toBe(40);
    expect(holdMinutes(late, [t(17, { status: "removed", callCount: 1 }), t(19)], undefined, NOW, TZ)).toBe(0);
    expect(holdMinutes({ ...doctor, startsAt: "10:00" }, [t(19)], undefined, NOW, TZ)).toBe(0);
    // The later of the two wins.
    expect(holdMinutes(late, [t(19)], paused(NOW + 60 * MIN), NOW, TZ)).toBe(60);
  });
});

describe("buildJoinDoctorOption", () => {
  it("estimates the wait for someone joining now", () => {
    const opt = buildJoinDoctorOption(doctor, [t(19), t(20), t(21)], queueDay(), clinic, NOW);
    expect(opt.waitingCount).toBe(3);
    expect(opt.etaText).toBe("approx 15 to 20 min");
    expect(buildJoinDoctorOption(doctor, [], undefined, clinic, NOW).etaText).toBe("You'd be next");
  });

  it("flags a paused doctor", () => {
    const opt = buildJoinDoctorOption(doctor, [], queueDay({ paused: { reason: "Lunch", since: NOW, backAt: null } }), clinic, NOW);
    expect(opt.pausedNote).toBe("Paused for a short break");
    expect(opt.etaText).toBe("You'd be next, after the break");
  });

  it("adds the rest of a break to the estimate", () => {
    const backAt = NOW + 40 * 60_000;
    const queue = queueDay({ paused: { reason: "Lunch", since: NOW, backAt } });
    expect(buildJoinDoctorOption(doctor, [t(19), t(20), t(21)], queue, clinic, NOW).etaText).toBe("approx 55 to 60 min");
    expect(buildJoinDoctorOption(doctor, [], queue, clinic, NOW).etaText).toBe("approx 40 to 45 min");
    const notSure = queueDay({ paused: { reason: "Lunch", since: NOW, backAt: null } });
    expect(buildJoinDoctorOption(doctor, [t(19), t(20), t(21)], notSure, clinic, NOW).etaText).toBe(
      "approx 15 to 20 min after the break",
    );
  });

  it("adds the time until a later start", () => {
    const opt = buildJoinDoctorOption({ ...doctor, startsAt: "11:30" }, [t(19), t(20), t(21)], undefined, clinic, NOW);
    expect(opt.startsAtLabel).toBe("Starts 11:30 AM");
    expect(opt.etaText).toBe("approx 55 to 60 min");
  });
});

describe("buildPatientStatus", () => {
  const base = {
    clinic,
    doctor,
    queue: queueDay(),
    today: TODAY,
    dateLabel: "Thu, 29 Oct",
    name: "Priya Meena",
    canEdit: true,
    backAtLabel: null,
    now: NOW,
  };
  const waiting = [t(19), t(20), t(21), t(22), t(23), t(26, { priority: true })];
  const serving = t(18, { status: "serving", calledAt: NOW, lastCallAt: NOW });

  it("counts people ahead (priority first) and estimates the wait", () => {
    const me = waiting[4]; // A-23
    const view = buildPatientStatus({ ...base, ticket: me, tickets: [serving, ...waiting] });
    expect(view.phase).toBe("waiting");
    expect(view.ahead).toBe(5);
    expect(view.etaText).toBe("approx 25 to 35 min");
    expect(view.nowServing).toBe("A-18");
  });

  it("adds the rest of a break, or says 'after the break' when it's open-ended", () => {
    const me = waiting[4]; // A-23, 5 ahead: approx 25 to 35 min
    const tickets = [serving, ...waiting];
    const back = queueDay({ paused: { reason: "Lunch", since: NOW, backAt: NOW + 30 * 60_000 } });
    expect(buildPatientStatus({ ...base, queue: back, ticket: me, tickets }).etaText).toBe("approx 55 to 65 min");
    const notSure = queueDay({ paused: { reason: "Lunch", since: NOW, backAt: null } });
    expect(buildPatientStatus({ ...base, queue: notSure, ticket: me, tickets }).etaText).toBe(
      "approx 25 to 35 min after the break",
    );
    const head = waiting[5]; // A-26, priority: nobody ahead
    expect(buildPatientStatus({ ...base, queue: notSure, ticket: head, tickets }).etaText).toBe("Right after the break");
    expect(buildPatientStatus({ ...base, ticket: head, tickets }).etaText).toBe("You're next");
  });

  it("adds the time until the doctor starts", () => {
    const view = buildPatientStatus({ ...base, doctor: { ...doctor, startsAt: "11:30" }, ticket: waiting[4], tickets: waiting });
    expect(view.ahead).toBe(5);
    expect(view.etaText).toBe("approx 65 to 75 min");
  });

  it("waits for the list to include the ticket before counting", () => {
    const me = t(27);
    const view = buildPatientStatus({ ...base, ticket: me, tickets: waiting });
    expect(view.ahead).toBeNull();
    expect(view.etaText).toBeNull();
  });

  it("marks unfinished tokens from an earlier day as expired", () => {
    const view = buildPatientStatus({ ...base, ticket: t(23, { date: "2026-10-28" }), tickets: [] });
    expect(view.phase).toBe("expired");
  });

  it("knows when the patient left on their own", () => {
    const left = t(23, { status: "removed", updatedBy: "patient" });
    expect(buildPatientStatus({ ...base, ticket: left, tickets: [left] }).leftByPatient).toBe(true);
    const removed = t(23, { status: "removed", updatedBy: "staff-1" });
    expect(buildPatientStatus({ ...base, ticket: removed, tickets: [removed] }).leftByPatient).toBe(false);
  });

  it("re-alerts on every call while serving", () => {
    const me = t(23, { status: "serving", calledAt: NOW, lastCallAt: NOW + 5 });
    const view = buildPatientStatus({ ...base, ticket: me, tickets: [me] });
    expect(view.phase).toBe("serving");
    expect(view.callKey).toBe(NOW + 5);
  });
});

describe("parseRememberedTicket", () => {
  const stored = JSON.stringify({ ticketId: "x1", label: "A-27", doctorId: "anita", date: TODAY });

  it("keeps today's token", () => {
    expect(parseRememberedTicket(stored, TODAY)?.label).toBe("A-27");
  });

  it("drops other days, junk and missing values", () => {
    expect(parseRememberedTicket(stored, "2026-10-30")).toBeNull();
    expect(parseRememberedTicket("{not json", TODAY)).toBeNull();
    expect(parseRememberedTicket(JSON.stringify({ ticketId: 1 }), TODAY)).toBeNull();
    expect(parseRememberedTicket(null, TODAY)).toBeNull();
  });
});
