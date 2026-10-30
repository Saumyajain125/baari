"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cx } from "./controls";

const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

/** Open dialogs, innermost last. Only the top one reacts to keys and focus. */
const openDialogs: HTMLElement[] = [];

/** Focusable elements in tab order that are actually rendered (skips display:none panels). */
function tabbablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest("[inert]") && el.getClientRects().length > 0,
  );
}

export interface DialogProps {
  open: boolean;
  /** Called on Esc and on a tap on the backdrop. */
  onClose(): void;
  /** id of the heading that names the dialog. */
  labelledBy: string;
  describedBy?: string;
  /**
   * Layout classes for the dialog box. The box itself covers the viewport and
   * centres its children, so a dialog can be one panel or several side by side.
   */
  className?: string;
  /** Element to focus when the dialog opens; defaults to the dialog itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Design previews paint the artboard's solid backdrop instead of a scrim over the app. */
  solidBackdrop?: boolean;
  /** Tapping outside the panels closes the dialog. Default true. */
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * Modal dialog: scrim, aria-modal, focus moved in on open and restored to the
 * opener on close, Tab trapped inside, Esc to close, page scroll locked.
 * Rendered in place (no portal) so it hydrates cleanly when a page opens it
 * on first render; `fixed` + z-50 keeps it above the reception layouts.
 */
export function Dialog({ open, ...rest }: DialogProps) {
  return open ? <DialogLayer {...rest} /> : null;
}

function DialogLayer({
  onClose,
  labelledBy,
  describedBy,
  className,
  initialFocusRef,
  solidBackdrop = false,
  closeOnBackdrop = true,
  children,
}: Omit<DialogProps, "open">) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs.push(dialog);
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    initialFocusRef?.current?.focus();
    if (!dialog.contains(document.activeElement)) dialog.focus();

    const isTop = () => openDialogs[openDialogs.length - 1] === dialog;

    function onKeyDown(e: KeyboardEvent) {
      if (!dialog || !isTop() || e.defaultPrevented) return;
      if (e.key === "Escape" && !e.isComposing) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = tabbablesIn(dialog);
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !active || active === dialog || !dialog.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    }

    // Catches focus that escapes another way (screen reader virtual cursor, a click on the page behind).
    function onFocusIn(e: FocusEvent) {
      if (!dialog || !isTop()) return;
      if (e.target instanceof Node && !dialog.contains(e.target)) (tabbablesIn(dialog)[0] ?? dialog).focus();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      root.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [initialFocusRef]);

  return (
    <div
      className={cx(
        "fixed inset-0 z-50 overflow-y-auto overscroll-contain text-ink",
        solidBackdrop ? "bg-scrim" : "bg-scrim/90",
      )}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        // The box is invisible layout, so it never shows the global focus ring.
        className={cx("flex min-h-full w-full items-center justify-center p-4 outline-none sm:p-10", className)}
        onPointerDown={(e) => {
          pressStartedOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          // Only a press that starts and ends on the backdrop closes, so a text
          // selection dragged out of an input doesn't dismiss the form.
          if (closeOnBackdrop && pressStartedOnBackdrop.current && e.target === e.currentTarget) onClose();
        }}
      >
        {children}
      </div>
    </div>
  );
}
