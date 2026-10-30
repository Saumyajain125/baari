"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface BottomSheetProps {
  /** id of the element that names the sheet (its heading). */
  labelledBy: string;
  describedBy?: string;
  /** Esc, a tap on the backdrop, or the browser closing the dialog. */
  onClose(): void;
  /**
   * Focused when the sheet opens. Defaults to the sheet panel itself, so a
   * screen reader announces the sheet's title and no action looks pre-selected;
   * Tab then reaches the first action.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/**
 * Modal sheet that slides up from the bottom edge. Built on a native
 * <dialog> opened with showModal(), so the page behind it is inert and the
 * sheet sits in the top layer; Tab is additionally wrapped so focus never
 * leaves the sheet. Mount it to open, unmount it to close: the parent owns
 * the open state and restores focus afterwards.
 */
export function BottomSheet({ labelledBy, describedBy, onClose, initialFocusRef, children }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Esc: keep the dialog open and let the parent unmount it, so React state stays the source of truth.
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    // The browser may still close it directly (e.g. repeated Esc). A stale close event
    // from a previous mount (StrictMode) arrives while the dialog is open again: ignore it.
    const handleClose = () => {
      if (!dialog.open) onCloseRef.current();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    if (!dialog.open) dialog.showModal();

    const target = initialFocusRef?.current ?? sheetRef.current;
    target?.focus();
    if (target instanceof HTMLInputElement) target.select();

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.close();
    };
  }, [initialFocusRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || !sheetRef.current) return;
    const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const atStart = document.activeElement === first || document.activeElement === sheetRef.current;
    if (event.shiftKey && atStart) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onKeyDown={handleKeyDown}
      // The dialog box fills the viewport and the sheet sits at its bottom edge,
      // so a click whose target is the dialog itself landed on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none flex-col justify-end open:flex overflow-hidden bg-transparent p-0 text-ink backdrop:bg-scrim/90 backdrop:transition-opacity backdrop:duration-200 starting:backdrop:opacity-0"
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="mx-auto outline-none flex max-h-[calc(100dvh-24px)] w-full max-w-[480px] flex-col overflow-y-auto rounded-t-[24px] bg-surface pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(20,33,33,0.18)] transition-transform duration-200 ease-out starting:translate-y-full motion-reduce:transition-none"
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
        {children}
      </div>
    </dialog>
  );
}
