"use client";

/**
 * How it fits together
 *
 *   /reception (page.tsx) → ReceptionApp → ClinicGate → ReceptionDesk
 *
 * ClinicGate (auth → users/{uid} → clinic) redirects to /login or /setup and
 * hands over a live session. ReceptionDesk is the only reception component
 * that talks to Firebase; every layout and dialog below it is presentational.
 *
 * 1. Read     useDoctors, useStaff, useQueueDays and useDeskTickets for today's
 *             clinic-local date, taken from the 1 s clock so it flips right at
 *             midnight and re-subscribes to the new date: that is the whole
 *             "queue resets overnight" story.
 * 2. View     buildClinicHeader / buildDoctorQueueView turn snapshots into the
 *             view models in src/lib/view.ts, rebuilt every second (useNow) so
 *             timers like "6:12 in room" tick.
 * 3. Layout   useReceptionLayout picks Phone (<768px), Tablet (768–1279px) or
 *             Laptop (≥1280px). All three take the same ReceptionHandlers.
 * 4. Write    useReceptionHandlers maps each callback onto src/lib/queue/actions.ts
 *             with the doctor's live serving/waiting lists, offers the UndoEntry
 *             to useUndoSlot (UndoToast, Ctrl+Z), counts taps made offline for
 *             the OfflineBanner (useOfflineTracker) and turns refused writes into
 *             an ErrorToast. Writes are never awaited: offline they only settle
 *             after reconnecting, and the desk must keep moving meanwhile.
 *             Walk-ins issued offline go to useTokenClashFixer, which renumbers
 *             any that clash with a QR join once the desk is back online (even
 *             while locked) and lists them in a ClashNotice every tab shows
 *             until someone dismisses it.
 * 5. Dialogs  Handlers open AddWalkInModal and PauseQueueModal; their submit
 *             callbacks come back through useReceptionHandlers.
 * 6. Lock     useReceptionLock keeps the PIN lock per device in localStorage and
 *             arms the idle timer. While locked only PinLock renders (plus a
 *             toast marked overLock, which names no patient), so patient names
 *             leave the screen and the DOM. The staff member who unlocks
 *             is stamped on every write through DeskContext.staffId.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ClinicGate, type ClinicSession } from "@/components/auth/ClinicGate";
import { ClashNotice } from "@/components/reception/ClashNotice";
import { ErrorToast, type ToastTone } from "@/components/reception/ErrorToast";
import { UndoToast } from "@/components/reception/UndoToast";
import { LaptopReception } from "@/components/reception/laptop/LaptopReception";
import { PinLock } from "@/components/reception/lock/PinLock";
import { AddWalkInModal } from "@/components/reception/modals/AddWalkInModal";
import { PauseQueueModal } from "@/components/reception/modals/PauseQueueModal";
import { PhoneReception } from "@/components/reception/phone/PhoneReception";
import { ReceptionNotice } from "@/components/reception/ReceptionNotice";
import { TabletReception } from "@/components/reception/tablet/TabletReception";
import { useOfflineTracker } from "@/components/reception/useOfflineTracker";
import { useReceptionHandlers } from "@/components/reception/useReceptionHandlers";
import { useReceptionLayout } from "@/components/reception/useReceptionLayout";
import { useTokenClashFixer } from "@/components/reception/useTokenClashFixer";
import { useReceptionLock } from "@/components/reception/useReceptionLock";
import { isString, useStoredState } from "@/components/reception/useStoredState";
import { useUndoSlot } from "@/components/reception/useUndoSlot";
import { getFirebaseAuth } from "@/lib/firebase";
import { useClinic, useDeskTickets, useDoctors, useNow, useQueueDays, useStaff } from "@/lib/hooks";
import { initialsOf } from "@/lib/pin";
import type { DeskContext } from "@/lib/queue/actions";
import { waitingFor } from "@/lib/queue/logic";
import { dateKey } from "@/lib/time";
import { buildClinicHeader, buildDoctorQueueView } from "@/lib/view";

/** Error and notice toasts stay this long unless dismissed. */
const TOAST_MS = 8000;

export function ReceptionApp() {
  return <ClinicGate>{(session) => <ReceptionDesk key={session.clinicId} session={session} />}</ClinicGate>;
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  /**
   * Stays up over the PIN lock. Only for messages about the lock screen itself
   * that name no patient, e.g. a failed sign-out from "Forgot PIN".
   */
  overLock: boolean;
}

