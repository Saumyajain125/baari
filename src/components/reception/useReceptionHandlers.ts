"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  addWalkIn,
  callAgain,
  callNext,
  editName,
  isUndoStale,
  markNoShow,
  moveBack,
  notHere,
  pauseQueue,
  removeTicket,
  resumeQueue,
  skipToEnd,
  togglePriority,
  undo,
  type ActionResult,
  type DeskContext,
  type IssuedToken,
} from "@/lib/queue/actions";
import {
  aheadCount,
  calledJustNow,
  compareWaiting,
  computeStats,
  estimateWait,
  formatEstimate,
  positionForToken,
  servingFor,
  waitingFor,
} from "@/lib/queue/logic";
import { formatClock, formatSlipStamp } from "@/lib/time";
import type { Clinic, DeskTicket, Doctor, QueueDay, Ticket } from "@/lib/types";
import {
  pauseMessage,
  type IssuedSlip,
  type PauseFormInput,
  type ReceptionHandlers,
  type WalkInFormInput,
} from "@/components/reception/handlers";
import type { ToastTone } from "@/components/reception/ErrorToast";
import type { UndoSlot } from "@/components/reception/useUndoSlot";

/**
 * Until the snapshot shows the patient a Next just called, calledJustNow can't
 * see them; a second Next for the same doctor this soon is the same double tap.
 */
const REPEAT_TAP_MS = 500;

/** firestore.rules caps patient names at this many characters. */
const MAX_NAME_LENGTH = 80;

/** UI the handlers drive but don't own: selection, dialogs, the lock and toasts. */
export interface DeskUi {
  selectDoctor(doctorId: string): void;
  openWalkIn(doctorId?: string): void;
  openPause(doctorId: string): void;
  lock(): void;
  openSettings(): void;
  openInsights(): void;
  toast(message: string, tone: ToastTone): void;
}

export interface DeskDeps {
  clinic: Clinic;
  ctx: DeskContext;
  /** Active doctors, in tab order. */
  doctors: Doctor[];
  tickets: DeskTicket[];
  /** Today's QueueDay per doctorId. */
  queueDays: Record<string, QueueDay>;
  /** The desk can't reach the server (offline banner up, or snapshots only from cache). */
  offline: boolean;
  /** Remembers a walk-in token issued offline, so a clash with a QR join is caught on reconnect. */
  rememberOfflineToken(ticketId: string): void;
  undoSlot: Pick<UndoSlot, "push" | "take" | "dismiss">;
  /** Counts a write towards the offline banner's "N taps saved". */
  recordAction(): void;
  ui: DeskUi;
}

export interface DeskActions {
  handlers: ReceptionHandlers;
  /** AddWalkInModal.onSubmit: issues the token and builds the printed slip. */
  submitWalkIn(input: WalkInFormInput): Promise<IssuedSlip>;
  /** PauseQueueModal.onConfirm for `doctorId`. */
  confirmPause(doctorId: string, input: PauseFormInput): void;
}

/**
 * The desk's write side. Returns one stable object whose callbacks always see
 * the latest snapshot (through a ref), so layouts can bind them in effects,
 * e.g. the laptop's keyboard shortcuts, without re-subscribing every second.
 */
export function useReceptionHandlers(deps: DeskDeps): DeskActions {
  const latest = useRef(deps);
  useLayoutEffect(() => {
    latest.current = deps;
  });
  return useMemo(() => createDeskActions(() => latest.current), []);
}

