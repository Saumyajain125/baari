import { beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/lib/queue/actions";
import type { ActionResult, UndoEntry } from "@/lib/queue/actions";
import { positionForToken, tokenLabel } from "@/lib/queue/logic";
import type { Clinic, DeskTicket, Doctor, QueueDay } from "@/lib/types";
import { createDeskActions, type DeskDeps } from "@/components/reception/useReceptionHandlers";

// The Firestore write layer is replaced; these tests cover what the container
// decides to send and what it shows, not the writes themselves. isUndoStale is
// a pure check, so the real one runs.
vi.mock("@/lib/queue/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queue/actions")>();
  const result = (message: string): ActionResult => ({
    entry: { id: message, message, changes: [], at: 0 },
    committed: Promise.resolve(),
  });
  return {
    isUndoStale: actual.isUndoStale,
    addWalkIn: vi.fn(),
    callAgain: vi.fn(() => result("again")),
    callNext: vi.fn(() => result("next")),
    editName: vi.fn(() => result("rename")),
    markNoShow: vi.fn(() => result("no-show")),
    moveBack: vi.fn(() => result("back")),
    notHere: vi.fn(() => result("not-here")),
    pauseQueue: vi.fn(() => Promise.resolve()),
    removeTicket: vi.fn(() => result("remove")),
    resumeQueue: vi.fn(() => Promise.resolve()),
    skipToEnd: vi.fn(() => result("skip")),
    togglePriority: vi.fn(() => result("priority")),
    undo: vi.fn(() => Promise.resolve()),
  };
});

const clinic: Clinic = {
  id: "c1",
  name: "Sharma Family Clinic",
  ownerUid: "u",
  timezone: "Asia/Kolkata",
  defaultConsultMin: 6,
  lockAfterMin: 10,
  createdAt: 0,
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

function ticket(token: number, patch: Partial<DeskTicket> = {}): DeskTicket {
  return {
    id: `t${token}`,
    clinicId: clinic.id,
    doctorId: doctor.id,
    date: "2026-10-29",
    token,
    label: tokenLabel("A", token),
    status: "waiting",
    position: positionForToken(token),
    priority: false,
    visitType: "new",
    distance: "here",
    source: "walk_in",
    createdAt: 0,
    calledAt: null,
    lastCallAt: null,
    callCount: 0,
    noReplyAt: null,
    finishedAt: null,
    consultMs: null,
    updatedBy: null,
    updatedAt: 0,
    name: `Patient ${token}`,
    phone: null,
    pending: false,
    ...patch,
  };
}

function setup(tickets: DeskTicket[], queueDay: Partial<QueueDay> = {}) {
  let slot: UndoEntry | null = null;
  const deps: DeskDeps = {
    clinic,
    ctx: { clinicId: clinic.id, date: "2026-10-29", staffId: "rekha" },
    doctors: [doctor],
    tickets,
    queueDays: {
      [doctor.id]: {
        id: "q",
        clinicId: clinic.id,
        doctorId: doctor.id,
        date: "2026-10-29",
        lastToken: 24,
        paused: null,
        doctorButtonSeenAt: null,
        ...queueDay,
      },
    },
    offline: false,
    rememberOfflineToken: vi.fn(),
    undoSlot: {
      push: vi.fn((e: UndoEntry) => {
        slot = e;
      }),
      take: vi.fn(() => {
        const e = slot;
        slot = null;
        return e;
      }),
      dismiss: vi.fn(),
    },
    recordAction: vi.fn(),
    ui: {
      selectDoctor: vi.fn(),
      openWalkIn: vi.fn(),
      openPause: vi.fn(),
      lock: vi.fn(),
      openSettings: vi.fn(),
      openInsights: vi.fn(),
      toast: vi.fn(),
    },
  };
  return { deps, desk: createDeskActions(() => deps) };
}

beforeEach(() => vi.clearAllMocks());

describe("walk-in slip", () => {
  it("counts everyone already waiting, even before the snapshot has the new ticket", async () => {
    const waiting = [18, 19, 20, 21, 22, 23, 24].map((n) => ticket(n));
    const { desk } = setup([ticket(17, { status: "serving", calledAt: 1 }), ...waiting]);
    vi.mocked(actions.addWalkIn).mockResolvedValue({
      ticketId: "new",
      token: 25,
      label: "A-25",
      issuedAt: Date.UTC(2026, 9, 29, 5, 21),
      offline: false,
    });

    const slip = await desk.submitWalkIn({ doctorId: doctor.id, name: "Kamla Bai", phone: null, visitType: "new" });

    expect(vi.mocked(actions.addWalkIn).mock.calls[0][1]).toMatchObject({ lastTokenHint: 24, name: "Kamla Bai" });
    expect(slip).toEqual({
      label: "A-25",
      clinicName: "Sharma Family Clinic",
      doctorName: "Dr. Anita Sharma",
      room: "Room 2",
      ahead: 7,
      // 7 ahead × 6 min default consult = 42 min → 40 to 45 in 5-minute steps.
      etaText: "approx 40 to 45 min",
      issuedAtText: "29-10-2026 · 10:51 AM",
      offline: false,
    });
  });

  it("puts an emergency behind earlier priority tickets only, and says You're next at the front", async () => {
    const { desk } = setup([ticket(20), ticket(21)]);
    vi.mocked(actions.addWalkIn).mockResolvedValue({ ticketId: "e", token: 25, label: "A-25", issuedAt: 0, offline: true });

    const slip = await desk.submitWalkIn({ doctorId: doctor.id, name: "R", phone: null, visitType: "emergency" });

    expect(slip.ahead).toBe(0);
    expect(slip.etaText).toBe("You're next");
    expect(slip.offline).toBe(true);
  });

  it("skips the transaction when the desk knows it's offline, and remembers offline tokens", async () => {
    const { desk, deps } = setup([]);
    deps.offline = true;
    vi.mocked(actions.addWalkIn).mockResolvedValue({ ticketId: "off", token: 25, label: "A-25", issuedAt: 0, offline: true });

    await desk.submitWalkIn({ doctorId: doctor.id, name: "Kamla Bai", phone: null, visitType: "new" });

    expect(vi.mocked(actions.addWalkIn).mock.calls[0][1]).toMatchObject({ preferOffline: true });
    expect(deps.rememberOfflineToken).toHaveBeenCalledWith("off");
  });

  it("doesn't track tokens issued online", async () => {
    const { desk, deps } = setup([]);
    vi.mocked(actions.addWalkIn).mockResolvedValue({ ticketId: "on", token: 25, label: "A-25", issuedAt: 0, offline: false });

    await desk.submitWalkIn({ doctorId: doctor.id, name: "Kamla Bai", phone: null, visitType: "new" });

    expect(vi.mocked(actions.addWalkIn).mock.calls[0][1]).toMatchObject({ preferOffline: false });
    expect(deps.rememberOfflineToken).not.toHaveBeenCalled();
  });

  it("rethrows so the modal keeps the form, without a duplicate toast", async () => {
    const { desk, deps } = setup([]);
    vi.mocked(actions.addWalkIn).mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      desk.submitWalkIn({ doctorId: doctor.id, name: "R", phone: null, visitType: "new" }),
    ).rejects.toThrow("boom");
    expect(deps.ui.toast).not.toHaveBeenCalled();
  });
});

