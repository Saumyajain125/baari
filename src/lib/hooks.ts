"use client";

/**
 * Live Firestore subscriptions used across the app. Every hook re-subscribes
 * when its inputs change and tolerates missing ids (returns empty/loading).
 */
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb, getFirebaseAuth, firebaseConfigured } from "@/lib/firebase";
import { paths } from "@/lib/paths";
import { DEFAULT_TIMEZONE, dateKey } from "@/lib/time";
import type { Clinic, DeskTicket, Doctor, QueueDay, Staff, Ticket, TicketPrivate, UserProfile } from "@/lib/types";

type Snap = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

export function toClinic(s: Snap): Clinic {
  const d = s.data() ?? {};
  return {
    id: s.id,
    name: d.name ?? "",
    ownerUid: d.ownerUid ?? "",
    timezone: d.timezone ?? DEFAULT_TIMEZONE,
    defaultConsultMin: d.defaultConsultMin ?? 6,
    lockAfterMin: d.lockAfterMin ?? 10,
    createdAt: d.createdAt ?? 0,
  };
}

export function toDoctor(s: Snap): Doctor {
  const d = s.data() ?? {};
  return {
    id: s.id,
    name: d.name ?? "",
    prefix: d.prefix ?? "A",
    room: d.room ?? "",
    order: d.order ?? 0,
    startsAt: d.startsAt ?? null,
    active: d.active ?? true,
  };
}

export function toStaff(s: Snap): Staff {
  const d = s.data() ?? {};
  return {
    id: s.id,
    name: d.name ?? "",
    initials: d.initials ?? "",
    pinHash: d.pinHash ?? "",
    pinSalt: d.pinSalt ?? "",
    order: d.order ?? 0,
  };
}

export function toQueueDay(s: Snap): QueueDay {
  const d = s.data() ?? {};
  return {
    id: s.id,
    clinicId: d.clinicId ?? "",
    doctorId: d.doctorId ?? "",
    date: d.date ?? "",
    lastToken: d.lastToken ?? 0,
    paused: d.paused ?? null,
    doctorButtonSeenAt: d.doctorButtonSeenAt ?? null,
  };
}

export function toTicket(s: Snap): Ticket {
  const d = s.data() ?? {};
  return {
    id: s.id,
    clinicId: d.clinicId,
    doctorId: d.doctorId,
    date: d.date,
    token: d.token ?? 0,
    label: d.label ?? "",
    status: d.status ?? "waiting",
    position: d.position ?? 0,
    priority: d.priority ?? false,
    visitType: d.visitType ?? "new",
    distance: d.distance ?? "here",
    source: d.source ?? "walk_in",
    createdAt: d.createdAt ?? 0,
    calledAt: d.calledAt ?? null,
    lastCallAt: d.lastCallAt ?? null,
    callCount: d.callCount ?? 0,
    noReplyAt: d.noReplyAt ?? null,
    finishedAt: d.finishedAt ?? null,
    consultMs: d.consultMs ?? null,
    updatedBy: d.updatedBy ?? null,
    updatedAt: d.updatedAt ?? 0,
  };
}

export function toTicketPrivate(s: Snap): TicketPrivate {
  const d = s.data() ?? {};
  return {
    id: s.id,
    clinicId: d.clinicId ?? "",
    date: d.date ?? "",
    name: d.name ?? "",
    phone: d.phone ?? null,
    patientUid: d.patientUid ?? null,
  };
}

/** Re-renders every `intervalMs` and returns the current epoch ms (for timers). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Clinic-local "YYYY-MM-DD"; flips at midnight so the queue starts fresh. */
export function useToday(timezone: string = DEFAULT_TIMEZONE): string {
  const now = useNow(30_000);
  return dateKey(now, timezone);
}

export function useAuthUser(): { user: User | null; loading: boolean } {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: firebaseConfigured,
  });
  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (user) => setState({ user, loading: false }));
  }, []);
  return state;
}

export interface Loadable<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

type Unsubscribe = () => void;

