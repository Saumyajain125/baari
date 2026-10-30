import { MoreIcon } from "@/components/icons";
import type { QueueRowView } from "@/lib/view";

/** "New · Here · 31 min": the meta line shared by the row and its action sheet. */
export function rowMeta(row: QueueRowView): string {
  return `${row.visitTypeLabel} · ${row.distanceLabel} · ${row.waitedLabel}`;
}

const TONE_BG: Record<QueueRowView["tone"], string> = {
  priority: "bg-danger-tint",
  noReply: "bg-warn-tint",
  normal: "",
};

/** Non-breaking within a part; the only break opportunity is the space after each "·". */
const SEP = "\u00a0· ";
const unbroken = (text: string) => text.replace(/ /g, "\u00a0");

/**
 * The meta line. On a narrow phone it wraps between parts ("Follow-up · Under
 * 15 min ·" / "27 min") instead of leaving a lone "min" on the second line.
 * Plain rows stay a single text run, so the 390px artboard renders unchanged.
 */
function MetaLine({ row }: { row: QueueRowView }) {
  const emergency = row.visitType === "emergency";
  const rest = (emergency ? [row.distanceLabel, row.waitedLabel] : [row.visitTypeLabel, row.distanceLabel, row.waitedLabel])
    .map(unbroken)
    .join(SEP);

  return (
    <span className="text-[12px] text-muted">
      {emergency && (
        <>
          <span className="font-semibold text-danger">{row.visitTypeLabel}</span>
          {SEP}
        </>
      )}
      {rest}
      {row.pending && (
        <>
          {SEP}
          <span className="font-semibold whitespace-nowrap text-warn">Not synced</span>
        </>
      )}
    </span>
  );
}

export interface PhoneQueueRowProps {
  row: QueueRowView;
  /** True while this row's action sheet is open. */
  expanded: boolean;
  /**
   * Set by the list when any label has five characters ("W-188"): every row's
   * token column widens together, so names stay aligned and never touch the token.
   */
  wideTokens: boolean;
  onOpenActions(rowId: string, trigger: HTMLElement): void;
}

/** One waiting patient: token, name, "visit · distance · waited", and the ⋯ that opens the action sheet. */
export function PhoneQueueRow({ row, expanded, wideTokens, onOpenActions }: PhoneQueueRowProps) {
  return (
    // Below the 390px artboard the gaps tighten a little so the longest meta line still fits on a 375px phone.
    <li
      className={`flex min-h-[61px] items-center gap-3 border-b border-divider px-4 max-[389px]:gap-2 ${TONE_BG[row.tone]}`}
    >
      <span
        className={`shrink-0 font-display text-[22px] font-extrabold whitespace-nowrap ${wideTokens ? "w-[62px]" : "w-[54px]"} ${
          row.priority ? "text-danger" : ""
        }`}
      >
        {row.label}
      </span>
      <div className="flex min-w-0 flex-1 flex-col py-2">
        <span className="truncate text-[15px] font-semibold">{row.displayName}</span>
        {(row.priority || row.noReplyElapsed) && (
          <span className="my-0.5 flex flex-wrap gap-1.5">
            {row.priority && (
              <span className="rounded-[6px] bg-danger px-2 py-px text-[11px] font-bold text-white">PRIORITY</span>
            )}
            {row.noReplyElapsed && (
              <span className="rounded-[6px] bg-amber-tint px-2 py-px text-[11px] font-bold text-amber">
                Called, no reply {row.noReplyElapsed}
              </span>
            )}
          </span>
        )}
        <MetaLine row={row} />
      </div>
      <button
        type="button"
        aria-label={`Actions for ${row.label}`}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={(event) => onOpenActions(row.id, event.currentTarget)}
        className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-muted hover:bg-subtle active:bg-subtle"
      >
        <MoreIcon size={20} />
      </button>
    </li>
  );
}
