import { useId } from "react";
import type { QueueRowView } from "@/lib/queue/logic";
import { QueueRow, type RowHandlers } from "./QueueRow";

export interface UpNextPanelProps {
  /** Waiting count for the heading ("Up next · 9"). */
  count: number;
  rows: QueueRowView[];
  handlers: RowHandlers;
}

/** Right-hand panel listing everyone waiting for the selected doctor; the list scrolls inside it. */
export function UpNextPanel({ count, rows, handlers }: UpNextPanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="@container flex min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-line bg-surface"
    >
      <div className="flex flex-none items-center justify-between gap-4 border-b border-line px-[18px] py-[14px]">
        <h2 id={headingId} className="text-[16px] font-bold whitespace-nowrap">
          Up next · {count}
        </h2>
        <p className="hidden truncate text-[13px] text-muted @[560px]:block">
          Tap an action, no confirm needed. Undo appears for 5 s.
        </p>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => (
          <QueueRow key={row.id} row={row} handlers={handlers} />
        ))}
      </ol>
    </section>
  );
}
