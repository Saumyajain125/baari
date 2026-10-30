import { describe, expect, it } from "vitest";
import type { Ticket } from "@/lib/types";
import {
  aheadCount,
  calledJustNow,
  compareWaiting,
  computeStats,
  doctorHasStarted,
  DOUBLE_TAP_MS,
  estimateWait,
  formatAvgMinutes,
  maskPhone,
  normalizePhone,
  positionAfterMoveBack,
  positionAtEnd,
  positionForToken,
  servingFor,
  tokenLabel,
  waitingFor,
} from "@/lib/queue/logic";

function t(token: number, patch: Partial<Ticket> = {}): Ticket {
  return {
    id: `A-${token}`,
    clinicId: "c",
    doctorId: "d",
    date: "2026-10-29",
    token,
    label: tokenLabel("A", token),
    status: "waiting",
    position: positionForToken(token),
    priority: false,
    visitType: "new",
    distance: "here",
    source: "qr",
    createdAt: token * 60_000,
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

const ids = (list: Ticket[]) => list.map((x) => x.token);

function reorder(list: Ticket[], id: string, position: number, priority = false): Ticket[] {
  return list.map((x) => (x.id === id ? { ...x, position, priority } : x)).sort(compareWaiting);
}

describe("labels and phones", () => {
  it("pads token numbers", () => {
    expect(tokenLabel("A", 1)).toBe("A-01");
    expect(tokenLabel("B", 112)).toBe("B-112");
  });

  it("masks phones like the design", () => {
    expect(maskPhone("9829012365")).toBe("98290 •••65");
    expect(maskPhone("+91 98290 12365")).toBe("98290 •••65");
    expect(maskPhone(null)).toBeNull();
  });

  it("accepts Indian mobiles only", () => {
    expect(normalizePhone("+91 98290-12365")).toBe("9829012365");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890")).toBeNull();
  });
});

describe("ordering", () => {
  it("puts priority first, then position", () => {
    const list = [t(19), t(20), t(26, { priority: true }), t(21)].sort(compareWaiting);
    expect(ids(list)).toEqual([26, 19, 20, 21]);
  });

  it("filters waiting and serving by doctor", () => {
    const list = [t(1, { status: "done" }), t(2, { status: "serving", calledAt: 5 }), t(3), t(4, { doctorId: "x" })];
    expect(ids(waitingFor(list, "d"))).toEqual([3]);
    expect(servingFor(list, "d")?.token).toBe(2);
  });
});

describe("doctor has started", () => {
  it("is false before anyone is called, even after removals and no-shows", () => {
    expect(doctorHasStarted([], "d")).toBe(false);
    expect(doctorHasStarted([t(1), t(2, { status: "removed" }), t(3, { status: "no_show" })], "d")).toBe(false);
  });

  it("ignores other doctors' tickets", () => {
    expect(doctorHasStarted([t(1, { doctorId: "x", status: "serving", callCount: 1 }), t(2)], "d")).toBe(false);
  });

  it("is true once someone is with the doctor or done", () => {
    expect(doctorHasStarted([t(1, { status: "serving", callCount: 1 })], "d")).toBe(true);
    expect(doctorHasStarted([t(1, { status: "done", callCount: 1 })], "d")).toBe(true);
  });

  it("trusts the status alone for docs without a call count", () => {
    expect(doctorHasStarted([t(1, { status: "serving" })], "d")).toBe(true);
    expect(doctorHasStarted([t(1, { status: "done" })], "d")).toBe(true);
  });

  it("stays true when the only called patient was moved back or left", () => {
    // "Not here" sends the called patient back to waiting; callCount keeps the call.
    expect(doctorHasStarted([t(1, { callCount: 1, noReplyAt: 5 }), t(2)], "d")).toBe(true);
    expect(doctorHasStarted([t(1, { status: "no_show", callCount: 1 })], "d")).toBe(true);
    expect(doctorHasStarted([t(1, { status: "removed", callCount: 2 })], "d")).toBe(true);
  });
});

describe("moves", () => {
  const base = [t(19), t(20), t(21), t(22), t(23)];

  it("moves back two places", () => {
    expect(ids(reorder(base, "A-19", positionAfterMoveBack(base, "A-19")))).toEqual([20, 21, 19, 22, 23]);
    expect(ids(reorder(base, "A-22", positionAfterMoveBack(base, "A-22")))).toEqual([19, 20, 21, 23, 22]);
  });

  it("moving back from the last place stays last", () => {
    expect(ids(reorder(base, "A-23", positionAfterMoveBack(base, "A-23")))).toEqual([19, 20, 21, 22, 23]);
  });

  it("moving back a priority ticket drops priority and lands two behind", () => {
    const list = [t(26, { priority: true }), ...base].sort(compareWaiting);
    expect(ids(reorder(list, "A-26", positionAfterMoveBack(list, "A-26"), false))).toEqual([19, 20, 26, 21, 22, 23]);
  });

  it("skip sends a ticket to the end, ahead of later joiners", () => {
    const skipped = reorder(base, "A-20", positionAtEnd(base, "A-20"));
    expect(ids(skipped)).toEqual([19, 21, 22, 23, 20]);
    const withNewJoiner = [...skipped, t(24)].sort(compareWaiting);
    expect(ids(withNewJoiner)).toEqual([19, 21, 22, 23, 20, 24]);
  });

  it("repeated moves keep a strict order", () => {
    let list = base;
    for (let i = 0; i < 30; i++) list = reorder(list, list[0].id, positionAfterMoveBack(list, list[0].id));
    expect(new Set(list.map((x) => x.position)).size).toBe(list.length);
  });

  it("counts people ahead", () => {
    expect(aheadCount(base, "A-19")).toBe(0);
    expect(aheadCount(base, "A-22")).toBe(3);
  });
});

describe("stats and ETA", () => {
  it("averages consults and waits", () => {
    const list = [
      t(1, { status: "done", consultMs: 4 * 60_000, createdAt: 0, calledAt: 10 * 60_000 }),
      t(2, { status: "done", consultMs: 8 * 60_000, createdAt: 0, calledAt: 30 * 60_000 }),
      t(3, { status: "serving", createdAt: 0, calledAt: 20 * 60_000 }),
      t(4),
      t(5, { status: "no_show" }),
    ];
    const s = computeStats(list);
    expect(s.waiting).toBe(1);
    expect(s.served).toBe(2);
    expect(s.avgConsultMin).toBe(6);
    expect(s.avgWaitMin).toBe(20);
  });

  it("leaves waits from a wrong device clock out of the average", () => {
    const list = [
      t(1, { status: "done", createdAt: 0, calledAt: 10 * 60_000 }),
      // Joined "after" being called: the patient's phone clock ran fast.
      t(2, { status: "done", createdAt: 50 * 60_000, calledAt: 20 * 60_000 }),
      // A 13-hour wait: the joining phone's clock ran slow.
      t(3, { status: "serving", createdAt: 0, calledAt: 13 * 60 * 60_000 }),
      t(4, { status: "done", createdAt: 0, calledAt: 30 * 60_000 }),
    ];
    expect(computeStats(list).avgWaitMin).toBe(20);
    expect(computeStats(list.slice(1, 3)).avgWaitMin).toBeNull();
  });

  it("keeps a long but possible wait", () => {
    expect(computeStats([t(1, { status: "done", createdAt: 0, calledAt: 12 * 60 * 60_000 })]).avgWaitMin).toBe(720);
  });

  it("has no averages on an empty day", () => {
    expect(computeStats([])).toEqual({ waiting: 0, served: 0, avgConsultMin: null, avgWaitMin: null });
  });

  it("matches the slip in the design: 7 ahead at 5.8 min is 35 to 45", () => {
    expect(estimateWait(7, 5.8)).toEqual({ lowMin: 35, highMin: 45 });
  });

  it("never gives an empty range", () => {
    expect(estimateWait(0, 6)).toEqual({ lowMin: 0, highMin: 5 });
  });

  it("formats averages", () => {
    expect(formatAvgMinutes(5.83)).toBe("5.8 min");
    expect(formatAvgMinutes(22.4)).toBe("22 min");
  });
});

describe("double-tap guard", () => {
  const at = 1_000_000;

  it("flags a patient called within the last few seconds", () => {
    expect(calledJustNow({ calledAt: at }, at)).toBe(true);
    expect(calledJustNow({ calledAt: at - 300 }, at)).toBe(true);
    expect(calledJustNow({ calledAt: at - DOUBLE_TAP_MS + 1 }, at)).toBe(true);
  });

  it("lets Next through once the call is older", () => {
    expect(calledJustNow({ calledAt: at - DOUBLE_TAP_MS }, at)).toBe(false);
    expect(calledJustNow({ calledAt: at - 60_000 }, at)).toBe(false);
  });

  it("ignores nobody serving, no call time, and calls stamped in the future", () => {
    expect(calledJustNow(null, at)).toBe(false);
    expect(calledJustNow({ calledAt: null }, at)).toBe(false);
    // Another device's clock ahead of ours must not block Next indefinitely.
    expect(calledJustNow({ calledAt: at + 500 }, at)).toBe(false);
  });
});
