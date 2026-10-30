/**
 * Every write the reception desk makes. Desk actions are batched writes, not
 * transactions, so they apply instantly and keep working offline (Firestore
 * queues them and syncs later). Each one returns an UndoEntry describing the
 * exact fields it changed, which powers the 5-second Undo toast and Ctrl+Z.
 *
 * Don't await the returned `committed` promises in UI code: while offline
 * they only resolve once the write reaches the server.
 */
import {
  collection,
  deleteField,
  doc,
  increment,
  runTransaction,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import type { DeskTicket, Doctor, OutboxMessage, PauseInfo, QueueDay, Ticket, TicketPrivate, VisitType } from "@/lib/types";
import {
  MOVE_BACK_PLACES,
  positionAfterMoveBack,
  positionAtEnd,
  positionAtIndex,
  positionForToken,
  tokenLabel,
} from "@/lib/queue/logic";

export interface DeskContext {
  clinicId: string;
  /** Clinic-local "YYYY-MM-DD". */
  date: string;
  /** Staff member signed in at the desk (PIN lock), recorded on each change. */
  staffId: string | null;
}

type Fields = Record<string, unknown>;

/** One document's change. before = null means the doc was created; after = null means deleted. */
export interface Change {
  path: string;
  before: Fields | null;
  after: Fields | null;
}

export interface UndoEntry {
  id: string;
  /** Toast text, e.g. "A-21 moved back 2 places". */
  message: string;
  changes: Change[];
  at: number;
}

export interface ActionResult {
  entry: UndoEntry;
  /** Resolves when the server has the write; rejects if it's refused. */
  committed: Promise<void>;
}

let seq = 0;
function entry(message: string, changes: Change[], at: number): UndoEntry {
  seq += 1;
  return { id: `${at}-${seq}`, message, changes, at };
}

function commit(changes: Change[]): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  for (const c of changes) {
    const ref = doc(db, c.path);
    if (c.after === null) batch.delete(ref);
    else if (c.before === null) batch.set(ref, c.after as DocumentData);
    else batch.update(ref, c.after as DocumentData);
  }
  return batch.commit();
}

/**
 * True when any document the entry touched has changed since (another desk,
 * the doctor's button, or a patient). Undoing then would clobber that newer
 * change, so callers should drop the entry instead.
 */
export function isUndoStale(e: UndoEntry, tickets: DeskTicket[]): boolean {
  const byId = new Map(tickets.map((t) => [t.id, t]));
  return e.changes.some((c) => {
    if (!c.after) return false;
    const id = c.path.split("/").pop()!;
    const t = byId.get(id);
    if (!t) return true;
    if (c.path.includes("/ticketPrivate/")) return t.name !== c.after.name;
    return t.updatedAt !== c.after.updatedAt || t.updatedBy !== c.after.updatedBy;
  });
}

/** Reverts an UndoEntry by writing back every field it changed. */
export function undo(e: UndoEntry): Promise<void> {
  const reversed: Change[] = e.changes.map((c) => ({ path: c.path, before: c.after, after: c.before }));
  // A reversed create is a delete and a reversed delete is a set; both pass
  // through as-is. A reversed field update writes the old values back.
  return commit(
    reversed.map((c) => {
      if (c.after === null || c.before === null) return c;
      // Fields that didn't exist before the action are removed again.
      const after: Fields = {};
      for (const key of Object.keys(c.before)) after[key] = key in c.after ? c.after[key] : deleteField();
      return { ...c, after };
    }),
  );
}

/** Builds a field-level change for a ticket, stamping who and when. */
function ticketChange(ctx: DeskContext, t: Ticket, patch: Partial<Ticket>, now: number): Change {
  const after: Fields = { ...patch, updatedBy: ctx.staffId, updatedAt: now };
  const before: Fields = {};
  for (const key of Object.keys(after)) before[key] = (t as unknown as Fields)[key] ?? null;
  return { path: paths.ticket(ctx.clinicId, t.id), before, after };
}

