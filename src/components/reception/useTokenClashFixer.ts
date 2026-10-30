"use client";

import { useCallback, useEffect, useRef } from "react";
import { reissueToken, type DeskContext } from "@/lib/queue/actions";
import type { DeskTicket, Doctor } from "@/lib/types";
import type { ClashRenumbering } from "@/components/reception/ClashNotice";
import { useStoredState } from "@/components/reception/useStoredState";

const TOKENS_PREFIX = "baari:reception:offline-tokens:";
const NOTICES_PREFIX = "baari:reception:clash-notices:";

const NO_IDS: string[] = [];
const NO_NOTICES: ClashRenumbering[] = [];

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isNoticeList(value: unknown): value is ClashRenumbering[] {
  return (
    Array.isArray(value) &&
    value.every((v: unknown) => {
      if (typeof v !== "object" || v === null) return false;
      const n = v as Record<string, unknown>;
      return (
        typeof n.ticketId === "string" &&
        typeof n.oldLabel === "string" &&
        (n.newLabel === null || typeof n.newLabel === "string") &&
        typeof n.name === "string" &&
        typeof n.at === "number"
      );
    })
  );
}

const sameNotice = (a: ClashRenumbering, b: ClashRenumbering) => a.ticketId === b.ticketId && a.at === b.at;

export interface TokenClashFixer {
  /** Call with the ticket id of every walk-in issued offline (IssuedToken.offline). */
  remember(ticketId: string): void;
  /** Renumbered (or failed) clashes reception still has to act on, shared by every tab of the desk. */
  notices: ClashRenumbering[];
  /** Clears these notices in every tab; ones added meanwhile stay. */
  dismiss(notices: ClashRenumbering[]): void;
}

/**
 * Offline walk-ins take their number from the desk's cached counter, so a
 * patient who joined by QR during the outage can hold the same label. Tokens
 * issued offline are remembered per clinic and day in localStorage (a reload
 * or another tab still checks them). Once `ready` (the desk sees the server
 * again) and the walk-in has synced, a clashing one gets a fresh number from
 * the counter, keeping its place. This runs even while the desk is locked, so
 * the doctor's button never calls a duplicate label; who to tell goes on a
 * notice list in localStorage that every tab shows once unlocked, until
 * someone dismisses it. Each token is checked once.
 */
export function useTokenClashFixer(
  ctx: DeskContext,
  doctors: Doctor[],
  tickets: DeskTicket[],
  ready: boolean,
): TokenClashFixer {
  const { clinicId, date } = ctx;
  const [tracked, update] = useStoredState(`${TOKENS_PREFIX}${clinicId}:${date}`, NO_IDS, isIdList);
  const [notices, updateNotices] = useStoredState(`${NOTICES_PREFIX}${clinicId}:${date}`, NO_NOTICES, isNoticeList);

  const latestCtx = useRef(ctx);
  useEffect(() => {
    latestCtx.current = ctx;
  });

  // Reissues running in this tab, and ones that failed: neither is retried
  // until a reload, so a refused write can't loop.
  const inFlight = useRef(new Set<string>());
  const failed = useRef(new Set<string>());

  const remember = useCallback(
    (ticketId: string) => update((prev) => (prev.includes(ticketId) ? prev : [...prev, ticketId])),
    [update],
  );

  const dismiss = useCallback(
    (shown: ClashRenumbering[]) => updateNotices((prev) => prev.filter((n) => !shown.some((s) => sameNotice(s, n)))),
    [updateNotices],
  );

  // Earlier days' lists are moot once the date flips.
  useEffect(() => {
    try {
      const prefixes = [TOKENS_PREFIX, NOTICES_PREFIX].map((p) => `${p}${clinicId}:`);
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        const prefix = k && prefixes.find((p) => k.startsWith(p));
        if (k && prefix && k.slice(prefix.length) < date) window.localStorage.removeItem(k);
      }
    } catch {
      // Storage blocked: nothing was kept there either.
    }
  }, [clinicId, date]);

  useEffect(() => {
    if (!ready || tracked.length === 0) return;

    /** Takes `id` off the list; false if another tab already did, so only one tab acts on it. */
    function claim(id: string): boolean {
      let had = false;
      update((prev) => {
        had = prev.includes(id);
        return had ? prev.filter((x) => x !== id) : prev;
      });
      return had;
    }

    /** One entry per ticket: a later outcome (a retry after reload) replaces an earlier one. */
    function addNotice(notice: ClashRenumbering) {
      updateNotices((prev) => [...prev.filter((n) => n.ticketId !== notice.ticketId), notice]);
    }

    for (const id of tracked) {
      if (inFlight.current.has(id) || failed.current.has(id)) continue;
      const t = tickets.find((x) => x.id === id);
      // Not in the snapshot yet, or not on the server yet: QR joins from the outage may still be unseen.
      if (!t || t.pending) continue;
      const doctor = doctors.find((d) => d.id === t.doctorId);
      const clash =
        t.status === "waiting" &&
        tickets.some((o) => o.id !== t.id && o.doctorId === t.doctorId && o.status !== "removed" && o.label === t.label);
      if (!claim(id)) continue;
      if (!clash || !doctor) {
        // The clash resolved itself (e.g. the QR ticket left): drop any earlier "couldn't renumber" line.
        updateNotices((prev) => prev.filter((n) => n.ticketId !== id || n.newLabel !== null));
        continue;
      }

      inFlight.current.add(id);
      const notice = (newLabel: string | null): ClashRenumbering => ({
        ticketId: id,
        oldLabel: t.label,
        newLabel,
        name: t.name,
        at: Date.now(),
      });
      reissueToken(latestCtx.current, t, doctor)
        .then(
          (label) => addNotice(notice(label)),
          (err: unknown) => {
            console.error("Couldn't renumber a clashing offline token", err);
            failed.current.add(id);
            // Kept on the list so a reload tries again.
            update((prev) => (prev.includes(id) ? prev : [...prev, id]));
            addNotice(notice(null));
          },
        )
        .finally(() => inFlight.current.delete(id));
    }
  }, [ready, tracked, tickets, doctors, update, updateNotices]);

  return { remember, notices, dismiss };
}