describe("pause", () => {
  it("pauses with the reason and return time, and messages nobody", () => {
    const { desk } = setup([ticket(20, { phone: "9829012345" }), ticket(21)]);
    const backAt = Date.UTC(2026, 9, 29, 8, 0);

    desk.confirmPause(doctor.id, { reason: "Lunch", backAt });

    expect(vi.mocked(actions.pauseQueue).mock.calls[0][1]).toEqual({ doctorId: doctor.id, reason: "Lunch", backAt });
  });

  it("falls back to 'Break' when the typed reason is blank", () => {
    const { desk } = setup([ticket(20)]);

    desk.confirmPause(doctor.id, { reason: "   ", backAt: null });

    expect(vi.mocked(actions.pauseQueue).mock.calls[0][1].reason).toBe("Break");
  });

  it("keeps Next and Not here off while paused, with a notice instead", () => {
    const { desk, deps } = setup([ticket(20, { status: "serving", calledAt: 1 }), ticket(21)], {
      paused: { reason: "Lunch", since: 0, backAt: null },
    });

    desk.handlers.onNext(doctor.id);
    desk.handlers.onNotHere(doctor.id);

    expect(actions.callNext).not.toHaveBeenCalled();
    expect(actions.notHere).not.toHaveBeenCalled();
    expect(deps.ui.toast).toHaveBeenCalledWith(expect.stringContaining("queue is paused"), "info");
  });
});

