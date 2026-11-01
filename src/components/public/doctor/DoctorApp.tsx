"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClinicGate, type ClinicSession } from "@/components/auth/ClinicGate";
import { useWakeLock } from "@/components/public/hooks";
import { PublicLoading, PublicMessage } from "@/components/public/ui";
import { ErrorToast, type ToastTone } from "@/components/reception/ErrorToast";
import { pauseMessage } from "@/components/reception/handlers";
import { UndoToast } from "@/components/reception/UndoToast";
import { useUndoSlot } from "@/components/reception/useUndoSlot";
import {
  useClinic,
  useConnectivity,
  useDeskTickets,
  useDoctors,
  useNow,
  useQueueDays,
  useToday,
} from "@/lib/hooks";
import {
  callAgain,
  callNext,
  doctorButtonHeartbeat,
  isUndoStale,
  resumeQueue,
  undo,
  type ActionResult,
  type DeskContext,
} from "@/lib/queue/actions";
import { calledJustNow, DOUBLE_TAP_MS, servingFor, waitingFor } from "@/lib/queue/logic";
import { buildDoctorQueueView } from "@/lib/view";
import { DoctorButton } from "./DoctorButton";

/** Recorded as `updatedBy` on tickets the doctor's button changes. */
const DOCTOR_ACTOR = "doctor-button";
const HEARTBEAT_MS = 30_000;
/** Reception shows "linked" for 90 s after a heartbeat; mirror it here. */
const LINK_FRESH_MS = 90_000;
/** Taps on Next closer together than this are one tap (same as the desk). */
const REPEAT_TAP_MS = 500;

/** /doctor/[clinicId]/[doctorId]: the button in the doctor's room. Needs the clinic account. */
export function DoctorApp({ clinicId, doctorId }: { clinicId: string; doctorId: string }) {
  return (
    <ClinicGate>
      {(session) =>
        session.clinicId === clinicId ? (
          <DoctorRoom key={`${clinicId}/${doctorId}`} session={session} doctorId={doctorId} />
        ) : (
          <WrongClinic session={session} />
        )
      }
    </ClinicGate>
  );
}

