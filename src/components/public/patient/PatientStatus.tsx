"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon, CheckIcon, ClockIcon, CloseIcon, PauseIcon } from "@/components/icons";
import { ChoiceChips } from "@/components/public/ChoiceChips";
import { cx, eyebrowClass, keepTimesTogether, primaryButtonClass, secondaryButtonClass } from "@/components/public/ui";
import type { PatientStatusView } from "@/components/public/views";
import { ClinicIdentity } from "@/components/reception/ClinicIdentity";
import { DISTANCE_LABEL } from "@/lib/queue/logic";
import type { Distance } from "@/lib/types";
import styles from "./patient.module.css";

const DISTANCES: Distance[] = ["here", "under_15", "15_30", "over_30"];

/** "आपसे पहले 5 लोग" (5 people before you), same wording as the printed slip. */
export function aheadLineHindi(ahead: number): string {
  if (ahead === 0) return "आप अगले हैं";
  if (ahead === 1) return "आपसे पहले 1 व्यक्ति";
  return `आपसे पहले ${ahead} लोग`;
}

/** "Room 2" → "कमरा 2"; other room names stay as written. */
function roomHindi(room: string): string {
  const m = /^room\s+(.+)$/i.exec(room.trim());
  return m ? `कमरा ${m[1]}` : room;
}

function aheadLine(ahead: number): string {
  if (ahead === 0) return "You're next";
  return ahead === 1 ? "1 person ahead of you" : `${ahead} people ahead of you`;
}

export interface PatientStatusProps {
  view: PatientStatusView;
  /**
   * Keys the "It's your turn" card: changes only on a call this phone hasn't
   * shown yet, so an undo at the desk doesn't replay the pulse and alert.
   * Defaults to `view.callKey`.
   */
  turnKey?: number | null;
  /** Where "Join again" goes. */
  joinHref: string;
  onChangeDistance(distance: Distance): Promise<void>;
  onLeave(): Promise<void>;
}

/**
 * The patient's phone after joining: their token, people ahead and the ETA,
 * who is with the doctor, pause notices, "how far are you" and leaving.
 * Turns into a big "It's your turn" card when they're called.
 */
