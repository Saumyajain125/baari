"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { QrIcon, SettingsIcon, TvIcon } from "@/components/icons";

export interface SettingsMenuProps {
  onLock(): void;
  onPrintPoster(): void;
  onOpenSettings(): void;
  /** Adds "Open TV display", for layouts without their own TV button. */
  onOpenTv?(): void;
  /** 44px trigger for the laptop and phone headers (tablet's is 48px). */
  compact?: boolean;
}

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  run(): void;
}

/**
 * The header's Settings button. It opens a small menu so "Lock desk" is one tap
 * away, following the WAI-ARIA menu button pattern: arrows / Home / End move
 * focus, Esc returns focus to the button, Tab or a click outside closes it.
 */
export function SettingsMenu({ onLock, onPrintPoster, onOpenSettings, onOpenTv, compact = false }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items: MenuItem[] = [
    { key: "lock", label: "Lock desk", icon: <LockIcon />, run: onLock },
    { key: "poster", label: "Print QR poster", icon: <QrIcon size={20} />, run: onPrintPoster },
    ...(onOpenTv ? [{ key: "tv", label: "Open TV display", icon: <TvIcon size={20} />, run: onOpenTv }] : []),
    { key: "settings", label: "Clinic settings", icon: <SettingsIcon size={20} />, run: onOpenSettings },
  ];

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menuItems(menuRef.current)[0]?.focus();
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const list = menuItems(menuRef.current);
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus();
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <div className="relative flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className={`flex items-center justify-center border border-line bg-surface text-ink hover:bg-hover ${
          compact ? "size-11 rounded-[12px]" : "size-12 rounded-[14px]"
        }`}
      >
        <SettingsIcon size={compact ? 20 : 22} />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Settings"
          onKeyDown={onMenuKeyDown}
          className="absolute top-[calc(100%+8px)] right-0 z-40 flex min-w-[220px] flex-col rounded-[16px] border border-line bg-surface p-[6px] shadow-[0_10px_30px_rgba(20,33,33,0.14)]"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(true);
                item.run();
              }}
              className="flex h-12 items-center gap-[10px] rounded-[10px] px-3 text-left text-[15px] font-semibold whitespace-nowrap text-ink hover:bg-hover focus-visible:bg-hover"
            >
              <span className="flex-none text-muted">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
}

/** Padlock in the icon set's style; icons.tsx has no lock glyph. */
function LockIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