export function WrongClinic({ session }: { session: ClinicSession }) {
  return (
    <PublicMessage
      title="This device belongs to another clinic"
      action={
        <Link href={`/doctor/${encodeURIComponent(session.clinicId)}`} className="font-semibold">
          Open {session.clinic.name}&apos;s doctor buttons
        </Link>
      }
    >
      It&apos;s signed in to {session.clinic.name}. Open the doctor&apos;s button link from that clinic&apos;s Settings.
    </PublicMessage>
  );
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

function DoctorRoom({ session, doctorId }: { session: ClinicSession; doctorId: string }) {
  const { clinicId } = session;
  const clinic = useClinic(clinicId).data ?? session.clinic;
  const { timezone } = clinic;
  const today = useToday(timezone);
  const now = useNow(1000);
  const doctorsSub = useDoctors(clinicId);
  const queueDays = useQueueDays(clinicId, today);
  const desk = useDeskTickets(clinicId, today);
  const { online } = useConnectivity();
  const undoSlot = useUndoSlot();
  const [toast, setToast] = useState<Toast | null>(null);
  const lastNextAt = useRef(0);
  // When this tablet first saw each call (see callId). calledAt comes from the
  // clock of whichever device made the call, which can be seconds off this one.
  const callsSeenAt = useRef(new Map<string, number>());
  const sawServerSnapshot = useRef(false);
  useWakeLock();

  const ctx: DeskContext = useMemo(() => ({ clinicId, date: today, staffId: DOCTOR_ACTOR }), [clinicId, today]);
  const lastAck = useHeartbeat(ctx, doctorId);

  const toastSeq = useRef(0);
  const showToast = useCallback((message: string, tone: ToastTone = "error") => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((t) => (t === toast ? null : t)), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  const servingNow = servingFor(desk.tickets, doctorId);
  const servingCall = servingNow ? callId(servingNow) : null;
  useEffect(() => {
    if (desk.loading) return;
    // Cached snapshots and the first one from the server show the queue as it
    // already was when the page opened: those calls weren't "just" made.
    const initial = !sawServerSnapshot.current;
    if (!desk.fromCache) sawServerSnapshot.current = true;
    if (!servingCall || callsSeenAt.current.has(servingCall)) return;
    callsSeenAt.current.set(servingCall, initial ? 0 : Date.now());
  }, [desk.loading, desk.fromCache, servingCall]);

  const doctor = doctorsSub.data.find((d) => d.id === doctorId) ?? null;

  if (doctorsSub.loading || (desk.loading && desk.tickets.length === 0)) return <PublicLoading label="Opening the doctor's button…" />;
  if (!doctor) {
    return (
      <PublicMessage
        title="We couldn't find this doctor"
        action={
          <Link href={`/doctor/${encodeURIComponent(clinicId)}`} className="font-semibold">
            Choose the doctor for this room
          </Link>
        }
      >
        They may have been removed in Settings.
      </PublicMessage>
    );
  }

  const queue = queueDays.data[doctorId];
  const view = buildDoctorQueueView(doctor, desk.tickets, queue, now, timezone);

  function track(result: ActionResult | null, failure: string) {
    if (!result) return;
    undoSlot.push(result.entry);
    result.committed.catch(() => {
      undoSlot.dismiss(result.entry.id);
      showToast(failure);
    });
  }

  function next() {
    const at = Date.now();
    // A second tap can land before the snapshot shows this button's own call.
    if (at - lastNextAt.current < REPEAT_TAP_MS) return;
    const serving = servingFor(desk.tickets, doctorId);
    // Whoever is in the room was only just called (here or at the desk): another
    // Next now would mark them done before they got to the room. A call this
    // tablet only just saw counts too, whatever the desk's clock stamped on it.
    const seenAt = serving ? callsSeenAt.current.get(callId(serving)) : undefined;
    if (serving && (calledJustNow(serving, at) || at - (seenAt ?? at) < DOUBLE_TAP_MS)) {
      if (serving.updatedBy !== DOCTOR_ACTOR) {
        showToast(`Reception just called ${serving.label}. Tap Next again once they're done.`, "info");
      }
      return;
    }
    lastNextAt.current = at;
    track(
      callNext(ctx, serving, waitingFor(desk.tickets, doctorId)),
      "Couldn't call the next patient. Please tell reception.",
    );
  }

  function again() {
    const serving = servingFor(desk.tickets, doctorId);
    if (serving) track(callAgain(ctx, serving), "Couldn't call again. Please tell reception.");
  }

  function resume() {
    resumeQueue(ctx, doctorId).catch(() => showToast("Couldn't resume the queue. Please tell reception."));
  }

  function undoLast() {
    const entry = undoSlot.take();
    if (!entry) return;
    // Reception (or a patient) changed one of these tickets since; undoing would overwrite that.
    if (isUndoStale(entry, desk.tickets)) {
      showToast("Couldn't undo, the queue changed since. Please tell reception if something's wrong.", "info");
      return;
    }
    undo(entry).catch(() => showToast("Couldn't undo that. Please tell reception."));
    // The undo shows locally right away, so a Next straight after it is meant.
    lastNextAt.current = 0;
  }

  return (
    <>
      <DoctorButton
        view={{
          clinicName: clinic.name,
          doctorName: doctor.name,
          room: doctor.room,
          prefix: doctor.prefix,
          waitingCount: view.doctor.waitingCount,
          serving: view.serving ? { label: view.serving.label, name: view.serving.name, inRoom: view.serving.inRoom } : null,
          nextUp: view.nextUp,
          later: view.rows.slice(1, 4).map((r) => r.label),
          pausedMessage: view.paused ? pauseMessage(view.paused.reason, view.paused.backAtLabel) : null,
          offline: !online,
          linked: online && lastAck != null && now - lastAck < LINK_FRESH_MS,
        }}
        onNext={next}
        onCallAgain={again}
        onResume={resume}
        insightsHref={`/insights?doctor=${encodeURIComponent(doctorId)}&from=doctor`}
      />
      {undoSlot.current && (
        <UndoToast message={undoSlot.current.entry.message} secondsLeft={undoSlot.current.secondsLeft} onUndo={undoLast} />
      )}
      {toast && (
        <ErrorToast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          raised={undoSlot.current != null}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

/** One call of a ticket: Call again keeps calledAt, every Next stamps a new one. */
function callId(t: { id: string; calledAt: number | null }): string {
  return `${t.id}@${t.calledAt}`;
}

/**
 * Tells reception this room's button is alive (the "Doctor's button linked"
 * chip): every 30 s, and again whenever the screen comes back on. Returns when
 * the server last acknowledged one.
 */
function useHeartbeat(ctx: DeskContext, doctorId: string): number | null {
  const [lastAck, setLastAck] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const beat = () => {
      doctorButtonHeartbeat(ctx, doctorId)
        .then(() => {
          if (active) setLastAck(Date.now());
        })
        .catch(() => {
          // Offline or refused: the chip shows "Connecting…" until the next beat lands.
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ctx, doctorId]);

  return lastAck;
}
