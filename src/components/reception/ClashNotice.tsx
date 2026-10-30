"use client";

import { useId } from "react";

/** A walk-in issued offline whose token clashed with a QR join from the outage. */
export interface ClashRenumbering {
  ticketId: string;
  /** The label it was issued with offline, "A-25". */
  oldLabel: string;
  /** Its fresh label, "A-29"; null when renumbering failed and the clash still stands. */
  newLabel: string | null;
  /** Patient name as entered at the desk. */
  name: string;
  /** When the clash was handled (epoch ms). */
  at: number;
}

export interface ClashNoticeProps {
  notices: ClashRenumbering[];
  onDismiss(): void;
}

/**
 * Sticky card listing walk-ins renumbered after an outage, so reception can
 * tell each patient their new token. Amber like the OfflineBanner, since it is
 * the outage's aftermath. It floats at the top centre instead of joining the
 * layout, so the full-height screens keep their geometry, and stays until
 * dismissed. Sits below dialogs (z-50) so their scrim covers it.
 */
export function ClashNotice({ notices, onDismiss }: ClashNoticeProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="no-print fixed top-3 left-1/2 z-30 flex w-[min(560px,calc(100vw-32px))] -translate-x-1/2 items-start gap-3 rounded-[16px] border border-amber-line bg-amber-tint py-3 pr-3 pl-4 leading-[normal] text-amber shadow-[0_10px_30px_rgba(20,33,33,0.18)] sm:top-4"
    >
      <span
        aria-hidden="true"
        className="mt-[10px] flex size-6 flex-none items-center justify-center rounded-full bg-amber text-[14px] font-bold text-white"
      >
        !
      </span>
      <div role="alert" className="flex min-w-0 flex-1 flex-col gap-1 pt-[10px]">
        <h2 id={titleId} className="text-[15px] font-bold sm:text-[16px]">
          {notices.length === 1 ? "An offline token clashed with a QR join" : "Offline tokens clashed with QR joins"}
        </h2>
        <ul className="flex max-h-[40dvh] flex-col gap-1 overflow-y-auto text-[14px] sm:text-[15px]">
          {notices.map((n) => (
            <li key={`${n.ticketId}:${n.at}`}>
              <strong className="font-semibold">{n.name || "Patient"}</strong>:{" "}
              {n.newLabel ? (
                <>
                  {n.oldLabel} <span aria-hidden="true">→</span>
                  <span className="sr-only">is now</span> <strong className="font-bold">{n.newLabel}</strong>. Please
                  tell them.
                </>
              ) : (
                <>{n.oldLabel} couldn&apos;t be renumbered and still clashes. Please check the queue.</>
              )}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="h-11 flex-none rounded-[12px] bg-amber-chip px-4 text-[15px] font-bold whitespace-nowrap hover:bg-amber-line"
      >
        Dismiss
      </button>
    </section>
  );
}