describe("desk actions", () => {
  it("calls Next with this doctor's serving and ordered waiting lists, once per double tap", () => {
    const serving = ticket(20, { status: "serving", calledAt: 1 });
    const { desk, deps } = setup([serving, ticket(22), ticket(21, { priority: true })]);

    desk.handlers.onNext(doctor.id);
    desk.handlers.onNext(doctor.id);

    expect(actions.callNext).toHaveBeenCalledTimes(1);
    const [, s, waiting] = vi.mocked(actions.callNext).mock.calls[0];
    expect(s?.id).toBe("t20");
    expect(waiting.map((t) => t.label)).toEqual(["A-21", "A-22"]);
    expect(deps.undoSlot.push).toHaveBeenCalledTimes(1);
    expect(deps.recordAction).toHaveBeenCalledTimes(1);
  });

  it("ignores Next while the patient with the doctor was called moments ago", () => {
    // Called 1 s ago: this desk's own first tap, or the doctor's button racing it.
    const { desk, deps } = setup([ticket(19, { status: "serving", calledAt: Date.now() - 1000 }), ticket(20)]);

    desk.handlers.onNext(doctor.id);
    desk.handlers.onNotHere(doctor.id);

    expect(actions.callNext).not.toHaveBeenCalled();
    expect(actions.notHere).not.toHaveBeenCalled();
    expect(deps.undoSlot.push).not.toHaveBeenCalled();
    expect(deps.ui.toast).toHaveBeenCalledWith(
      "A-19 was just called. Tap again in a moment to finish their consult.",
      "info",
    );
    expect(deps.ui.toast).toHaveBeenCalledWith("A-19 was just called. Give them a moment to reach the room.", "info");
  });

  it("allows Next once the fresh call is a few seconds old", () => {
    const { desk } = setup([ticket(19, { status: "serving", calledAt: Date.now() - 4000 }), ticket(20)]);
    desk.handlers.onNext(doctor.id);
    expect(actions.callNext).toHaveBeenCalledTimes(1);
  });

  it("refuses names longer than the rules allow", () => {
    const { desk, deps } = setup([ticket(20)]);
    desk.handlers.onEditName("t20", "K".repeat(81));
    expect(actions.editName).not.toHaveBeenCalled();
    expect(deps.ui.toast).toHaveBeenCalledWith(expect.stringContaining("up to 80 characters"), "info");
  });

  it("ignores row actions on tickets that already left the queue", () => {
    const { desk } = setup([ticket(20, { status: "no_show" })]);
    desk.handlers.onRemove("t20");
    desk.handlers.onPriority("missing");
    expect(actions.removeTicket).not.toHaveBeenCalled();
    expect(actions.togglePriority).not.toHaveBeenCalled();
  });

  it("undoes the latest action exactly once", () => {
    const { desk } = setup([ticket(20)]);
    desk.handlers.onSkip("t20");
    desk.handlers.onUndo();
    desk.handlers.onUndo();
    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(vi.mocked(actions.undo).mock.calls[0][0].message).toBe("skip");
  });

  describe("undo after someone else changed the ticket", () => {
    const skipped: UndoEntry = {
      id: "s",
      message: "A-20 skipped to the end",
      changes: [
        {
          path: "clinics/c1/tickets/t20",
          before: { position: 20000, updatedBy: null, updatedAt: 0 },
          after: { position: 99000, updatedBy: "rekha", updatedAt: 5 },
        },
      ],
      at: 5,
    };

    it("drops the undo with a notice when the ticket changed since", () => {
      // The doctor's button called A-20 in after the skip.
      const { desk, deps } = setup([ticket(20)]);
      vi.mocked(actions.skipToEnd).mockReturnValueOnce({ entry: skipped, committed: Promise.resolve() });

      desk.handlers.onSkip("t20");
      deps.tickets = [ticket(20, { status: "serving", updatedBy: "doctor", updatedAt: 9 })];
      desk.handlers.onUndo();

      expect(actions.undo).not.toHaveBeenCalled();
      expect(deps.ui.toast).toHaveBeenCalledWith("Can't undo: the queue changed since. Check the list.", "info");
      // Dropped, not kept for a second try.
      desk.handlers.onUndo();
      expect(actions.undo).not.toHaveBeenCalled();
    });

    it("undoes when the ticket still holds the action's write", () => {
      const { desk, deps } = setup([ticket(20)]);
      vi.mocked(actions.skipToEnd).mockReturnValueOnce({ entry: skipped, committed: Promise.resolve() });

      desk.handlers.onSkip("t20");
      deps.tickets = [ticket(20, { position: 99000, updatedBy: "rekha", updatedAt: 5 })];
      desk.handlers.onUndo();

      expect(actions.undo).toHaveBeenCalledWith(skipped);
      expect(deps.ui.toast).not.toHaveBeenCalled();
    });
  });

  it("withdraws the undo and shows an error when the server refuses a write", async () => {
    const { desk, deps } = setup([ticket(20)]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(actions.markNoShow).mockReturnValueOnce({
      entry: { id: "x", message: "A-20 marked no-show", changes: [], at: 0 },
      committed: Promise.reject(Object.assign(new Error("denied"), { code: "permission-denied" })),
    });

    desk.handlers.onNoShow("t20");
    await vi.waitFor(() => expect(deps.ui.toast).toHaveBeenCalled());

    expect(deps.undoSlot.dismiss).toHaveBeenCalledWith("x");
    expect(deps.ui.toast).toHaveBeenCalledWith(
      `Couldn't save "A-20 marked no-show". This device isn't allowed to change the queue. Try signing in again.`,
      "error",
    );
  });
});