export function PatientStatus({ view, turnKey = view.callKey, joinHref, onChangeDistance, onLeave }: PatientStatusProps) {
  const [distanceNote, setDistanceNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  async function changeDistance(distance: Distance) {
    setDistanceNote({ tone: "ok", text: "Saving…" });
    try {
      await onChangeDistance(distance);
      setDistanceNote({ tone: "ok", text: "Saved. The desk can see this now." });
    } catch {
      setDistanceNote({ tone: "error", text: "Couldn't save that. Check your internet and try again." });
    }
  }

  async function leave() {
    setLeaveOpen(false);
    setLeaveError(null);
    try {
      await onLeave();
    } catch {
      setLeaveError("Couldn't leave the queue. Please tell the reception desk.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="border-b border-line bg-surface px-4 py-[14px]">
        <div className="mx-auto w-full max-w-[480px]">
          <ClinicIdentity clinicName={view.clinicName} subtitle={`${view.doctorName} · ${view.room}`} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-3 pb-8">
        {view.phase === "waiting" && (
          <>
            <TokenCard view={view} />
            {view.pausedMessage && (
              <Notice tone="amber" icon={<PauseIcon size={20} />}>
                {keepTimesTogether(view.pausedMessage)}
              </Notice>
            )}
            {view.noReply && (
              <Notice tone="warn" icon={<BellIcon size={20} />}>
                We called {view.label} but you weren&apos;t there, so you&apos;ve been moved back 2 places. Please stay
                close and watch for your number.
              </Notice>
            )}
            <NowServing view={view} />
            {view.canEdit ? (
              <section aria-label="How far are you" className="rounded-[18px] border border-line bg-surface p-4">
                <ChoiceChips
                  name="distance"
                  legend="How far are you?"
                  description="Stepped out? Your place stays the same."
                  options={DISTANCES.map((d) => ({ value: d, label: DISTANCE_LABEL[d] }))}
                  value={view.distance}
                  onChange={(d) => void changeDistance(d)}
                />
                <p
                  aria-live="polite"
                  className={cx(
                    "mt-2 text-[13px] font-medium empty:mt-0",
                    distanceNote?.tone === "error" ? "text-danger" : "text-teal-dark",
                  )}
                >
                  {distanceNote?.text}
                </p>
              </section>
            ) : (
              <p className="rounded-[18px] border border-line bg-surface p-4 text-[14px] leading-snug text-muted">
                You&apos;re watching this token. Only the phone that joined can update how far away the patient is
                or leave the queue.
              </p>
            )}
            <p className="px-2 text-center text-[13px] leading-snug text-muted">
              This page updates by itself. Keep it open, or come back to the same link.
            </p>
            {leaveError && (
              <p role="alert" className="text-center text-[14px] font-medium text-danger">
                {leaveError}
              </p>
            )}
            {view.canEdit && (
              <button
                type="button"
                onClick={() => setLeaveOpen(true)}
                className="mt-1 h-12 rounded-[14px] border border-danger-line bg-surface text-[15px] font-semibold text-danger hover:bg-danger-tint"
              >
                Leave the queue
              </button>
            )}
            <LeaveDialog
              open={leaveOpen}
              label={view.label}
              onCancel={() => setLeaveOpen(false)}
              onConfirm={() => void leave()}
            />
          </>
        )}

        {view.phase === "serving" && <YourTurn key={turnKey ?? "turn"} view={view} />}

        {view.phase !== "waiting" && view.phase !== "serving" && <Finished view={view} joinHref={joinHref} />}
      </main>
    </div>
  );
}

function TokenCard({ view }: { view: PatientStatusView }) {
  return (
    <section
      aria-labelledby="your-token"
      className="flex flex-col items-center rounded-[24px] border border-line bg-surface px-5 pt-4 pb-5 text-center"
    >
      <h1 id="your-token" className={eyebrowClass}>
        Your token
      </h1>
      <p className="mt-1 font-display text-[96px] leading-[0.95] font-extrabold text-teal">{view.label}</p>
      {view.name && <p className="mt-1 text-[16px] font-semibold">{view.name}</p>}
      <div aria-live="polite" aria-atomic="true" className="mt-3 w-full border-t border-divider pt-3">
        {view.ahead == null ? (
          <p className="text-[15px] text-muted">Checking your place in the queue…</p>
        ) : (
          <>
            <p className="font-display text-[28px] leading-tight font-bold">{aheadLine(view.ahead)}</p>
            {/* Skipped when it would only repeat the headline ("You're next"); a break or late start still shows. */}
            {view.etaText && view.etaText !== aheadLine(view.ahead) && (
              <p className="mt-1 flex items-center justify-center gap-[6px] text-[15px] text-muted">
                <ClockIcon size={16} />
                {view.etaText}
              </p>
            )}
            <p lang="hi" className="mt-2 text-[17px] font-medium">
              {aheadLineHindi(view.ahead)}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function NowServing({ view }: { view: PatientStatusView }) {
  return (
    <section
      aria-label="With the doctor now"
      className="flex items-center gap-[14px] rounded-[18px] border border-line bg-surface px-4 py-[14px]"
    >
      <span
        className={cx(
          "font-display text-[44px] leading-none font-extrabold",
          view.nowServing ? "text-teal" : "text-line-strong",
        )}
      >
        {view.nowServing ?? "--"}
      </span>
      {/* The room rides on the small line so the doctor's name gets the full width on narrow phones. */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[12px] text-muted">With doctor now{view.nowServing && ` · ${view.room}`}</span>
        <span className="leading-snug font-semibold break-words">
          {view.nowServing ? view.doctorName : "Nobody called yet"}
        </span>
      </span>
    </section>
  );
}

function Notice({ tone, icon, children }: { tone: "amber" | "warn"; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cx(
        "flex gap-3 rounded-[18px] border px-4 py-[14px] text-[15px] leading-snug font-semibold",
        tone === "amber" ? "border-amber-line bg-amber-tint text-amber" : "border-amber-line bg-warn-tint text-warn",
      )}
    >
      <span className="mt-[1px] flex-none">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function YourTurn({ view }: { view: PatientStatusView }) {
  return (
    <section
      role="alert"
      className={cx(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-[24px] bg-teal px-5 py-10 text-center text-white shadow-[0_6px_0_var(--color-teal-dark)]",
        styles.turnPulse,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-white/15">
        <BellIcon size={34} />
      </span>
      <h1 className="font-display leading-tight font-extrabold">
        <span className="block text-[36px]">It&apos;s your turn,</span>
        <span className="block text-[22px] font-bold">please go to {view.room}</span>
      </h1>
      <p className="my-2 font-display text-[120px] leading-[0.95] font-extrabold">{view.label}</p>
      <p lang="hi" className="text-[18px] font-medium opacity-95">
        आपकी बारी है, कृपया {roomHindi(view.room)} में जाएँ
      </p>
      <p className="mt-2 text-[15px] opacity-85">{view.doctorName} is ready for you.</p>
    </section>
  );
}

function Finished({ view, joinHref }: { view: PatientStatusView; joinHref: string }) {
  const copy: Record<Exclude<PatientStatusView["phase"], "waiting" | "serving">, { title: string; body: string }> = {
    done: {
      title: "Your visit is done",
      body: `Thank you for visiting ${view.clinicName}. Get well soon.`,
    },
    no_show: {
      title: "We missed you",
      body: `${view.label} was called but you weren't there. Please speak to the reception desk.`,
    },
    removed: view.leftByPatient
      ? { title: "You left the queue", body: `Token ${view.label} is no longer in the queue.` }
      : {
          title: "Your token was cancelled",
          body: `${view.label} was taken off the queue at the desk. If that's a mistake, please speak to reception.`,
        },
    expired: {
      title: `This token was for ${view.dateLabel}`,
      body: "Tokens start fresh every day. Join today's queue to get a new one.",
    },
  };
  const phase = view.phase === "waiting" || view.phase === "serving" ? "done" : view.phase;
  const { title, body } = copy[phase];
  const rejoin = phase !== "done";

  return (
    <section className="flex flex-col items-center gap-3 rounded-[24px] border border-line bg-surface px-6 pt-8 pb-7 text-center">
      <span
        className={cx(
          "flex size-14 items-center justify-center rounded-full",
          phase === "done" ? "bg-teal-tint text-teal" : "bg-subtle text-muted",
        )}
      >
        {FINISHED_ICON[phase]}
      </span>
      <p className={cx("font-display text-[56px] leading-none font-extrabold", phase === "done" ? "text-teal" : "text-line-strong")}>
        {view.label}
      </p>
      <h1 className="font-display text-[26px] leading-tight font-bold">{title}</h1>
      <p className="text-[15px] leading-relaxed text-muted">{body}</p>
      <Link
        href={joinHref}
        className={cx(
          "mt-3 h-[52px] w-full text-[16px] font-semibold no-underline",
          rejoin
            ? `${primaryButtonClass} gap-2 rounded-[14px] px-4 text-white hover:text-white`
            : `${secondaryButtonClass} text-ink hover:text-ink`,
        )}
      >
        {rejoin ? "Join the queue again" : "Back to the clinic page"}
      </Link>
    </section>
  );
}

const FINISHED_ICON: Record<Exclude<PatientStatusView["phase"], "waiting" | "serving">, React.ReactNode> = {
  done: <CheckIcon size={28} />,
  no_show: <BellIcon size={26} />,
  removed: <CloseIcon size={26} />,
  expired: <ClockIcon size={26} />,
};

interface LeaveDialogProps {
  open: boolean;
  label: string;
  onCancel(): void;
  onConfirm(): void;
}

/** Confirmation before leaving, on the native <dialog> (focus trap, Esc, inert page for free). */
function LeaveDialog({ open, label, onCancel, onConfirm }: LeaveDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="leave-title"
      aria-describedby="leave-body"
      onClose={onCancel}
      onClick={(e) => {
        // A tap on the backdrop (the dialog box itself, outside the panel) cancels.
        if (e.target === e.currentTarget) onCancel();
      }}
      className="m-auto w-[min(100%-32px,400px)] rounded-[24px] bg-surface p-0 text-ink shadow-[0_24px_60px_rgb(20_33_33/0.35)] backdrop:bg-scrim/90"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 id="leave-title" className="font-display text-[24px] leading-tight font-bold">
          Leave the queue?
        </h2>
        <p id="leave-body" className="text-[15px] leading-relaxed text-muted">
          Token {label} will be cancelled. If you come back later you&apos;ll get a new token at the end of the queue.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button type="button" autoFocus onClick={onCancel} className={cx(secondaryButtonClass, "h-[52px] text-[16px]")}>
            Stay in queue
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[52px] rounded-[14px] bg-danger text-[16px] font-semibold text-white hover:opacity-90"
          >
            Leave
          </button>
        </div>
      </div>
    </dialog>
  );
}
