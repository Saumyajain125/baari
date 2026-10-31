"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/components/public/ui";

/**
 * A soft glow that follows the pointer across its parent card. Drop it in as
 * the first child of any `relative isolate overflow-hidden` card (isolate keeps
 * the glow above the card background but under its content). Pointer position is
 * written to CSS variables, so moving the mouse never re-renders React.
 * Touch screens never see it (no hover).
 */
export function Spotlight({ tone = "light" }: { tone?: "light" | "dark" }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const glow = ref.current;
    const card = glow?.parentElement;
    if (!glow || !card) return;
    function move(e: PointerEvent) {
      if (e.pointerType !== "mouse" || !glow || !card) return;
      const r = card.getBoundingClientRect();
      glow.style.setProperty("--sx", `${e.clientX - r.left}px`);
      glow.style.setProperty("--sy", `${e.clientY - r.top}px`);
      glow.style.opacity = "1";
    }
    function leave() {
      if (glow) glow.style.opacity = "0";
    }
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500",
        tone === "light"
          ? "bg-[radial-gradient(520px_circle_at_var(--sx,50%)_var(--sy,50%),rgb(14_124_123/0.09),transparent_62%)]"
          : "bg-[radial-gradient(420px_circle_at_var(--sx,50%)_var(--sy,50%),rgb(63_184_182/0.22),transparent_62%)]",
      )}
    />
  );
}