function ReceptionDesk({ session }: { session: ClinicSession }) {
  const { clinicId } = session;
  // Live, so Settings changes (name, lock delay, consult default) reach the desk
  // without a reload; Firestore shares the listener if ClinicGate holds one too.
  const clinic = useClinic(clinicId).data ?? session.clinic;
  const { timezone } = clinic;
  const router = useRouter();

  const now = useNow(1000);
  const today = dateKey(now, timezone);
  const layout = useReceptionLayout();

  const doctorsSub = useDoctors(clinicId);
  const staffSub = useStaff(clinicId);
  const queueDays = useQueueDays(clinicId, today);
  const desk = useDeskTickets(clinicId, today);

  const doctors = useMemo(() => doctorsSub.data.filter((d) => d.active), [doctorsSub.data]);
  const lock = useReceptionLock(clinicId, staffSub.data, clinic.lockAfterMin);
  const undoSlot = useUndoSlot();
  const { offline, recordAction } = useOfflineTracker(desk.fromCache, now);

  const [selectedId, updateSelectedId] = useStoredState(`baari:reception:doctor:${clinicId}`, "", isString);
  const [walkInFor, setWalkInFor] = useState<string | null>(null);
  const [pauseFor, setPauseFor] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Hold the loading screen only for the first load: the midnight re-subscribe
  // must not blank a working desk.
  const loaded = !doctorsSub.loading && !staffSub.loading && !queueDays.loading && !desk.loading;
  const [hasLoaded, setHasLoaded] = useState(loaded);
  if (loaded && !hasLoaded) setHasLoaded(true);

  const header = buildClinicHeader(clinic, desk.tickets, now);
  const queues = doctors.map((d) => buildDoctorQueueView(d, desk.tickets, queueDays.data[d.id], now, timezone));
  const tabs = queues.map((q) => q.doctor);
  const selected = queues.find((q) => q.doctor.id === selectedId) ?? queues[0] ?? null;

  const toastSeq = useRef(0);
  // A write refused after the desk locked must not greet whoever unlocks next,
  // and must not push out a toast meant for the lock screen.
  const lockedRef = useRef(lock.locked);
  lockedRef.current = lock.locked;
  const showToast = useCallback((message: string, tone: ToastTone, overLock = false) => {
    if (lockedRef.current && !overLock) return;
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, tone, overLock });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((t) => (t === toast ? null : t)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Locking (idle timer, the menu, or another tab) hands the desk to the next
  // person: close half-filled dialogs and withdraw the previous person's undo
  // and toast, so neither comes back for whoever unlocks.
  const { dismiss: dismissUndo } = undoSlot;
  useEffect(() => {
    if (!lock.locked) return;
    setWalkInFor(null);
    setPauseFor(null);
    setToast((t) => (t?.overLock ? t : null));
    dismissUndo();
  }, [lock.locked, dismissUndo]);

  const ctx: DeskContext = { clinicId, date: today, staffId: lock.staffId };
  // Repairs as soon as the server is back, locked or not, so the doctor's button
  // can't call a duplicate label; only the notice naming the patients waits for
  // an unlocked desk.
  const clashFixer = useTokenClashFixer(ctx, doctors, desk.tickets, !desk.fromCache);
  const actions = useReceptionHandlers({
    clinic,
    ctx,
    doctors,
    tickets: desk.tickets,
    queueDays: queueDays.data,
    offline: offline !== null || desk.fromCache,
    rememberOfflineToken: clashFixer.remember,
    undoSlot,
    recordAction,
    ui: {
      selectDoctor: (doctorId) => updateSelectedId(() => doctorId),
      openWalkIn: (doctorId) => setWalkInFor(doctorId ?? selected?.doctor.id ?? ""),
      openPause: setPauseFor,
      lock: () => (lock.enabled ? lock.lock() : showToast("Add staff PINs in Settings to lock the desk.", "info")),
      openSettings: () => router.push("/settings"),
      openInsights: () => router.push("/insights"),
      toast: showToast,
    },
  });
  const { handlers } = actions;

  // Ctrl/Cmd+Z undoes on every layout. The laptop binds it too; the slot hands
  // an entry out only once, so whichever listener runs first wins.
  const dialogOpen = walkInFor !== null || pauseFor !== null;
  const undoKeys = !lock.locked && !dialogOpen;
  useEffect(() => {
    if (!undoKeys) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.altKey || e.shiftKey || !(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== "z" || isTextEntry(e.target) || anyModalOpen()) return;
      e.preventDefault();
      handlers.onUndo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoKeys, handlers]);

  // Forgot PIN: sign the whole device out. The lock stays set until someone
  // signs back in with the clinic password (LoginScreen clears it then), so
  // other open tabs never flash the unlocked desk in between.
  const forgotPin = useCallback(() => {
    setSigningOut(true);
    signOut(getFirebaseAuth()).then(
      () => router.replace("/login"),
      (err: unknown) => {
        console.error("Sign out failed", err);
        setSigningOut(false);
        // Shown on the PIN lock it came from.
        showToast("Couldn't sign out. Please try again.", "error", true);
      },
    );
  }, [router, showToast]);

  const loadError = doctorsSub.error ?? desk.error ?? queueDays.error;

  let screen: ReactNode;
  if (signingOut) {
    screen = <ReceptionNotice busy title="Signing out…" />;
  } else if (loadError) {
    screen = (
      <ReceptionNotice
        title="Couldn't open the queue"
        body="This device may not be allowed to run the desk, or the connection failed before anything was saved here. Try again, or sign in again from Settings."
        action={{ label: "Try again", onClick: () => window.location.reload() }}
      />
    );
  } else if (!hasLoaded || layout === null) {
    screen = <ReceptionNotice busy title="Opening today's queue…" />;
  } else if (lock.locked) {
    screen = (
      <PinLock
        clinicName={clinic.name}
        dateLabel={header.dateLabel}
        lockAfterMin={clinic.lockAfterMin}
        staff={lock.staff.map((s) => ({ id: s.id, name: s.name, initials: s.initials || initialsOf(s.name) }))}
        defaultStaffId={lock.staffId ?? undefined}
        onVerify={lock.verify}
        onUnlocked={lock.unlock}
        onForgot={forgotPin}
      />
    );
  } else if (!selected) {
    screen = (
      <ReceptionNotice
        title="No doctors yet"
        body="Add a doctor with their token letter and room in Settings, and today's queue opens here."
        action={{ label: "Open settings", onClick: handlers.onOpenSettings }}
      />
    );
  } else {
    const pauseDoctor = doctors.find((d) => d.id === pauseFor) ?? null;
    screen = (
      <>
        {layout === "laptop" ? (
          <LaptopReception header={header} queues={queues} offline={offline} handlers={handlers} />
        ) : layout === "tablet" ? (
          <TabletReception
            header={header}
            doctors={tabs}
            selectedDoctorId={selected.doctor.id}
            queue={selected}
            offline={offline}
            handlers={handlers}
          />
        ) : (
          <PhoneReception
            header={header}
            doctors={tabs}
            selectedDoctorId={selected.doctor.id}
            queue={selected}
            offline={offline}
            handlers={handlers}
          />
        )}

        <AddWalkInModal
          open={walkInFor !== null}
          doctors={tabs}
          defaultDoctorId={walkInFor || selected.doctor.id}
          nextTokenLabelFor={(doctorId) => queues.find((q) => q.doctor.id === doctorId)?.nextTokenLabel ?? ""}
          onClose={() => setWalkInFor(null)}
          onSubmit={actions.submitWalkIn}
        />
        <PauseQueueModal
          open={pauseDoctor !== null}
          doctorName={pauseDoctor?.name ?? ""}
          waitingWithPhone={pauseDoctor ? waitingFor(desk.tickets, pauseDoctor.id).filter((t) => t.phone).length : 0}
          now={now}
          timezone={timezone}
          onClose={() => setPauseFor(null)}
          onConfirm={(input) => {
            if (pauseDoctor) actions.confirmPause(pauseDoctor.id, input);
            setPauseFor(null);
          }}
        />

        {clashFixer.notices.length > 0 && (
          <ClashNotice notices={clashFixer.notices} onDismiss={() => clashFixer.dismiss(clashFixer.notices)} />
        )}

        {undoSlot.current && (
          <UndoToast
            message={undoSlot.current.entry.message}
            secondsLeft={undoSlot.current.secondsLeft}
            onUndo={handlers.onUndo}
          />
        )}
      </>
    );
  }

  // Toasts sit at the bottom centre; on phones they must clear the footer's
  // Next patient button, so the layout sets their offset.
  const toastOffset = { "--toast-bottom": layout === "phone" ? "120px" : "28px" } as CSSProperties;

  return (
    <div className="contents" style={toastOffset}>
      {screen}
      {toast && (!lock.locked || toast.overLock) && (
        <ErrorToast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          raised={undoSlot.current !== null && !lock.locked}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  return (
    target instanceof HTMLInputElement &&
    !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file"].includes(target.type)
  );
}

function anyModalOpen(): boolean {
  return document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]') !== null;
}
