"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon } from "@/components/icons";
import { OfflineBanner } from "@/components/reception/OfflineBanner";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import type { ClinicHeaderView, DoctorQueueView, DoctorTabView } from "@/lib/view";
import { PhoneRowActionSheet, PhoneServingSheet, type RowAction, type ServingAction } from "./PhoneActionSheet";
import { PhoneDoctorSwitcher } from "./PhoneDoctorSwitcher";
import { PhoneEditNameSheet } from "./PhoneEditNameSheet";
import { PhoneFooter, type PhoneNextState } from "./PhoneFooter";
import { PhoneHeader } from "./PhoneHeader";
import { PhoneQueueList } from "./PhoneQueueList";
import { PhoneServingCard } from "./PhoneServingCard";

export interface PhoneReceptionProps {
  header: ClinicHeaderView;
  /** More than one shows a compact switcher under the header. */
  doctors: DoctorTabView[];
  selectedDoctorId: string;
  queue: DoctorQueueView;
  offline: { offlineFor: string; pendingCount: number } | null;
  handlers: ReceptionHandlers;
  /** Opens the action sheet for this row on first render (design previews). */
  initialActionsFor?: string;
}

type Sheet = { kind: "row"; rowId: string } | { kind: "editName"; rowId: string } | { kind: "serving" };

/** Where focus goes once a sheet closes: back to the control that opened it, or to the list heading. */
type FocusReturn = "trigger" | "heading";

function nextState(queue: DoctorQueueView, offline: boolean): PhoneNextState {
  if (queue.paused) return { enabled: false, title: "Queue paused", detail: "Resume to call the next patient" };
  if (!queue.nextUp && !queue.serving) {
    return { enabled: false, title: "Next patient", detail: "Turns on when someone joins" };
  }
  if (offline) return { enabled: true, detail: "Still works offline. Call the name out loud." };
  if (queue.nextUp) {
    const { label, name, priority } = queue.nextUp;
    return { enabled: true, detail: `Calls ${label} ${name}${priority ? " (priority)" : ""}` };
  }
  return { enabled: true, detail: `Nobody waiting · saves ${queue.serving?.label} as done` };
}

function emptyServingText(queue: DoctorQueueView): string {
  if (queue.lastToken === 0) return `Nobody yet. First token today will be ${queue.nextTokenLabel}.`;
  if (queue.nextUp) return `Nobody with the doctor. Next patient calls ${queue.nextUp.label}.`;
  return "Nobody with the doctor right now.";
}

/**
 * Reception on a phone (artboard 08): one doctor at a time, the waiting list
 * in the middle and the two big buttons in the thumb zone. Row actions live
 * in a bottom sheet behind each row's ⋯ button.
 */
