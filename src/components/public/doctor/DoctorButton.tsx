"use client";

import { ArrowRightIcon, BellIcon, ClockIcon, PauseIcon, PlayIcon, WifiOffIcon } from "@/components/icons";
import { ClinicIdentity } from "@/components/reception/ClinicIdentity";
import { cx, eyebrowClass } from "@/components/public/ui";

export interface DoctorButtonView {
  clinicName: string;
  doctorName: string;
  room: string;
  prefix: string;
  waitingCount: number;
  serving: { label: string; name: string; inRoom: string } | null;
  nextUp: { label: string; name: string; priority: boolean } | null;
  /** Up to three tokens after the next one, for a glance at what's coming. */
  later: string[];
  /** pauseMessage(...) while the queue is paused. */
  pausedMessage: string | null;
  offline: boolean;
  /** The last heartbeat reached the server, so reception shows "Doctor's button linked". */
  linked: boolean;
}

export interface DoctorButtonProps {
  view: DoctorButtonView;
  onNext(): void;
  onCallAgain(): void;
  onResume(): void;
}

/**
 * The doctor's room screen: who is in the room, how many are waiting, and one
 * huge "Next patient" button, the same action as the desk's (artboard 01).
 */
export function DoctorButton({ view, onNext, onCallAgain, onResume }: DoctorButtonProps) {
  const { serving, nextUp } = view;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3">
        <ClinicIdentity clinicName={view.clinicName} subtitle={`${view.doctorName} · ${view.room}`} />
        <span className="rounded-full bg-teal-tint px-4 py-[6px] text-[15px] font-semibold whitespace-nowrap text-teal-dark">
          {view.waitingCount} waiting
        </span>
      </header>

      {view.offline && (
        <p
          role="status"
          className="flex items-center gap-3 border-b border-amber-line bg-amber-tint px-5 py-3 text-[14px] font-semibold text-amber"
        >
          <WifiOffIcon size={20} className="flex-none" />
          Internet is down. Next still works; reception and the TV catch up when it&apos;s back.
        </p>
      )}

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 p-4 sm:p-5 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="with-you" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h1 id="with-you" className={eyebrowClass}>
                With you now
              </h1>
              {serving && (
                <span className="flex items-center gap-[6px] text-[13px] font-semibold whitespace-nowrap text-teal-dark">
                  <ClockIcon size={16} />
                  {serving.inRoom} in room
                </span>
              )}
            </div>
            {serving ? (
              <div className="flex flex-col gap-1">
                <span className="font-display text-[88px] leading-[0.95] font-extrabold text-teal">{serving.label}</span>
                <span className="truncate text-[20px] font-semibold">{serving.name}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span aria-hidden="true" className="font-display text-[88px] leading-[0.95] font-extrabold text-line-strong">
                  {view.prefix}-00
                </span>
                <span className="text-[15px] text-muted">Nobody called in yet.</span>
              </div>
            )}
          </section>

          <section aria-labelledby="coming-up" className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
            <h2 id="coming-up" className={eyebrowClass}>
              Up next · {view.waitingCount}
            </h2>
            {nextUp ? (
              <>
                <p className="flex items-baseline gap-3">
                  <span
                    className={cx(
                      "font-display text-[32px] leading-none font-extrabold",
                      nextUp.priority ? "text-danger" : "text-ink",
                    )}
                  >
                    {nextUp.label}
                  </span>
                  <span className="min-w-0 truncate text-[17px] font-semibold">{nextUp.name}</span>
                  {nextUp.priority && (
                    <span className="rounded-[6px] bg-danger px-[6px] py-[2px] text-[11px] font-bold tracking-[0.04em] text-white">
                      PRIORITY
                    </span>
                  )}
                </p>
                {view.later.length > 0 && (
                  <p className="text-[14px] text-muted">
                    Then {view.later.join(", ")}
                    {view.waitingCount > view.later.length + 1 && " …"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[15px] text-muted">Nobody waiting.</p>
            )}
          </section>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <NextButton view={view} onNext={onNext} onResume={onResume} />
          <div className="flex gap-[10px]">
            <button
              type="button"
              onClick={onCallAgain}
              disabled={!serving || view.pausedMessage != null}
              className="flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-line-strong bg-surface text-[16px] font-semibold text-ink hover:bg-hover disabled:text-faint disabled:hover:bg-surface"
            >
              <BellIcon size={20} />
              Call again
            </button>
            <p
              className={cx(
                "flex h-[56px] flex-1 items-center justify-center gap-2 rounded-[14px] px-2 text-center text-[13px] font-semibold",
                view.linked ? "bg-teal-tint text-teal-dark" : "bg-subtle text-muted",
              )}
            >
              <span aria-hidden="true" className={cx("size-2 flex-none rounded-full", view.linked ? "bg-teal" : "bg-dash")} />
              {view.linked ? "Linked to reception" : "Connecting to reception…"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function NextButton({ view, onNext, onResume }: Pick<DoctorButtonProps, "view" | "onNext" | "onResume">) {
  const { serving, nextUp } = view;
  const shell = "flex min-h-[260px] flex-1 flex-col items-center justify-center gap-3 rounded-[24px] px-6 text-center";

  if (view.pausedMessage) {
    return (
      <div className={cx(shell, "border-2 border-dashed border-amber-line bg-amber-tint text-amber")}>
        <PauseIcon size={40} />
        <p className="font-display text-[40px] leading-none font-extrabold">Queue paused</p>
        <p role="status" className="max-w-[32ch] text-[16px] leading-snug font-semibold">
          {view.pausedMessage}
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-2 flex h-[52px] items-center gap-2 rounded-[14px] bg-teal px-6 text-[16px] font-semibold text-white"
        >
          <PlayIcon size={18} />
          Resume queue
        </button>
      </div>
    );
  }

  if (!serving && !nextUp) {
    return (
      <button type="button" disabled className={cx(shell, "border-2 border-dashed border-line-strong bg-surface text-faint")}>
        <span className="font-display text-[44px] leading-none font-extrabold">Next patient</span>
        <span className="text-[16px]">Turns on when someone joins</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onNext}
      className={cx(
        shell,
        "bg-teal text-white shadow-[0_6px_0_var(--color-teal-dark)] transition-[translate,box-shadow] duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_var(--color-teal-dark)]",
      )}
    >
      <span className="flex items-center gap-3 font-display text-[52px] leading-none font-extrabold">
        Next patient
        <ArrowRightIcon size={44} />
      </span>
      <span className="text-[18px] opacity-[0.92]">
        {nextUp ? (
          <>
            Calls{" "}
            <strong>
              {nextUp.label} {nextUp.name}
            </strong>
            {nextUp.priority && " (priority)"}
          </>
        ) : (
          "Nobody waiting"
        )}
      </span>
      {serving && <span className="text-[14px] opacity-80">Saves {serving.label} as done</span>}
    </button>
  );
}
