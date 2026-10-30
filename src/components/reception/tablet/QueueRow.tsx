import type { ComponentType } from "react";
import { ArrowDownIcon, CloseIcon, NoShowIcon, PriorityIcon, SkipIcon } from "@/components/icons";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import type { QueueRowView, RowTone } from "@/lib/queue/logic";
import type { VisitType } from "@/lib/types";

export type RowHandlers = Pick<ReceptionHandlers, "onPriority" | "onBack2" | "onSkip" | "onNoShow" | "onRemove">;

const TONE_BG: Record<RowTone, string> = {
  priority: "bg-danger-tint",
  noReply: "bg-warn-tint",
  normal: "bg-surface",
};

const VISIT_BADGE: Record<VisitType, string> = {
  new: "bg-teal-tint text-teal-dark",
  follow_up: "bg-indigo-tint text-indigo",
  emergency: "bg-danger-tint text-danger",
};

interface RowAction {
  key: keyof RowHandlers;
  text: string;
  /** Accessible name from the design; it always contains the visible text. */
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  danger?: boolean;
}

const ACTIONS: RowAction[] = [
  { key: "onPriority", text: "Priority", label: "Mark priority", Icon: PriorityIcon },
  { key: "onBack2", text: "Back 2", label: "Move back 2", Icon: ArrowDownIcon },
  { key: "onSkip", text: "Skip", label: "Skip", Icon: SkipIcon },
  { key: "onNoShow", text: "No-show", label: "Mark no-show", Icon: NoShowIcon },
  { key: "onRemove", text: "Remove", label: "Remove", Icon: CloseIcon, danger: true },
];

const badge = "rounded-[6px] px-2 py-[2px] text-[11px]";

/**
 * One waiting patient in the Up next list: token, name, badges, time waited
 * and five one-tap actions. Below a 640px-wide panel the actions wrap onto a
 * second line instead of squeezing the name away.
 */
export function QueueRow({ row, handlers }: { row: QueueRowView; handlers: RowHandlers }) {
  return (
    <li
      className={`flex flex-wrap items-center gap-[14px] border-b border-divider py-2 pr-[14px] pl-[18px] @[640px]:flex-nowrap ${TONE_BG[row.tone]}`}
    >
      <span
        className={`w-[62px] flex-none font-display text-[26px] leading-none font-extrabold ${
          row.priority ? "text-danger" : ""
        }`}
      >
        {row.label}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-semibold">
          {row.displayName}{" "}
          <span className="text-[13px] font-normal text-muted">{row.phoneMasked ?? "no phone"}</span>
        </span>
        <div className="flex flex-wrap gap-[6px]">
          {row.priority && <span className={`${badge} bg-danger font-bold text-white`}>PRIORITY</span>}
          {row.noReplyElapsed && (
            <span className={`${badge} bg-amber-tint font-bold text-amber`}>Called, no reply {row.noReplyElapsed}</span>
          )}
          <span className={`${badge} font-semibold ${VISIT_BADGE[row.visitType]}`}>{row.visitTypeLabel}</span>
          <span className={`${badge} bg-subtle font-semibold text-ink`}>{row.distanceLabel}</span>
        </div>
      </div>
      {/* "Not synced" sits under the waited time so it never steals width from the name;
          items-end lets it overhang the 58px column to the left rather than into the buttons. */}
      <div className="flex w-[58px] flex-none flex-col items-end gap-[2px] font-semibold whitespace-nowrap">
        <span className={`text-[14px] ${row.longWait ? "text-warn" : ""}`}>{row.waitedLabel}</span>
        {row.pending && <span className="text-[12px] text-warn">Not synced</span>}
      </div>
      <div
        role="group"
        aria-label={`Actions for ${row.label}`}
        className="flex w-full justify-end gap-[6px] @[640px]:w-auto"
      >
        {ACTIONS.map(({ key, text, label, Icon, danger }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            aria-pressed={key === "onPriority" ? row.priority : undefined}
            onClick={() => handlers[key](row.id)}
            // px-[6px] mirrors the browser's default button padding the design was drawn with, so "No-show" wraps the same way.
            className={`flex size-[52px] flex-none flex-col items-center justify-center gap-[2px] rounded-[12px] bg-subtle px-[6px] py-px text-[10px] font-semibold hover:bg-teal-tint ${
              danger ? "text-danger" : "text-ink"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {text}
          </button>
        ))}
      </div>
    </li>
  );
}
