"use client";

import { CloseIcon } from "@/components/icons";

export type ToastTone = "error" | "info";

export interface ErrorToastProps {
  message: string;
  /** "error" for refused writes (danger tint); "info" for gentle notices (dark, like the Undo toast). */
  tone?: ToastTone;
  /** Sits above the Undo toast when both are on screen. */
  raised?: boolean;
  onDismiss(): void;
}

/**
 * Bottom-centre toast for things the desk needs to know but can't undo: a
 * write the server refused, or a tap that couldn't do anything (queue paused).
 * Same footprint as the UndoToast (artboard 07) so the two stack neatly.
 */
export function ErrorToast({ message, tone = "error", raised = false, onDismiss }: ErrorToastProps) {
  const error = tone === "error";

  return (
    <div
      role={error ? "alert" : "status"}
      className={`no-print fixed left-1/2 z-[60] flex w-max max-w-[min(560px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-[16px] py-2 pr-2 pl-4 leading-[normal] shadow-[0_10px_30px_rgba(20,33,33,0.3)] ${
        raised ? "bottom-[calc(var(--toast-bottom,28px)+80px)]" : "bottom-[var(--toast-bottom,28px)]"
      } ${error ? "border border-danger-line bg-danger-tint text-danger" : "bg-ink text-white"}`}
    >
      {error && (
        <span
          aria-hidden="true"
          className="flex size-6 flex-none items-center justify-center rounded-full bg-danger text-[14px] font-bold text-white"
        >
          !
        </span>
      )}
      <span className="min-w-0 text-[15px] font-semibold">{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className={`flex size-11 flex-none items-center justify-center rounded-[12px] ${
          error ? "hover:bg-danger/10" : "hover:bg-white/10 focus-visible:outline-white"
        }`}
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}
