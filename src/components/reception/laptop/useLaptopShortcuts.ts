"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface LaptopShortcuts {
  /** Upper-case doctor prefix → doctor id, e.g. { A: "anita", B: "rohit" }. */
  nextKeys: Record<string, string>;
  onNext(doctorId: string): void;
  onAddWalkIn(): void;
  onUndo(): void;
  /** Focused by "/". */
  searchRef: RefObject<HTMLInputElement | null>;
  /** The desk's root element; shortcuts stay off while it sits under an inert overlay. */
  rootRef: RefObject<HTMLElement | null>;
}

/** Key reserved for "Add walk-in"; a doctor with this prefix gets no Next shortcut. */
export const WALK_IN_KEY = "W";

/**
 * Desk keyboard: doctor prefix → Next patient, W → Add walk-in, / → find,
 * Ctrl/Cmd+Z → undo. Shortcuts are ignored while typing, inside menus and
 * while any modal dialog is open, so they never fire behind the walk-in form
 * or the PIN lock.
 */
export function useLaptopShortcuts(shortcuts: LaptopShortcuts): void {
  // Latest callbacks without re-binding the listener on every render.
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = latest.current;
      if (e.defaultPrevented || e.isComposing || isTyping(e.target) || isBlocked(s.rootRef.current)) return;

      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (!e.repeat) s.onUndo();
        return;
      }
      // Leave browser and OS shortcuts (Cmd+W, Ctrl+A, ...) alone.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Holding a key down must not call a whole row of patients.
      if (e.repeat) return;

      if (e.key === "/") {
        e.preventDefault();
        s.searchRef.current?.focus();
        return;
      }

      const key = e.key.length === 1 ? e.key.toUpperCase() : "";
      if (key === WALK_IN_KEY) {
        e.preventDefault();
        s.onAddWalkIn();
        return;
      }
      const doctorId = key ? s.nextKeys[key] : undefined;
      if (doctorId) {
        e.preventDefault();
        s.onNext(doctorId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file"].includes(target.type);
  }
  return false;
}

/** A modal dialog, an open menu or an inert overlay owns the keyboard right now. */
function isBlocked(root: HTMLElement | null): boolean {
  if (typeof document === "undefined") return true;
  if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"]')) return true;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest('[role="menu"]')) return true;
  return !!root?.closest("[inert], [aria-hidden='true']");
}
