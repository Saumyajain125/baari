"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, EditIcon, MoreIcon, NoShowIcon, SkipIcon } from "@/components/icons";

interface MenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  run(): void;
}

export interface RowMoreMenuProps {
  /** Token label, used in accessible names ("More actions for A-26"). */
  label: string;
  onSkip(): void;
  onNoShow(): void;
  onRemove(): void;
  /** Receives the trigger so the edit dialog can hand focus back to it. */
  onEditName(trigger: HTMLButtonElement): void;
  /** Class names shared with the row's other icon buttons. */
  buttonClassName: string;
}

/** Gap between the trigger and the menu, and the minimum margin from the viewport edge. */
const OFFSET = 4;
const EDGE = 8;

/**
 * The ⋯ button at the end of each queue row and its popup menu (Skip,
 * No-show, Edit name, Remove). The menu is portalled to <body> so the
 * scrolling table can't clip it, and follows the WAI-ARIA menu button
 * pattern: arrows / Home / End / first letter move focus, Esc or Tab closes
 * and returns focus to the button, a click outside closes it.
 */
export function RowMoreMenu({ label, onSkip, onNoShow, onRemove, onEditName, buttonClassName }: RowMoreMenuProps) {
  // Which item gets focus on open: the last one when opened with ArrowUp.
  const [open, setOpen] = useState<false | "first" | "last">(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const actions: MenuAction[] = [
    { key: "skip", label: "Skip", icon: <SkipIcon size={18} />, run: onSkip },
    { key: "no-show", label: "No-show", icon: <NoShowIcon size={18} />, run: onNoShow },
    {
      key: "edit",
      label: "Edit name",
      icon: <EditIcon size={18} />,
      run: () => triggerRef.current && onEditName(triggerRef.current),
    },
    { key: "remove", label: "Remove", icon: <CloseIcon size={18} />, danger: true, run: onRemove },
  ];

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        aria-label={`More actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open !== false}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => (o ? false : "first"))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(e.key === "ArrowUp" ? "last" : "first");
          }
        }}
      >
        <MoreIcon size={18} />
      </button>
      {open && (
        <Menu
          id={menuId}
          label={`Actions for ${label}`}
          actions={actions}
          initialFocus={open}
          triggerRef={triggerRef}
          onClose={close}
        />
      )}
    </>
  );
}

function Menu({
  id,
  label,
  actions,
  initialFocus,
  triggerRef,
  onClose,
}: {
  id: string;
  label: string;
  actions: MenuAction[];
  initialFocus: "first" | "last";
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose(restoreFocus: boolean): void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties | null>(null);

  // Sit under the trigger, right-aligned; flip above it near the bottom of the screen.
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const r = trigger.getBoundingClientRect();
    const h = menu.offsetHeight;
    const below = r.bottom + OFFSET + h + EDGE <= window.innerHeight;
    setPos({
      top: below ? r.bottom + OFFSET : Math.max(EDGE, r.top - OFFSET - h),
      right: Math.max(EDGE, window.innerWidth - r.right),
    });
  }, [triggerRef]);

  useLayoutEffect(place, [place]);

  // Move focus in once the menu is positioned: hidden elements can't take focus.
  const placed = pos != null;
  useLayoutEffect(() => {
    if (!placed) return;
    const list = menuItems(menuRef.current);
    (initialFocus === "last" ? list[list.length - 1] : list[0])?.focus();
  }, [placed, initialFocus]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose(false);
    }
    // Esc still closes when focus has wandered back to the trigger.
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onClose(true);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [onClose, place, triggerRef]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const list = menuItems(menuRef.current);
    const i = list.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowDown":
        next = list[(i + 1) % list.length];
        break;
      case "ArrowUp":
        next = list[(i - 1 + list.length) % list.length];
        break;
      case "Home":
        next = list[0];
        break;
      case "End":
        next = list[list.length - 1];
        break;
      case "Escape":
      case "Tab":
        e.preventDefault();
        onClose(true);
        return;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const ch = e.key.toLowerCase();
          const ordered = [...list.slice(i + 1), ...list.slice(0, i + 1)];
          next = ordered.find((el) => el.textContent?.trim().toLowerCase().startsWith(ch));
        }
    }
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={pos ?? { top: 0, right: 0, visibility: "hidden" }}
      className="fixed z-50 flex w-[200px] flex-col rounded-[14px] border border-line bg-surface p-1.5 font-sans leading-[normal] text-ink shadow-[0_12px_32px_rgba(20,33,33,.18)]"
    >
      {actions.map((a, index) => (
        <div key={a.key} role="none">
          {a.danger && index > 0 && <div role="separator" className="mx-2 my-1 h-px bg-divider" />}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              // Edit name opens a dialog that manages focus itself.
              onClose(a.key !== "edit");
              a.run();
            }}
            className={`flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14px] font-medium hover:bg-hover focus:bg-hover ${
              a.danger ? "text-danger" : "text-ink"
            }`}
          >
            <span className={a.danger ? "text-danger" : "text-muted"}>{a.icon}</span>
            {a.label}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
}
