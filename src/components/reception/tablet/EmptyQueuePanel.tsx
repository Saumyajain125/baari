import { useId } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { QrIcon, TvIcon } from "@/components/icons";

export interface EmptyQueuePanelProps {
  /** True before the first token of the day (artboard 03); false once the queue has simply run dry. */
  freshDay: boolean;
  onPrintPoster(): void;
  onOpenTv(): void;
}

const actionClass =
  "flex h-[52px] items-center gap-2 rounded-[14px] border border-line-strong bg-surface px-5 text-[15px] font-semibold whitespace-nowrap text-ink hover:bg-hover";

/** Replaces the Up next list when nobody is waiting for the selected doctor. */
export function EmptyQueuePanel({ freshDay, onPrintPoster, onOpenTv }: EmptyQueuePanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto rounded-[20px] border border-line bg-surface p-10 text-center"
    >
      <LogoMark variant="empty" size={120} />
      <div className="flex max-w-[420px] flex-col gap-2">
        <h2 id={headingId} className="font-display text-[28px] font-bold">
          {freshDay ? "Fresh queue for today" : "Nobody waiting right now"}
        </h2>
        <p className="text-[16px] leading-[1.55] text-muted">
          {freshDay
            ? "Patients who scan the QR poster show up here on their own. Yesterday's queue was cleared at midnight."
            : "Patients who scan the QR poster show up here on their own, and walk-ins you add appear in order."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-[10px]">
        <button type="button" onClick={onPrintPoster} className={actionClass}>
          <QrIcon size={20} />
          Print QR poster
        </button>
        <button type="button" onClick={onOpenTv} className={actionClass}>
          <TvIcon size={20} />
          Open TV display
        </button>
      </div>
    </section>
  );
}
