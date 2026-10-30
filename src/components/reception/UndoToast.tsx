"use client";

import { CheckIcon } from "@/components/icons";

export interface UndoToastProps {
  /** "A-21 moved back 2 places" */
  message: string;
  /** Countdown shown on the button, "Undo · 4s". */
  secondsLeft: number;
  onUndo(): void;
}

/**
 * Dark toast at the bottom centre after every desk action (artboard 07). The
 * countdown is hidden from assistive tech so the polite live region announces
 * the message once rather than every second.
 */
export function UndoToast({ message, secondsLeft, onUndo }: UndoToastProps) {
  const seconds = Math.max(0, Math.ceil(secondsLeft));

  return (
    <div
      role="status"
      className="no-print fixed bottom-[var(--toast-bottom,28px)] left-1/2 z-50 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-4 rounded-[16px] bg-ink py-3 pr-3 pl-5 leading-[normal] text-white shadow-[0_10px_30px_rgba(20,33,33,0.3)]"
    >
      <CheckIcon size={20} className="flex-none" />
      <span className="min-w-0 text-[15px]">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="h-11 flex-none rounded-[12px] bg-teal-bright px-[18px] text-[15px] font-bold whitespace-nowrap text-teal-ink focus-visible:outline-white"
      >
        Undo<span aria-hidden="true"> · {seconds}s</span>
      </button>
    </div>
  );
}