function run(message: string, changes: Change[], now: number): ActionResult {
  return { entry: entry(message, changes, now), committed: commit(changes) };
}

/**
 * "Next patient": marks whoever is with the doctor as done (recording the
 * consult length) and calls the head of the waiting list.
 */
export function callNext(ctx: DeskContext, serving: Ticket | null, waiting: Ticket[]): ActionResult | null {
  const now = Date.now();
  const next = waiting[0] ?? null;
  if (!serving && !next) return null;
  const changes: Change[] = [];
  if (serving) {
    changes.push(
      ticketChange(
        ctx,
        serving,
        { status: "done", finishedAt: now, consultMs: Math.max(0, now - (serving.calledAt ?? now)) },
        now,
      ),
    );
  }
  if (next) {
    changes.push(
      ticketChange(
        ctx,
        next,
        { status: "serving", calledAt: now, lastCallAt: now, callCount: next.callCount + 1, noReplyAt: null },
        now,
      ),
    );
  }
  const message = next ? `Called ${next.label}` : `${serving!.label} marked done`;
  return run(message, changes, now);
}

/** "Call again": re-announces the current token on the TV and patient phones. */
export function callAgain(ctx: DeskContext, serving: Ticket): ActionResult {
  const now = Date.now();
  return run(
    `Called ${serving.label} again`,
    [ticketChange(ctx, serving, { lastCallAt: now, callCount: serving.callCount + 1 }, now)],
    now,
  );
}

/**
 * "Not here": the called patient didn't come in. They go back into the queue
 * two places down (flagged "Called, no reply") and the next patient is called.
 */
export function notHere(ctx: DeskContext, serving: Ticket, waiting: Ticket[]): ActionResult {
  const now = Date.now();
  const next = waiting[0] ?? null;
  const changes: Change[] = [
    ticketChange(
      ctx,
      serving,
      {
        status: "waiting",
        position: positionAtIndex(waiting, MOVE_BACK_PLACES),
        priority: false,
        calledAt: null,
        noReplyAt: serving.lastCallAt ?? now,
      },
      now,
    ),
  ];
  if (next) {
    changes.push(
      ticketChange(
        ctx,
        next,
        { status: "serving", calledAt: now, lastCallAt: now, callCount: next.callCount + 1, noReplyAt: null },
        now,
      ),
    );
  }
  return run(`${serving.label} moved back ${MOVE_BACK_PLACES} places`, changes, now);
}

export function togglePriority(ctx: DeskContext, t: Ticket): ActionResult {
  const now = Date.now();
  const on = !t.priority;
  return run(
    on ? `${t.label} marked priority` : `${t.label} is no longer priority`,
    [ticketChange(ctx, t, { priority: on }, now)],
    now,
  );
}

export function moveBack(ctx: DeskContext, t: Ticket, waiting: Ticket[]): ActionResult {
  const now = Date.now();
  return run(
    `${t.label} moved back ${MOVE_BACK_PLACES} places`,
    [ticketChange(ctx, t, { position: positionAfterMoveBack(waiting, t.id), priority: false }, now)],
    now,
  );
}

export function skipToEnd(ctx: DeskContext, t: Ticket, waiting: Ticket[]): ActionResult {
  const now = Date.now();
  return run(
    `${t.label} skipped to the end`,
    [ticketChange(ctx, t, { position: positionAtEnd(waiting, t.id), priority: false }, now)],
    now,
  );
}

export function markNoShow(ctx: DeskContext, t: Ticket): ActionResult {
  const now = Date.now();
  return run(`${t.label} marked no-show`, [ticketChange(ctx, t, { status: "no_show", finishedAt: now }, now)], now);
}

export function removeTicket(ctx: DeskContext, t: Ticket): ActionResult {
  const now = Date.now();
  return run(`${t.label} removed`, [ticketChange(ctx, t, { status: "removed", finishedAt: now }, now)], now);
}

