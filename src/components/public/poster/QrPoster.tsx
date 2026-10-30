"use client";

import { useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { PrinterIcon } from "@/components/icons";
import { QrCode } from "@/components/public/QrCode";
import { cx, primaryButtonClass } from "@/components/public/ui";

/* Paper is A4 with no printer margin; the sheet itself draws the white border. */
const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #fff !important; }
  [data-poster-sheet] { zoom: 1 !important; }
}
`;

/** 210mm at the CSS 96 dpi. */
const SHEET_PX = 794;
/** The page's 16px side gutters. */
const GUTTERS_PX = 32;

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/**
 * On screens narrower than A4 the sheet zooms out to fit the width, so the
 * whole poster is visible without sideways scrolling. Print is always 1:1.
 */
function useSheetZoom(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => Math.min(1, (document.documentElement.clientWidth - GUTTERS_PX) / SHEET_PX),
    () => 1,
  );
}

const STEPS: { en: string; hi: string }[] = [
  { en: "Scan with your phone camera", hi: "फ़ोन के कैमरे से स्कैन करें" },
  { en: "Enter your name and pick the doctor", hi: "अपना नाम लिखें, डॉक्टर चुनें" },
  { en: "Wait anywhere. Your phone tells you when it's your turn", hi: "कहीं भी इंतज़ार करें, बारी आने पर फ़ोन बताएगा" },
];

export interface QrPosterProps {
  clinicName: string;
  /** Absolute join URL encoded in the QR; null until known (SSR). */
  joinUrl: string | null;
}

/**
 * Printable A4 poster for the waiting room door: clinic name, a big QR code to
 * join the queue and three steps, in English and Hindi. On screen it sits on
 * the canvas with a Print button that never reaches the paper.
 */
export function QrPoster({ clinicName, joinUrl }: QrPosterProps) {
  const zoom = useSheetZoom();
  return (
    <div className="flex min-h-dvh flex-col items-center gap-5 bg-canvas px-4 py-6 print:block print:min-h-0 print:p-0">
      <style>{PRINT_CSS}</style>

      <div className="no-print flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-[280px] flex-col gap-1">
          <h1 className="font-display text-[22px] leading-tight font-bold">QR poster</h1>
          <p className="text-[14px] leading-snug text-pretty text-muted">
            Print on A4 and stick it where patients wait. Colour or black and white both scan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className={cx(primaryButtonClass, "h-12 flex-none gap-2 rounded-[14px] px-5 text-[15px] font-semibold max-sm:w-full")}
        >
          <PrinterIcon size={20} />
          Print poster
        </button>
      </div>

      <article
        data-poster-sheet
        aria-label={`Queue poster for ${clinicName}`}
        style={zoom < 1 ? { zoom } : undefined}
        className="flex h-[297mm] w-[210mm] flex-none flex-col overflow-hidden bg-surface text-ink shadow-[0_12px_40px_rgb(20_33_33/0.14)] [print-color-adjust:exact] print:shadow-none"
      >
        <header className="flex items-center gap-[6mm] bg-teal px-[15mm] py-[10mm] text-white">
          <LogoMark variant="inverse" size={80} />
          <div className="flex min-w-0 flex-col gap-[1mm]">
            <p className="font-display text-[44px] leading-[1.05] font-bold">{clinicName}</p>
            <p className="text-[19px] leading-snug opacity-90">Walk-in queue · No need to stand in line</p>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col items-center justify-center-safe px-[15mm] py-[7mm] text-center">
          <h2 className="font-display text-[58px] leading-[1.05] font-extrabold">Scan to join the queue</h2>
          <p lang="hi" className="mt-[1mm] font-display text-[28px] leading-[1.3] font-semibold text-teal-dark">
            क्यू में शामिल होने के लिए स्कैन करें
          </p>

          <div className="mt-[7mm] rounded-[32px] border-[5px] border-teal p-[4mm]">
            {joinUrl ? (
              <QrCode value={joinUrl} size="90mm" margin={1} label={`QR code to join the queue at ${clinicName}`} />
            ) : (
              <div className="size-[90mm] rounded-[16px] bg-subtle" aria-hidden="true" />
            )}
          </div>
          <p className="mt-[3mm] text-[14px] leading-snug break-all text-muted">{joinUrl ?? "\u00a0"}</p>

          <ol className="mt-[7mm] grid w-full grid-cols-3 gap-[4mm] text-left">
            {STEPS.map((step, i) => (
              <li key={step.en} className="flex flex-col gap-[2mm] rounded-[20px] bg-teal-tint px-[4.5mm] py-[4mm]">
                <span
                  aria-hidden="true"
                  className="flex size-[36px] items-center justify-center rounded-[12px] bg-teal font-display text-[20px] leading-none font-extrabold text-white"
                >
                  {i + 1}
                </span>
                <span className="text-[16px] leading-snug font-semibold text-pretty">{step.en}</span>
                <span lang="hi" className="text-[14px] leading-snug text-pretty text-muted">
                  {step.hi}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mx-[15mm] mb-[9mm] flex items-center justify-between gap-[6mm] border-t-2 border-dashed border-line-strong pt-[5mm]">
          <div className="flex min-w-0 flex-col gap-[1mm]">
            <p className="text-[18px] leading-snug font-semibold">No smartphone? Ask at reception for a paper token.</p>
            <p lang="hi" className="text-[16px] leading-snug text-muted">
              स्मार्टफ़ोन नहीं है? रिसेप्शन से टोकन पर्ची लें।
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-[22px] leading-none font-extrabold text-teal">baari</span>
          </div>
        </footer>
      </article>
    </div>
  );
}