export function createDeskActions(get: () => DeskDeps): DeskActions {
  const lastNextAt = new Map<string, number>();

  function report(failure: string, err: unknown) {
    console.error(failure, err);
    get().ui.toast(`${failure}. ${explain(err)}`, "error");
  }

  /** Runs a desk action, catching synchronous throws (bad data, Firestore not ready). */
  function attempt(failure: string, run: (s: DeskDeps) => void) {
    try {
      run(get());
    } catch (err) {
      report(failure, err);
    }
  }

  /** Offers the action for undo and reports it if the server later refuses it. */
  function track(result: ActionResult | null) {
    if (!result) return;
    const { undoSlot, recordAction } = get();
    undoSlot.push(result.entry);
    recordAction();
    result.committed.catch((err: unknown) => {
      get().undoSlot.dismiss(result.entry.id);
      report(`Couldn't save "${result.entry.message}"`, err);
    });
  }

  /** Fire-and-forget write: never awaited, since offline it only settles after reconnecting. */
  function send(failure: string, committed: Promise<void>) {
    get().recordAction();
    committed.catch((err: unknown) => report(failure, err));
  }

  function waitingTicket(s: DeskDeps, ticketId: string): DeskTicket | null {
    const t = s.tickets.find((x) => x.id === ticketId);
    return t && t.status === "waiting" ? t : null;
  }

  /** Calling someone in while the doctor is on a break would contradict the TV and patient phones. */
  function blockedByPause(s: DeskDeps, doctorId: string): boolean {
    if (!s.queueDays[doctorId]?.paused) return false;
    const name = s.doctors.find((d) => d.id === doctorId)?.name ?? "This doctor";
    s.ui.toast(`${name}'s queue is paused. Resume it to call the next patient.`, "info");
    return true;
  }

  /**
   * The patient with the doctor was called moments ago: by this desk's first
   * tap of a double tap, or by the doctor's button or another desk racing it.
   * Acting now would finish (or move back) someone who hasn't reached the room.
   */
  function blockedByFreshCall(s: DeskDeps, serving: DeskTicket | null, hint: string): boolean {
    if (!serving || !calledJustNow(serving, Date.now())) return false;
    s.ui.toast(`${serving.label} was just called. ${hint}`, "info");
    return true;
  }

  const handlers: ReceptionHandlers = {
    onSelectDoctor: (doctorId) => get().ui.selectDoctor(doctorId),

    onNext: (doctorId) =>
      attempt("Couldn't call the next patient", (s) => {
        if (blockedByPause(s, doctorId)) return;
        const at = Date.now();
        if (at - (lastNextAt.get(doctorId) ?? 0) < REPEAT_TAP_MS) return;
        const serving = servingFor(s.tickets, doctorId);
        if (blockedByFreshCall(s, serving, "Tap again in a moment to finish their consult.")) return;
        lastNextAt.set(doctorId, at);
        track(callNext(s.ctx, serving, waitingFor(s.tickets, doctorId)));
      }),

    onCallAgain: (doctorId) =>
      attempt("Couldn't call again", (s) => {
        const serving = servingFor(s.tickets, doctorId);
        if (serving) track(callAgain(s.ctx, serving));
      }),

    onNotHere: (doctorId) =>
      attempt("Couldn't move the patient back", (s) => {
        const serving = servingFor(s.tickets, doctorId);
        // "Not here" also calls the next patient in, so it follows the pause like Next does.
        if (!serving || blockedByPause(s, doctorId)) return;
        if (blockedByFreshCall(s, serving, "Give them a moment to reach the room.")) return;
        track(notHere(s.ctx, serving, waitingFor(s.tickets, doctorId)));
      }),

    onPriority: (ticketId) =>
      attempt("Couldn't change priority", (s) => {
        const t = waitingTicket(s, ticketId);
        if (t) track(togglePriority(s.ctx, t));
      }),

    onBack2: (ticketId) =>
      attempt("Couldn't move the patient back", (s) => {
        const t = waitingTicket(s, ticketId);
        if (t) track(moveBack(s.ctx, t, waitingFor(s.tickets, t.doctorId)));
      }),

    onSkip: (ticketId) =>
      attempt("Couldn't skip the patient", (s) => {
        const t = waitingTicket(s, ticketId);
        if (t) track(skipToEnd(s.ctx, t, waitingFor(s.tickets, t.doctorId)));
      }),

    onNoShow: (ticketId) =>
      attempt("Couldn't mark the no-show", (s) => {
        const t = waitingTicket(s, ticketId);
        if (t) track(markNoShow(s.ctx, t));
      }),

    onRemove: (ticketId) =>
      attempt("Couldn't remove the patient", (s) => {
        const t = waitingTicket(s, ticketId);
        if (t) track(removeTicket(s.ctx, t));
      }),

    onEditName: (ticketId, name) =>
      attempt("Couldn't rename the patient", (s) => {
        const t = s.tickets.find((x) => x.id === ticketId);
        const trimmed = name.trim();
        if (trimmed.length > MAX_NAME_LENGTH) {
          s.ui.toast(`Names can be up to ${MAX_NAME_LENGTH} characters. Shorten it and save again.`, "info");
          return;
        }
        if (t && trimmed && trimmed !== t.name) track(editName(s.ctx, t, trimmed));
      }),

    onAddWalkIn: (doctorId) => get().ui.openWalkIn(doctorId),
    onPause: (doctorId) => get().ui.openPause(doctorId),

    onResume: (doctorId) =>
      attempt("Couldn't resume the queue", (s) => send("Couldn't resume the queue", resumeQueue(s.ctx, doctorId))),

    onUndo: () =>
      attempt("Couldn't undo", (s) => {
        const entry = s.undoSlot.take();
        if (!entry) return;
        // Someone else (the doctor's button, another desk, the patient) changed
        // these tickets since: writing the old values back would clobber that.
        if (isUndoStale(entry, s.tickets)) {
          s.ui.toast("Can't undo: the queue changed since. Check the list.", "info");
          return;
        }
        send(`Couldn't undo "${entry.message}"`, undo(entry));
      }),

    onOpenTv: () => window.open(`/tv/${encodeURIComponent(get().ctx.clinicId)}`, "baari-tv"),
    onPrintPoster: () => window.open(`/poster/${encodeURIComponent(get().ctx.clinicId)}`, "baari-poster"),
    onOpenSettings: () => get().ui.openSettings(),
    onOpenInsights: () => get().ui.openInsights(),
    onLock: () => get().ui.lock(),
  };

  async function submitWalkIn(input: WalkInFormInput): Promise<IssuedSlip> {
    const s = get();
    const doctor = s.doctors.find((d) => d.id === input.doctorId);
    if (!doctor) throw new Error("That doctor isn't available any more. Pick another one.");

    let issued: IssuedToken;
    try {
      issued = await addWalkIn(s.ctx, {
        doctor,
        name: input.name,
        phone: input.phone,
        visitType: input.visitType,
        lastTokenHint: s.queueDays[doctor.id]?.lastToken ?? 0,
        preferOffline: s.offline,
      });
    } catch (err) {
      // The modal keeps the form filled and shows its own error, so no toast here.
      console.error("Couldn't issue the token", err);
      throw err;
    }

    // The new ticket may or may not be in the latest snapshot yet, so place it
    // in today's waiting list ourselves. Emergencies join as priority, exactly
    // as addWalkIn writes them.
    const fresh = get();
    fresh.recordAction();
    if (issued.offline) fresh.rememberOfflineToken(issued.ticketId);
    const mine: Pick<Ticket, "id" | "priority" | "position" | "token"> = {
      id: issued.ticketId,
      priority: input.visitType === "emergency",
      position: positionForToken(issued.token),
      token: issued.token,
    };
    const waiting = [...waitingFor(fresh.tickets, doctor.id).filter((t) => t.id !== mine.id), mine].sort(
      compareWaiting,
    );
    const ahead = aheadCount(waiting, mine.id);
    const avgConsultMin = computeStats(fresh.tickets, doctor.id).avgConsultMin ?? fresh.clinic.defaultConsultMin;

    return {
      label: issued.label,
      clinicName: fresh.clinic.name,
      doctorName: doctor.name,
      room: doctor.room,
      ahead,
      etaText: ahead === 0 ? "You're next" : formatEstimate(estimateWait(ahead, avgConsultMin)),
      issuedAtText: formatSlipStamp(issued.issuedAt, fresh.clinic.timezone),
      offline: issued.offline,
    };
  }

  function confirmPause(doctorId: string, input: PauseFormInput) {
    attempt("Couldn't pause the queue", (s) => {
      // The modal already turns "Lunch break" into "Lunch"; typed reasons stay as written.
      const reason = input.reason.trim() || "Break";
      const backAtLabel = input.backAt !== null ? formatClock(input.backAt, s.clinic.timezone) : null;
      const message = pauseMessage(reason, backAtLabel);
      const notify = input.notify
        ? waitingFor(s.tickets, doctorId).flatMap((t) =>
            t.phone ? [{ phone: t.phone, body: `${s.clinic.name}, token ${t.label}. ${message}` }] : [],
          )
        : [];
      send("Couldn't pause the queue", pauseQueue(s.ctx, { doctorId, reason, backAt: input.backAt, notify }));
    });
  }

  return { handlers, submitWalkIn, confirmPause };
}

/** Plain-language reason for a refused or failed write. */
function explain(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? err.code : null;
  switch (code) {
    case "permission-denied":
      return "This device isn't allowed to change the queue. Try signing in again.";
    case "not-found":
      return "That patient is no longer in the queue.";
    case "unavailable":
    case "deadline-exceeded":
      return "The connection dropped. Please try again.";
    default:
      return "Please try again.";
  }
}