export function editName(ctx: DeskContext, t: DeskTicket, name: string): ActionResult {
  const now = Date.now();
  return run(
    `${t.label} renamed`,
    [{ path: paths.ticketPrivate(ctx.clinicId, t.id), before: { name: t.name }, after: { name: name.trim() } }],
    now,
  );
}

export interface WalkInInput {
  doctor: Doctor;
  name: string;
  phone: string | null;
  visitType: VisitType;
  /** lastToken from the desk's cached QueueDay; used only when offline. */
  lastTokenHint: number;
  /**
   * The desk already knows it's offline (snapshots come from cache) even if
   * the browser still reports a connection, e.g. on captive Wi-Fi. Skips the
   * transaction, which would otherwise retry for a long time.
   */
  preferOffline?: boolean;
}

export interface IssuedToken {
  ticketId: string;
  token: number;
  label: string;
  issuedAt: number;
  /** True when issued offline from the cached counter (label could clash in rare races). */
  offline: boolean;
}

function isOfflineError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === "unavailable" || code === "deadline-exceeded";
}

function newTicket(
  ctx: DeskContext,
  id: string,
  input: WalkInInput,
  token: number,
  now: number,
): { ticket: Omit<Ticket, "id">; priv: Omit<TicketPrivate, "id"> } {
  return {
    ticket: {
      clinicId: ctx.clinicId,
      doctorId: input.doctor.id,
      date: ctx.date,
      token,
      label: tokenLabel(input.doctor.prefix, token),
      status: "waiting",
      position: positionForToken(token),
      priority: input.visitType === "emergency",
      visitType: input.visitType,
      distance: "here",
      source: "walk_in",
      createdAt: now,
      calledAt: null,
      lastCallAt: null,
      callCount: 0,
      noReplyAt: null,
      finishedAt: null,
      consultMs: null,
      updatedBy: ctx.staffId,
      updatedAt: now,
    },
    priv: { clinicId: ctx.clinicId, date: ctx.date, name: input.name.trim(), phone: input.phone, patientUid: null },
  };
}

function newQueueDay(ctx: DeskContext, doctorId: string, lastToken: number): Omit<QueueDay, "id"> {
  return { clinicId: ctx.clinicId, doctorId, date: ctx.date, lastToken, paused: null, doctorButtonSeenAt: null };
}

/**
 * Issues a walk-in token. Online it reserves the number in a transaction so it
 * can't clash with patients joining by QR at the same moment; offline it falls
 * back to the cached counter so the desk never stops.
 */
export async function addWalkIn(ctx: DeskContext, input: WalkInInput): Promise<IssuedToken> {
  const db = getDb();
  const queueRef = doc(db, paths.queue(ctx.clinicId, input.doctor.id, ctx.date));
  const now = Date.now();
  const online = typeof navigator === "undefined" || navigator.onLine;

  if (online && !input.preferOffline) {
    const ticketRef = doc(collection(db, paths.tickets(ctx.clinicId)));
    const privRef = doc(db, paths.ticketPrivate(ctx.clinicId, ticketRef.id));
    try {
      const token = await runTransaction(
        db,
        async (tx) => {
          // A retried attempt after a lost commit response must not issue a second number.
          const existing = await tx.get(ticketRef);
          if (existing.exists()) return Number(existing.data().token);
          const snap = await tx.get(queueRef);
          const token = (snap.exists() ? Number(snap.data().lastToken ?? 0) : 0) + 1;
          if (snap.exists()) tx.update(queueRef, { lastToken: token });
          else tx.set(queueRef, newQueueDay(ctx, input.doctor.id, token));
          const { ticket, priv } = newTicket(ctx, ticketRef.id, input, token, now);
          tx.set(ticketRef, ticket);
          tx.set(privRef, priv);
          return token;
        },
        { maxAttempts: 2 },
      );
      return { ticketId: ticketRef.id, token, label: tokenLabel(input.doctor.prefix, token), issuedAt: now, offline: false };
    } catch (e) {
      if (!isOfflineError(e)) throw e;
    }
  }

  // Offline: a fresh id, so a transaction whose commit did land can't be overwritten.
  const ticketRef = doc(collection(db, paths.tickets(ctx.clinicId)));
  const privRef = doc(db, paths.ticketPrivate(ctx.clinicId, ticketRef.id));
  const token = input.lastTokenHint + 1;
  const { ticket, priv } = newTicket(ctx, ticketRef.id, input, token, now);
  const batch = writeBatch(db);
  batch.set(
    queueRef,
    { clinicId: ctx.clinicId, doctorId: input.doctor.id, date: ctx.date, lastToken: increment(1) },
    { merge: true },
  );
  batch.set(ticketRef, ticket);
  batch.set(privRef, priv);
  batch.commit().catch((e) => console.error("Offline walk-in failed to sync", e));
  return { ticketId: ticketRef.id, token, label: ticket.label, issuedAt: now, offline: true };
}

