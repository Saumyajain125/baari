import { useId, type RefObject } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { QrIcon, TvIcon } from "@/components/icons";
import type { QueueRowView } from "@/lib/view";
import { PhoneQueueRow } from "./PhoneQueueRow";

export interface PhoneQueueListProps {
  rows: QueueRowView[];
  /** Nothing issued yet today: show the "Fresh queue for today" welcome instead of a bare empty list. */
  freshDay: boolean;
  /** Row whose action sheet is open, for aria-expanded on its ⋯ button. */
  openRowId: string | null;
  /** The panel heading; focus lands here when the row a sheet acted on has left the list. */
  headingRef: RefObject<HTMLHeadingElement | null>;
  onOpenActions(rowId: string, trigger: HTMLElement): void;
  onPrintPoster(): void;
  onOpenTv(): void;
}

const OUTLINE_BUTTON =
  "flex h-12 items-center justify-center gap-2 rounded-[14px] border border-line-strong bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-hover";

/** The "UP NEXT" panel: fills the space between the serving card and the footer and scrolls on its own. */
export function PhoneQueueList({
  rows,
  freshDay,
  openRowId,
  headingRef,
  onOpenActions,
  onPrintPoster,
  onOpenTv,
}: PhoneQueueListProps) {
  const empty = rows.length === 0;
  const headingId = useId();
  // "A-36" fits the artboard's 54px column; "W-188" needs a wider one.
  const wideTokens = rows.some((row) => row.label.length > 4);

  return (
    <section
      aria-labelledby={headingId}
      className="mx-4 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[18px] border border-b-0 border-line bg-surface"
    >
      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="border-b border-line px-4 py-3 text-[13px] font-bold text-muted focus-visible:-outline-offset-3"
      >
        {empty ? "UP NEXT" : "UP NEXT · tap ⋯ for skip, no-show, priority"}
      </h2>

      {empty && freshDay && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-5 py-6 text-center">
          <LogoMark variant="empty" size={88} />
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display text-[22px] leading-tight font-bold">Fresh queue for today</h3>
            <p className="text-[14px] leading-[1.55] text-muted">
              Patients who scan the QR poster show up here on their own. Yesterday&apos;s queue was cleared at midnight.
            </p>
          </div>
          <div className="flex w-full max-w-[260px] flex-col gap-2.5">
            <button type="button" onClick={onPrintPoster} className={OUTLINE_BUTTON}>
              <QrIcon size={20} />
              Print QR poster
            </button>
            <button type="button" onClick={onOpenTv} className={OUTLINE_BUTTON}>
              <TvIcon size={20} />
              Open TV display
            </button>
          </div>
        </div>
      )}

      {empty && !freshDay && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
          <p className="text-[15px] font-semibold">Nobody waiting</p>
          <p className="text-[13px] leading-snug text-balance text-muted">New patients show up here as soon as they join.</p>
        </div>
      )}

      {!empty && (
        <ol aria-label={`${rows.length} waiting`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {rows.map((row) => (
            <PhoneQueueRow
              key={row.id}
              row={row}
              expanded={row.id === openRowId}
              wideTokens={wideTokens}
              onOpenActions={onOpenActions}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
