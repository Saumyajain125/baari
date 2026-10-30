"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";

export interface EditNameTarget {
  ticketId: string;
  label: string;
  name: string;
  doctorName: string;
  /** Focus goes back here when the dialog closes (the row's ⋯ button). */
  returnFocus: HTMLElement | null;
}

/**
 * Small modal for correcting a patient's name. Built on <dialog> so the
 * browser handles the focus trap, Esc and the top layer; the walk-in form's
 * visual language (radius 24, 56px inputs, Baloo title) keeps it consistent.
 */
export function EditNameDialog({
  target,
  onSave,
  onClose,
}: {
  target: EditNameTarget;
  onSave(ticketId: string, name: string): void;
  onClose(): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(target.name);
  const titleId = useId();
  const inputId = useId();

  const trimmed = name.trim().replace(/\s+/g, " ");
  const canSave = trimmed.length > 0 && trimmed !== target.name;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    inputRef.current?.focus();
    inputRef.current?.select();
    const returnTo = target.returnFocus;
    return () => {
      if (dialog.open) dialog.close();
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [target.returnFocus]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Esc closes the dialog natively. A "close" that arrives while it is open
      // again is stale (the dev-mode effect re-run closes and reopens it).
      onClose={() => {
        if (!dialogRef.current?.open) onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[24px] bg-surface p-0 font-sans leading-[normal] text-ink shadow-[0_24px_60px_rgba(20,33,33,.35)] backdrop:bg-scrim/70"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave(target.ticketId, trimmed);
          onClose();
        }}
        className="flex flex-col"
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-[22px] pb-2">
          <div className="flex flex-col">
            <h2 id={titleId} className="m-0 font-display text-[26px] font-bold leading-[1.3]">
              Edit name
            </h2>
            <span className="text-[14px] text-muted">
              {target.label} · {target.doctorName}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-subtle text-ink hover:bg-hover"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-[18px] px-6 pt-3 pb-6">
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-[15px] font-semibold">
              Patient name
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              required
              autoComplete="off"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-[14px] border border-line-strong px-4 text-[18px] text-ink focus:border-2 focus:border-teal focus:px-[15px] focus-visible:outline-none"
            />
          </div>
          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-[60px] flex-1 rounded-[16px] border border-line-strong bg-surface text-[16px] font-semibold text-ink hover:bg-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="h-[60px] flex-[2] rounded-[16px] bg-teal font-display text-[19px] font-bold text-white hover:bg-teal-dark disabled:bg-line-strong disabled:text-faint"
            >
              Save name
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
