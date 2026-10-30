"use client";

import { useId, type ComponentType } from "react";
import {
  ArrowDownIcon,
  BellIcon,
  CloseIcon,
  EditIcon,
  NoShowIcon,
  PriorityIcon,
  SkipIcon,
  UndoIcon,
} from "@/components/icons";
import type { QueueRowView, ServingView } from "@/lib/view";
import { BottomSheet } from "./BottomSheet";
import { rowMeta } from "./PhoneQueueRow";

export type RowAction = "priority" | "back2" | "skip" | "noShow" | "remove" | "editName";
export type ServingAction = "callAgain" | "notHere";

interface SheetItem<A extends string> {
  action: A;
  label: string;
  hint?: string;
  Icon: ComponentType<{ size?: number }>;
  danger?: boolean;
}

function rowItems(row: QueueRowView): SheetItem<RowAction>[] {
  return [
    row.priority
      ? { action: "priority", label: "Remove priority", hint: "back in line", Icon: PriorityIcon }
      : { action: "priority", label: "Priority", hint: "goes to the front", Icon: PriorityIcon },
    { action: "back2", label: "Back 2", hint: "move back 2 places", Icon: ArrowDownIcon },
    { action: "skip", label: "Skip", hint: "send to the end", Icon: SkipIcon },
    { action: "noShow", label: "No-show", hint: "didn't turn up", Icon: NoShowIcon },
    { action: "remove", label: "Remove", hint: "take off the list", Icon: CloseIcon, danger: true },
    { action: "editName", label: "Edit name", Icon: EditIcon },
  ];
}

const SERVING_ITEMS: SheetItem<ServingAction>[] = [
  { action: "callAgain", label: "Call again", hint: "announce once more", Icon: BellIcon },
  { action: "notHere", label: "Not here? Move back 2", Icon: UndoIcon },
];

interface ActionSheetProps<A extends string> {
  token: string;
  tokenClassName: string;
  title: string;
  meta: string;
  items: SheetItem<A>[];
  onAction(action: A): void;
  onClose(): void;
}

/** Sheet layout shared by the row and serving sheets: token header, 56px action rows, Cancel. */
function ActionSheet<A extends string>({ token, tokenClassName, title, meta, items, onAction, onClose }: ActionSheetProps<A>) {
  const titleId = useId();
  const metaId = useId();

  return (
    <BottomSheet labelledBy={titleId} describedBy={metaId} onClose={onClose}>
      <div className="flex items-center gap-3 border-b border-divider px-5 pt-3 pb-4">
        <span aria-hidden="true" className={`font-display text-[28px] leading-none font-extrabold ${tokenClassName}`}>
          {token}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={titleId} className="truncate text-[16px] font-semibold">
            <span className="sr-only">{token}, </span>
            {title}
          </h2>
          <p id={metaId} className="truncate text-[12px] text-muted">
            {meta}
          </p>
        </div>
      </div>

      <ul className="py-1">
        {items.map(({ action, label, hint, Icon, danger }) => (
          <li key={action}>
            <button
              type="button"
              onClick={() => onAction(action)}
              className={`flex h-14 w-full items-center gap-4 px-5 text-left hover:bg-hover focus-visible:-outline-offset-3 active:bg-subtle ${
                danger ? "text-danger" : "text-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
                  danger ? "bg-danger-tint" : "bg-subtle"
                }`}
              >
                <Icon size={20} />
              </span>
              <span className="shrink-0 text-[16px] font-semibold whitespace-nowrap">{label}</span>{" "}
              {hint && <span className="ml-auto min-w-0 truncate pl-3 text-[13px] text-muted">{hint}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="px-4 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-14 w-full rounded-[16px] border border-line-strong bg-surface text-[16px] font-semibold text-ink hover:bg-hover"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}

export interface PhoneRowActionSheetProps {
  row: QueueRowView;
  onAction(action: RowAction): void;
  onClose(): void;
}

/** ⋯ on a waiting row: Priority, Back 2, Skip, No-show, Remove, Edit name, Cancel. */
export function PhoneRowActionSheet({ row, onAction, onClose }: PhoneRowActionSheetProps) {
  return (
    <ActionSheet
      token={row.label}
      tokenClassName={row.priority ? "text-danger" : "text-ink"}
      title={row.displayName}
      meta={rowMeta(row)}
      items={rowItems(row)}
      onAction={onAction}
      onClose={onClose}
    />
  );
}

export interface PhoneServingSheetProps {
  serving: ServingView;
  onAction(action: ServingAction): void;
  onClose(): void;
}

/** Tap on the "With doctor" card: Call again, or "Not here? Move back 2" when the patient didn't come in. */
export function PhoneServingSheet({ serving, onAction, onClose }: PhoneServingSheetProps) {
  return (
    <ActionSheet
      token={serving.label}
      tokenClassName="text-teal"
      title={serving.name}
      meta={`With doctor · ${serving.inRoom}`}
      items={SERVING_ITEMS}
      onAction={onAction}
      onClose={onClose}
    />
  );
}
