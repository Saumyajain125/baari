"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { toTicketPrivate } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import {
  parseRememberedTicket,
  readRememberedTicketRaw,
  rememberedTicketKey,
  type RememberedTicket,
} from "@/lib/queue/patient";
import type { TicketPrivate } from "@/lib/types";

/** The token this phone joined with today (localStorage), live across tabs. */
export function useRememberedTicket(clinicId: string, today: string): RememberedTicket | null {
  const raw = useSyncExternalStore(
    (onChange) => {
      const key = rememberedTicketKey(clinicId);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    () => readRememberedTicketRaw(clinicId),
    () => null,
  );
  return parseRememberedTicket(raw, today);
}

export interface PatientPrivateState {
  data: TicketPrivate | null;
  /** True until the first answer (or denial) comes back. */
  loading: boolean;
}

/**
 * The ticket's private doc (name, phone, patientUid). Rules only let the
 * patient who joined read it, so for anyone else this settles to null, which
 * is how the status page knows it's being watched from another phone.
 */
export function usePatientPrivate(
  clinicId: string,
  ticketId: string,
  uid: string | null,
): PatientPrivateState {
  const [state, setState] = useState<PatientPrivateState & { key: string | null }>({
    data: null,
    loading: true,
    key: null,
  });
  const key = uid ? `${clinicId}/${ticketId}/${uid}` : null;

  useEffect(() => {
    if (!key) return;
    return onSnapshot(
      doc(getDb(), paths.ticketPrivate(clinicId, ticketId)),
      (s) => setState({ data: s.exists() ? toTicketPrivate(s) : null, loading: false, key }),
      () => setState({ data: null, loading: false, key }),
    );
  }, [clinicId, ticketId, key]);

  if (!key) return { data: null, loading: false };
  // A new uid/ticket starts loading again instead of showing the previous answer.
  if (state.key !== key) return { data: null, loading: true };
  return { data: state.data, loading: state.loading };
}
