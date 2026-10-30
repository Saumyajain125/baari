"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { IssuedSlip } from "@/components/reception/handlers";
import { cx } from "./controls";

/** "7 ahead · approx 35 to 45 min", or just "You're next". */
function aheadLine(slip: IssuedSlip): string {
  return slip.ahead > 0 ? `${slip.ahead} ahead · ${slip.etaText}` : slip.etaText;
}

/** "आपसे पहले 7 लोग" (7 people before you). */
function aheadLineHindi(ahead: number): string {
  if (ahead === 0) return "आप अगले हैं";
  if (ahead === 1) return "आपसे पहले 1 व्यक्ति";
  return `आपसे पहले ${ahead} लोग`;
}

export interface TokenSlipProps {
  slip: IssuedSlip;
  /**
   * "screen" draws the 232px preview with a dashed paper edge (artboard 02);
   * "paper" fills the printer's width (58 or 80 mm thermal roll) with no edge.
   */
  variant?: "screen" | "paper";
}

/** The printed token slip. Black on white only, so it prints on thermal paper. */
export function TokenSlip({ slip, variant = "screen" }: TokenSlipProps) {
  const screen = variant === "screen";
  return (
    <div
      role={screen ? "group" : undefined}
      aria-label={screen ? "Printed token slip preview" : undefined}
      className={cx(
        "flex flex-col items-center gap-1.5 bg-white text-center font-slip leading-[normal] text-black",
        screen ? "w-[232px] max-w-full border border-dashed border-dash px-4 py-[18px]" : "w-full px-[2mm] py-[4mm]",
      )}
    >
      <span className="text-[13px] font-bold uppercase">{slip.clinicName}</span>
      <span className="text-[11px]">
        {`${slip.doctorName} · ${slip.room}`}
      </span>
      <span className="font-display text-[72px] leading-none font-extrabold">{slip.label}</span>
      <span className="text-[12px]">{aheadLine(slip)}</span>
      <span lang="hi" className="text-[12px]">
        {aheadLineHindi(slip.ahead)}
      </span>
      <span className="text-[11px]">Watch the TV screen for your number</span>
      <span className="text-[10px]">{slip.issuedAtText}</span>
    </div>
  );
}

const PAPER_CLASS = "baari-slip-paper";

/*
 * While a printable slip is mounted, printing shows only the slip: every other
 * child of <body> is hidden (display:none, so a thermal printer doesn't feed
 * blank paper for the hidden app) and the slip is capped at 72 mm, the
 * printable width of 80 mm rolls; it shrinks to fit 58 mm rolls.
 */
const PRINT_CSS = `
.${PAPER_CLASS} { display: none; }
@media print {
  @page { margin: 0; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body:has(> .${PAPER_CLASS}) > :not(.${PAPER_CLASS}) { display: none !important; }
  .${PAPER_CLASS} { display: block; width: 100%; max-width: 72mm; margin: 0 auto; break-inside: avoid; }
}
`;

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true after: portals need document.body. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Mounts `slip` as the only thing that prints; call window.print() to print
 * it. Usable anywhere a slip needs printing, not just the walk-in dialog.
 */
export function PrintableTokenSlip({ slip }: { slip: IssuedSlip }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(
    <div className={PAPER_CLASS} aria-hidden="true">
      <style>{PRINT_CSS}</style>
      <TokenSlip slip={slip} variant="paper" />
    </div>,
    document.body,
  );
}
