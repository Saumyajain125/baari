"use client";

import { useId } from "react";
import { PlayIcon, QrIcon, TvIcon } from "@/components/icons";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import type { DoctorQueueView, QueueRowView } from "@/lib/view";
import { Kbd } from "./Kbd";
import { QueueTable, type QueueEmptyState, type RowActions } from "./QueueTable";

export interface DoctorColumnProps {
  queue: DoctorQueueView;
  /** The rows left after the search filter. */
  rows: QueueRowView[];
  query: string;
  offline: boolean;
  /** Keyboard key for this doctor's Next button, or null if it has none. */
  shortcutKey: string | null;
  /** Briefly true after the keyboard shortcut fired, to show the button press. */
  flashed: boolean;
  handlers: ReceptionHandlers;
  onEditName: RowActions["onEditName"];
}

/** Whether "Next patient" can do anything for this doctor right now. */
export function canCallNext(queue: DoctorQueueView): boolean {
  return !isPaused(queue) && (queue.nextUp != null || queue.serving != null);
}

function isPaused(queue: DoctorQueueView): boolean {
  return queue.paused != null || queue.doctor.paused;
}

/** One doctor's half of the laptop screen: heading, now serving + Next, and the queue table. */
export function DoctorColumn({
  queue,
  rows,
  query,
  offline,
  shortcutKey,
  flashed,
  handlers,
  onEditName,
}: DoctorColumnProps) {
  const { doctor } = queue;
  const headingId = useId();
  const paused = isPaused(queue);

  const actions: RowActions = {
    onPriority: handlers.onPriority,
    onBack2: handlers.onBack2,
    onSkip: handlers.onSkip,
    onNoShow: handlers.onNoShow,
    onRemove: handlers.onRemove,
    onEditName,
  };

  return (
    <section aria-labelledby={headingId} className="flex min-h-0 min-w-0 flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-teal font-display text-[17px] font-extrabold text-white"
          >
            {doctor.prefix}
          </span>
          <h2 id={headingId} className="m-0 truncate text-[18px] font-bold">
            {doctor.name}
          </h2>
          <span className="flex-none text-[13px] text-muted">
            {doctor.room} · {doctor.waitingCount} waiting
          </span>
          {paused && (
            <span className="truncate rounded-full bg-amber-tint px-2.5 py-1 text-[12px] font-semibold text-amber">
              {pausedLabel(queue)}
            </span>
          )}
          {!paused && doctor.startsAtLabel && (
            <span className="flex-none rounded-full bg-subtle px-2.5 py-1 text-[12px] text-muted">
              {doctor.startsAtLabel}
            </span>
          )}
        </div>
        {paused ? (
          <button
            type="button"
            aria-label={`Resume queue for ${doctor.name}`}
            onClick={() => handlers.onResume(doctor.id)}
            className="flex h-10 flex-none items-center gap-1.5 rounded-[10px] bg-teal px-3 text-[13px] font-semibold text-white hover:bg-teal-dark"
          >
            <PlayIcon size={14} />
            Resume
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Pause queue for ${doctor.name}`}
            onClick={() => handlers.onPause(doctor.id)}
            className="h-10 flex-none rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-hover"
          >
            Pause
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <NowServing queue={queue} />
        <NextButton
          queue={queue}
          offline={offline}
          shortcutKey={shortcutKey}
          flashed={flashed}
          onNext={() => handlers.onNext(doctor.id)}
        />
      </div>

      <QueueTable doctorName={doctor.name} rows={rows} empty={emptyState(queue, query, handlers)} actions={actions} />
    </section>
  );
}

function NowServing({ queue }: { queue: DoctorQueueView }) {
  const { serving, doctor } = queue;
  const [title, detail] = serving
    ? [serving.name, null]
    : queue.lastToken === 0
      ? ["Nobody yet", `First token today will be ${queue.nextTokenLabel}.`]
      : ["Nobody in the room", queue.nextUp ? `Press Next to call ${queue.nextUp.label}.` : "Nobody waiting."];

  return (
    <div
      role="group"
      aria-label="With doctor now"
      className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[16px] border border-line bg-surface px-4 py-3.5"
    >
      <span
        className={`flex-none font-display text-[44px] font-extrabold leading-none ${serving ? "text-teal" : "text-line-strong"}`}
      >
        {serving ? serving.label : `${doctor.prefix}-00`}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-semibold">{title}</span>
        {serving?.pending ? (
          <span className="truncate text-[13px] font-semibold text-warn">Saved offline, not synced</span>
        ) : (
          <span className="truncate text-[13px] text-muted">{serving ? `${serving.inRoom} in room` : detail}</span>
        )}
      </div>
    </div>
  );
}

function NextButton({
  queue,
  offline,
  shortcutKey,
  flashed,
  onNext,
}: {
  queue: DoctorQueueView;
  offline: boolean;
  shortcutKey: string | null;
  flashed: boolean;
  onNext(): void;
}) {
  const hintId = useId();
  const paused = isPaused(queue);
  const ready = canCallNext(queue);
  const { nextUp, serving } = queue;

  const title = paused ? "Queue paused" : "Next patient";
  let hint: string;
  if (paused) hint = "Resume to call the next patient";
  else if (!ready) hint = "Turns on when someone joins";
  else if (nextUp) {
    // Offline the TV and phones won't update, so the desk has to call the name out.
    hint = offline
      ? `Call out loud: ${nextUp.label} ${nextUp.name}`
      : `Calls ${nextUp.label} ${nextUp.name}${nextUp.priority ? " (priority)" : ""}`;
  } else hint = `Saves ${serving?.label ?? ""} as done`;

  const look = ready
    ? `bg-teal text-white shadow-[0_4px_0_var(--color-teal-dark)] transition-[translate,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-teal-dark)] ${
        flashed ? "translate-y-[3px] shadow-[0_1px_0_var(--color-teal-dark)]" : ""
      }`
    : "border-2 border-dashed border-line-strong bg-surface text-faint";

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={onNext}
      aria-label={`${title} for ${queue.doctor.name}`}
      aria-describedby={hintId}
      aria-keyshortcuts={shortcutKey ?? undefined}
      className={`flex w-[240px] flex-none flex-col items-center justify-center gap-1 rounded-[16px] px-3 ${look}`}
    >
      <span className="flex items-center gap-2 font-display text-[24px] font-extrabold">
        {title}
        {shortcutKey && <Kbd muted={!ready}>{shortcutKey}</Kbd>}
      </span>
      {/* 15px line box, as the artboard's line: keeps the title and [A] chip on its pixel rows. */}
      <span id={hintId} className="max-w-full truncate text-[13px] leading-[15px] opacity-90">
        {hint}
      </span>
    </button>
  );
}

function pausedLabel(queue: DoctorQueueView): string {
  const p = queue.paused;
  if (!p) return "Paused";
  return `Paused · ${p.reason}${p.backAtLabel ? ` · back ${p.backAtLabel}` : ""}`;
}

function emptyState(queue: DoctorQueueView, query: string, handlers: ReceptionHandlers): QueueEmptyState {
  if (queue.rows.length > 0 && query.trim()) {
    return { title: `No match for “${query.trim()}”`, body: "Try a token like A-26, part of a name, or phone digits." };
  }
  // Before anyone joins, offer what the tablet's start-of-day screen does (artboard 03).
  const setUp = [
    { label: "Print QR poster", icon: <QrIcon size={18} />, onClick: handlers.onPrintPoster },
    { label: "Open TV display", icon: <TvIcon size={18} />, onClick: handlers.onOpenTv },
  ];
  if (queue.doctor.startsAtLabel) {
    return {
      title: queue.doctor.startsAtLabel,
      body: "Patients can already join. They show up here as they scan the QR poster or you add them.",
      actions: queue.lastToken === 0 ? setUp : undefined,
    };
  }
  if (queue.lastToken === 0) {
    return {
      title: "Fresh queue for today",
      body: "Patients who scan the QR poster show up here on their own. Yesterday's queue was cleared at midnight.",
      actions: setUp,
    };
  }
  return {
    title: "Nobody waiting",
    body: "New walk-ins and patients who scan the QR poster show up here.",
  };
}