export function PhoneReception({
  header,
  doctors,
  selectedDoctorId,
  queue,
  offline,
  handlers,
  initialActionsFor,
}: PhoneReceptionProps) {
  const [sheet, setSheet] = useState<Sheet | null>(
    initialActionsFor ? { kind: "row", rowId: initialActionsFor } : null,
  );
  const triggerRef = useRef<HTMLElement | null>(null);
  const focusReturnRef = useRef<FocusReturn | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const doctorId = queue.doctor.id;
  const sheetRow = sheet && sheet.kind !== "serving" ? queue.rows.find((r) => r.id === sheet.rowId) : undefined;

  // The patient a sheet is about can leave from another device (or the doctor's
  // button can call them in); close the sheet instead of acting on a stale row.
  if (sheet && (sheet.kind === "serving" ? !queue.serving : !sheetRow)) setSheet(null);

  const sheetOpen = sheet !== null;
  useEffect(() => {
    if (sheetOpen) return;
    const target = focusReturnRef.current;
    focusReturnRef.current = null;
    if (!target) return;
    const trigger = triggerRef.current;
    if (target === "trigger" && trigger?.isConnected) trigger.focus();
    else headingRef.current?.focus();
  }, [sheetOpen]);

  function openSheet(next: Sheet, trigger: HTMLElement) {
    triggerRef.current = trigger;
    focusReturnRef.current = "trigger";
    setSheet(next);
  }

  function closeSheet(focus: FocusReturn = "trigger") {
    focusReturnRef.current = focus;
    setSheet(null);
  }

  function handleRowAction(rowId: string, action: RowAction) {
    switch (action) {
      case "priority":
        handlers.onPriority(rowId);
        return closeSheet();
      case "back2":
        handlers.onBack2(rowId);
        return closeSheet();
      case "skip":
        handlers.onSkip(rowId);
        return closeSheet();
      case "noShow":
        handlers.onNoShow(rowId);
        return closeSheet("heading");
      case "remove":
        handlers.onRemove(rowId);
        return closeSheet("heading");
      case "editName":
        return setSheet({ kind: "editName", rowId });
    }
  }

  function handleServingAction(action: ServingAction) {
    if (action === "callAgain") handlers.onCallAgain(doctorId);
    else handlers.onNotHere(doctorId);
    closeSheet();
  }

  const multiDoctor = doctors.length > 1;
  const empty = queue.rows.length === 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas leading-[normal] text-ink">
      {offline && <OfflineBanner offlineFor={offline.offlineFor} pendingCount={offline.pendingCount} />}

      <PhoneHeader
        header={header}
        paused={queue.paused !== null}
        doctorName={multiDoctor ? queue.doctor.name : undefined}
        onPause={() => handlers.onPause(doctorId)}
        onResume={() => handlers.onResume(doctorId)}
        onOpenTv={handlers.onOpenTv}
        onLock={handlers.onLock}
        onPrintPoster={handlers.onPrintPoster}
        onOpenSettings={handlers.onOpenSettings}
        onOpenInsights={handlers.onOpenInsights}
      />

      {multiDoctor && (
        <PhoneDoctorSwitcher doctors={doctors} selectedDoctorId={selectedDoctorId} onSelect={handlers.onSelectDoctor} />
      )}

      {queue.paused && (
        <div
          role="status"
          className="mx-4 mt-3 flex items-center gap-3 rounded-[14px] border border-amber-line bg-amber-tint px-4 py-2.5 text-amber"
        >
          <PauseIcon size={16} className="shrink-0" />
          <p className="min-w-0 flex-1 text-[13px] leading-snug">
            {/* Each sentence stays whole: a narrow phone wraps between them, never before "PM". */}
            <span className="inline-block font-bold">Queue paused · {queue.paused.reason}.</span>{" "}
            <span className="inline-block">
              {queue.paused.backAtLabel ? `Back around ${queue.paused.backAtLabel}.` : "Back time not set."}
            </span>
          </p>
        </div>
      )}

      <PhoneServingCard
        serving={queue.serving}
        placeholderLabel={`${queue.doctor.prefix}-00`}
        emptyText={emptyServingText(queue)}
        optionsOpen={sheet?.kind === "serving"}
        onOpenOptions={(trigger) => openSheet({ kind: "serving" }, trigger)}
        onCallAgain={() => handlers.onCallAgain(doctorId)}
      />

      <PhoneQueueList
        rows={queue.rows}
        freshDay={empty && !queue.serving && queue.lastToken === 0}
        openRowId={sheet?.kind === "row" ? sheet.rowId : null}
        headingRef={headingRef}
        onOpenActions={(rowId, trigger) => openSheet({ kind: "row", rowId }, trigger)}
        onPrintPoster={handlers.onPrintPoster}
        onOpenTv={handlers.onOpenTv}
      />

      <PhoneFooter
        next={nextState(queue, offline !== null)}
        onAddWalkIn={() => handlers.onAddWalkIn(doctorId)}
        onNext={() => handlers.onNext(doctorId)}
      />

      {sheet?.kind === "row" && sheetRow && (
        <PhoneRowActionSheet
          key={`row-${sheetRow.id}`}
          row={sheetRow}
          onAction={(action) => handleRowAction(sheetRow.id, action)}
          onClose={() => closeSheet()}
        />
      )}
      {sheet?.kind === "editName" && sheetRow && (
        <PhoneEditNameSheet
          key={`edit-${sheetRow.id}`}
          row={sheetRow}
          onSave={(name) => {
            handlers.onEditName(sheetRow.id, name);
            closeSheet();
          }}
          onClose={() => closeSheet()}
        />
      )}
      {sheet?.kind === "serving" && queue.serving && (
        <PhoneServingSheet serving={queue.serving} onAction={handleServingAction} onClose={() => closeSheet()} />
      )}
    </div>
  );
}
