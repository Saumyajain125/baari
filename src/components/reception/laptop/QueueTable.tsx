"use client";

import type { ReactNode } from "react";
import { ArrowDownIcon, PriorityIcon } from "@/components/icons";
import { LogoMark } from "@/components/brand/Logo";
import type { QueueRowView } from "@/lib/view";
import type { VisitType } from "@/lib/types";
import { RowMoreMenu } from "./RowMoreMenu";

/**
 * Token / Patient / Type / Distance / Waited / Actions. The artboard's widths
 * apply from a 660px-wide table up; narrower tables (a 1280px laptop) shrink
 * the fixed columns to their content ("A-26", "Follow-up", "Distance",
 * "38 min", three 40px buttons) so the patient column keeps room for a full
 * "Ramesh Kumar 98281 •••34". On wide tables (1920px, or one doctor at full
 * width) the patient column stops at 320px and the slack goes before the
 * action buttons, so type, distance and wait stay next to the name. At the
 * artboard size the tracks resolve to exactly 64 / 1fr / 96 / 90 / 64 / 136.
 */
const COLUMNS =
  "grid grid-cols-[48px_minmax(0,1fr)_64px_58px_52px_120px] gap-2 px-4 @min-[660px]:grid-cols-[64px_minmax(0,320px)_96px_90px_64px_minmax(136px,1fr)]";

const TYPE_COLOR: Record<VisitType, string> = {
  new: "text-teal-dark",
  follow_up: "text-indigo",
  emergency: "text-danger",
};

const ROW_BG: Record<QueueRowView["tone"], string> = {
  priority: "bg-danger-tint",
  noReply: "bg-warn-tint",
  normal: "bg-surface",
};

const ICON_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-[10px] bg-transparent text-muted hover:bg-hover hover:text-ink";

export interface RowActions {
  onPriority(ticketId: string): void;
  onBack2(ticketId: string): void;
  onSkip(ticketId: string): void;
  onNoShow(ticketId: string): void;
  onRemove(ticketId: string): void;
  onEditName(row: QueueRowView, trigger: HTMLButtonElement): void;
}

export type QueueEmptyState = {
  title: string;
  body: string;
  /** Buttons under the copy, e.g. Print QR poster / Open TV display before the first patient. */
  actions?: { label: string; icon: ReactNode; onClick(): void }[];
};

export function QueueTable({
  doctorName,
  rows,
  empty,
  actions,
}: {
  doctorName: string;
  rows: QueueRowView[];
  /** Shown instead of rows when `rows` is empty. */
  empty: QueueEmptyState;
  actions: RowActions;
}) {
  return (
    <div
      role="table"
      aria-label={`${doctorName}: up next`}
      className="@container flex min-h-0 flex-auto flex-col overflow-hidden rounded-[16px] border border-line bg-surface"
    >
      <div role="rowgroup">
        <div
          role="row"
          className={`${COLUMNS} border-b border-line py-2.5 text-[12px] font-semibold text-muted`}
        >
          <span role="columnheader">Token</span>
          <span role="columnheader">Patient</span>
          <span role="columnheader">Type</span>
          <span role="columnheader">Distance</span>
          <span role="columnheader">Waited</span>
          <span role="columnheader" className="text-right">
            Actions
          </span>
        </div>
      </div>
      {rows.length > 0 ? (
        <div role="rowgroup" className="min-h-0 flex-auto overflow-y-auto overscroll-contain">
          {rows.map((r) => (
            <QueueRow key={r.id} row={r} actions={actions} />
          ))}
        </div>
      ) : (
        <EmptyRows {...empty} />
      )}
    </div>
  );
}

function QueueRow({ row, actions }: { row: QueueRowView; actions: RowActions }) {
  const phone = row.phoneMasked ?? (row.isWalkIn ? "walk-in" : "no phone");
  const noReply = row.noReplyElapsed ? `Called, no reply ${row.noReplyElapsed}` : null;

  return (
    <div
      role="row"
      title={noReply ?? undefined}
      className={`${COLUMNS} items-center border-b border-divider py-1.5 text-[14px] ${ROW_BG[row.tone]}`}
    >
      <span
        role="cell"
        className={`font-display text-[20px] font-extrabold ${row.priority ? "text-danger" : "text-ink"}`}
      >
        {row.label}
      </span>
      <span role="cell" className="truncate">
        <strong className="font-semibold">{row.name}</strong>{" "}
        <span className="text-[12px] text-muted">{phone}</span>
        {row.priority && <span className="sr-only">, priority</span>}
        {noReply && <span className="sr-only">, {noReply}</span>}
      </span>
      <span role="cell" className={`text-[12px] font-semibold ${TYPE_COLOR[row.visitType]}`}>
        {row.visitTypeLabel}
      </span>
      <span role="cell" className="text-[12px]">
        {row.distanceLabelCompact}
      </span>
      <span role="cell" className="flex flex-col">
        <span className="font-semibold">{row.waitedLabel}</span>
        {row.pending && (
          <span className="whitespace-nowrap text-[12px] font-semibold leading-tight text-warn">Not synced</span>
        )}
      </span>
      <span role="cell" className="flex justify-end">
        <button
          type="button"
          aria-label={`Priority for ${row.label}`}
          aria-pressed={row.priority}
          onClick={() => actions.onPriority(row.id)}
          className={`${ICON_BUTTON} ${row.priority ? "text-danger hover:text-danger" : ""}`}
        >
          <PriorityIcon size={18} />
        </button>
        <button
          type="button"
          aria-label={`Move back 2: ${row.label}`}
          onClick={() => actions.onBack2(row.id)}
          className={ICON_BUTTON}
        >
          <ArrowDownIcon size={18} />
        </button>
        <RowMoreMenu
          label={row.label}
          buttonClassName={ICON_BUTTON}
          onSkip={() => actions.onSkip(row.id)}
          onNoShow={() => actions.onNoShow(row.id)}
          onRemove={() => actions.onRemove(row.id)}
          onEditName={(trigger) => actions.onEditName(row, trigger)}
        />
      </span>
    </div>
  );
}

function EmptyRows({ title, body, actions }: QueueEmptyState) {
  return (
    <div role="rowgroup" className="flex flex-auto">
      <div role="row" className="flex flex-auto">
        <div
          role="cell"
          aria-colspan={6}
          className="flex flex-auto flex-col items-center justify-center gap-3 px-8 py-10 text-center"
        >
          <LogoMark variant="empty" size={72} />
          <div className="flex max-w-[340px] flex-col gap-1.5">
            <p className="m-0 font-display text-[20px] font-bold leading-[1.3]">{title}</p>
            <p className="m-0 text-[14px] leading-[1.5] text-muted">{body}</p>
          </div>
          {actions && actions.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-2.5">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className="flex h-11 items-center gap-2 rounded-[12px] border border-line-strong bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-hover"
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