const NO_ITEMS: never[] = [];
const NO_QUEUES: Record<string, QueueDay> = {};

/**
 * One live subscription identified by `key` (its path plus filters). The
 * result remembers which key its data belongs to, so the very first render
 * after a key appears or changes already reports `loading: true` instead of
 * flashing the previous (or empty) data as if it were final.
 */
function useSubscription<T>(
  key: string | null,
  subscribe: (next: (data: T) => void, fail: (error: Error) => void) => Unsubscribe,
  empty: T,
): Loadable<T> {
  const [state, setState] = useState<{ key: string | null; data: T; error: Error | null }>({
    key: null,
    data: empty,
    error: null,
  });
  useEffect(() => {
    if (!key) return;
    return subscribe(
      (data) => setState({ key, data, error: null }),
      (error) => setState({ key, data: empty, error }),
    );
    // `key` encodes every input `subscribe` reads; `empty` is a module constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return { data: empty, loading: false, error: null };
  if (state.key !== key) return { data: empty, loading: true, error: null };
  return { data: state.data, loading: false, error: state.error };
}

function useDocSub<T>(path: string | null, map: (s: Snap) => T): Loadable<T | null> {
  return useSubscription<T | null>(
    path,
    (next, fail) => onSnapshot(doc(getDb(), path!), (s) => next(s.exists() ? map(s) : null), fail),
    null,
  );
}

export function useUserProfile(uid: string | null | undefined): Loadable<UserProfile | null> {
  return useDocSub(uid ? paths.user(uid) : null, (s) => ({ uid: s.id, clinicId: s.data()?.clinicId ?? "" }));
}

export function useClinic(clinicId: string | null | undefined): Loadable<Clinic | null> {
  return useDocSub(clinicId ? paths.clinic(clinicId) : null, toClinic);
}

export function useDoctors(clinicId: string | null | undefined): Loadable<Doctor[]> {
  return useSubscription<Doctor[]>(
    clinicId ? paths.doctors(clinicId) : null,
    (next, fail) =>
      onSnapshot(
        query(collection(getDb(), paths.doctors(clinicId!)), orderBy("order")),
        (s) => next(s.docs.map(toDoctor)),
        fail,
      ),
    NO_ITEMS,
  );
}

export function useStaff(clinicId: string | null | undefined): Loadable<Staff[]> {
  return useSubscription<Staff[]>(
    clinicId ? paths.staff(clinicId) : null,
    (next, fail) =>
      onSnapshot(
        query(collection(getDb(), paths.staff(clinicId!)), orderBy("order")),
        (s) => next(s.docs.map(toStaff)),
        fail,
      ),
    NO_ITEMS,
  );
}

/** Today's QueueDay docs keyed by doctorId. Missing doctors simply have no entry yet. */
export function useQueueDays(clinicId: string | null | undefined, date: string): Loadable<Record<string, QueueDay>> {
  return useSubscription<Record<string, QueueDay>>(
    clinicId ? `${paths.queues(clinicId)}?date=${date}` : null,
    (next, fail) =>
      onSnapshot(
        query(collection(getDb(), paths.queues(clinicId!)), where("date", "==", date)),
        (s) => {
          const data: Record<string, QueueDay> = {};
          for (const d of s.docs) {
            const q = toQueueDay(d);
            data[q.doctorId] = q;
          }
          next(data);
        },
        fail,
      ),
    NO_QUEUES,
  );
}

export interface DeskTickets {
  tickets: DeskTicket[];
  loading: boolean;
  error: Error | null;
  /** True while the snapshot comes from the local cache (we may be offline). */
  fromCache: boolean;
  /** Number of tickets with writes not yet on the server. */
  pendingCount: number;
}

interface TicketsSnap {
  key: string | null;
  list: Ticket[];
  pending: Set<string>;
  fromCache: boolean;
}

interface PrivatesSnap {
  map: Map<string, TicketPrivate>;
  pending: Set<string>;
}

/**
 * Today's tickets for the whole clinic, joined with their private name/phone,
 * with per-ticket "not synced" flags. Members only.
 */
export function useDeskTickets(clinicId: string | null | undefined, date: string): DeskTickets {
  const key = clinicId ? `${paths.tickets(clinicId)}?date=${date}` : null;
  const [tickets, setTickets] = useState<TicketsSnap>({ key: null, list: [], pending: new Set(), fromCache: false });
  const [privates, setPrivates] = useState<PrivatesSnap>({ map: new Map(), pending: new Set() });
  const [error, setError] = useState<{ key: string; error: Error } | null>(null);

  useEffect(() => {
    if (!clinicId || !key) return;
    const db = getDb();
    const unsubTickets = onSnapshot(
      query(collection(db, paths.tickets(clinicId)), where("date", "==", date)),
      { includeMetadataChanges: true },
      (s) => {
        const pending = new Set<string>();
        const list = s.docs.map((d) => {
          if (d.metadata.hasPendingWrites) pending.add(d.id);
          return toTicket(d);
        });
        setTickets({ key, list, pending, fromCache: s.metadata.fromCache });
      },
      (e) => setError({ key, error: e }),
    );
    const unsubPrivate = onSnapshot(
      query(collection(db, paths.ticketPrivates(clinicId)), where("date", "==", date)),
      { includeMetadataChanges: true },
      (s) => {
        const map = new Map<string, TicketPrivate>();
        const pending = new Set<string>();
        for (const d of s.docs) {
          map.set(d.id, toTicketPrivate(d));
          if (d.metadata.hasPendingWrites) pending.add(d.id);
        }
        setPrivates({ map, pending });
      },
      (e) => setError({ key, error: e }),
    );
    return () => {
      unsubTickets();
      unsubPrivate();
    };
  }, [clinicId, date, key]);

  return useMemo(() => {
    const current = key !== null && tickets.key === key;
    const failure = error && error.key === key ? error.error : null;
    const merged: DeskTicket[] = current
      ? tickets.list.map((t) => {
          const p = privates.map.get(t.id);
          return {
            ...t,
            name: p?.name ?? "",
            phone: p?.phone ?? null,
            pending: tickets.pending.has(t.id) || privates.pending.has(t.id),
          };
        })
      : [];
    return {
      tickets: merged,
      loading: key !== null && !current && !failure,
      error: failure,
      fromCache: current && tickets.fromCache,
      pendingCount: merged.filter((t) => t.pending).length,
    };
  }, [key, tickets, privates, error]);
}

/** Today's public (name-free) tickets: for the TV display and patient pages. */
export function usePublicTickets(clinicId: string | null | undefined, date: string): Loadable<Ticket[]> {
  return useSubscription<Ticket[]>(
    clinicId ? `${paths.tickets(clinicId)}?date=${date}` : null,
    (next, fail) =>
      onSnapshot(
        query(collection(getDb(), paths.tickets(clinicId!)), where("date", "==", date)),
        (s) => next(s.docs.map(toTicket)),
        fail,
      ),
    NO_ITEMS,
  );
}

/** One ticket by id (public fields). */
export function useTicket(clinicId: string | null | undefined, ticketId: string | null | undefined) {
  return useDocSub(clinicId && ticketId ? paths.ticket(clinicId, ticketId) : null, toTicket);
}

/** Browser connectivity, with the time the connection dropped. */
export function useConnectivity(): { online: boolean; offlineSince: number | null } {
  const [state, setState] = useState<{ online: boolean; offlineSince: number | null }>({
    online: true,
    offlineSince: null,
  });
  useEffect(() => {
    const update = () =>
      setState((s) =>
        navigator.onLine
          ? { online: true, offlineSince: null }
          : { online: false, offlineSince: s.offlineSince ?? Date.now() },
      );
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return state;
}

/** Tracks a CSS media query, e.g. "(min-width: 1280px)". False during SSR. */
export function useMediaQuery(q: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(q);
    const update = () => setMatch(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [q]);
  return match;
}