/**
 * Gives a ticket a fresh number from the counter, keeping its place in line.
 * Used after reconnecting when a walk-in issued offline turns out to share its
 * label with a patient who joined by QR during the outage.
 */
export async function reissueToken(ctx: DeskContext, t: Ticket, doctor: Doctor): Promise<string> {
  const db = getDb();
  const queueRef = doc(db, paths.queue(ctx.clinicId, doctor.id, t.date));
  const ticketRef = doc(db, paths.ticket(ctx.clinicId, t.id));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(queueRef);
    const token = (snap.exists() ? Number(snap.data().lastToken ?? 0) : 0) + 1;
    const label = tokenLabel(doctor.prefix, token);
    if (snap.exists()) tx.update(queueRef, { lastToken: token });
    else tx.set(queueRef, { ...newQueueDay(ctx, doctor.id, token), date: t.date });
    tx.update(ticketRef, { token, label, updatedBy: ctx.staffId, updatedAt: Date.now() });
    return label;
  });
}

export interface PauseInput {
  doctorId: string;
  reason: string;
  backAt: number | null;
  /** WhatsApp text for each waiting patient with a phone; empty to skip notifying. */
  notify: { phone: string; body: string }[];
}

/** Pauses one doctor's queue. Places are kept; ETAs freeze until resumed. */
export function pauseQueue(ctx: DeskContext, input: PauseInput): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const batch = writeBatch(db);
  const paused: PauseInfo = { reason: input.reason, since: now, backAt: input.backAt };
  batch.set(
    doc(db, paths.queue(ctx.clinicId, input.doctorId, ctx.date)),
    { clinicId: ctx.clinicId, doctorId: input.doctorId, date: ctx.date, paused },
    { merge: true },
  );
  for (const n of input.notify) {
    const msg: Omit<OutboxMessage, "id"> = {
      clinicId: ctx.clinicId,
      to: n.phone,
      kind: "pause",
      body: n.body,
      status: "queued",
      createdAt: now,
    };
    batch.set(doc(collection(db, paths.outbox(ctx.clinicId))), msg);
  }
  return batch.commit();
}

export function resumeQueue(ctx: DeskContext, doctorId: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.set(
    doc(db, paths.queue(ctx.clinicId, doctorId, ctx.date)),
    { clinicId: ctx.clinicId, doctorId, date: ctx.date, paused: null },
    { merge: true },
  );
  return batch.commit();
}

/** Heartbeat from the doctor's room button page. */
export function doctorButtonHeartbeat(ctx: DeskContext, doctorId: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.set(
    doc(db, paths.queue(ctx.clinicId, doctorId, ctx.date)),
    { clinicId: ctx.clinicId, doctorId, date: ctx.date, doctorButtonSeenAt: Date.now() },
    { merge: true },
  );
  return batch.commit();
}
