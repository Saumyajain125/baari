"use client";

import { UndoIcon } from "@/components/icons";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import { OfflineBanner } from "@/components/reception/OfflineBanner";
import type { ClinicHeaderView, DoctorQueueView, DoctorTabView } from "@/lib/view";
import { DeskStatusRow } from "./DeskStatusRow";
import { DoctorTabs } from "./DoctorTabs";
import { EmptyQueuePanel } from "./EmptyQueuePanel";
import { NextPatientButton } from "./NextPatientButton";
import { ServingCard } from "./ServingCard";
import { TabletHeader } from "./TabletHeader";
import { UpNextPanel } from "./UpNextPanel";

export interface TabletReceptionProps {
  header: ClinicHeaderView;
  /** Tab bar; shown even for one doctor because it carries "N waiting". */
  doctors: DoctorTabView[];
  selectedDoctorId: string;
  /** The selected doctor's queue. */
  queue: DoctorQueueView;
  /** null = online. */
  offline: { offlineFor: string; pendingCount: number } | null;
  handlers: ReceptionHandlers;
}

/**
 * Reception desk for tablets (768–1279px), artboards 01, 03 and 07: one doctor
 * at a time, big Next button on the left, the waiting list on the right.
 * Presentational only; every tap goes out through `handlers`.
 */
export function TabletReception({ header, doctors, selectedDoctorId, queue, offline, handlers }: TabletReceptionProps) {
  const doctorId = queue.doctor.id;
  const { serving, rows, paused } = queue;
  // Nobody in the room and nobody waiting: the artboard 03 layout.
  const idle = !serving && rows.length === 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas leading-[normal] text-ink">
      {offline && <OfflineBanner offlineFor={offline.offlineFor} pendingCount={offline.pendingCount} />}
      <TabletHeader
        header={header}
        onAddWalkIn={() => handlers.onAddWalkIn(doctorId)}
        onOpenTv={handlers.onOpenTv}
        onLock={handlers.onLock}
        onPrintPoster={handlers.onPrintPoster}
        onOpenSettings={handlers.onOpenSettings}
        onOpenInsights={handlers.onOpenInsights}
      />
      <DoctorTabs
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onSelect={handlers.onSelectDoctor}
        queueControl={paused ? "resume" : idle ? null : "pause"}
        onPause={() => handlers.onPause(doctorId)}
        onResume={() => handlers.onResume(doctorId)}
      />
      <main className="flex min-h-0 flex-1 gap-4 px-5 pt-[14px] pb-5">
        <section
          aria-label="Current patient"
          className="flex w-[320px] flex-none flex-col gap-3 overflow-y-auto min-[1100px]:w-[360px]"
        >
          <ServingCard queue={queue} />
          {/* Hidden while paused: "Not here" also calls the next patient. */}
          {serving && !paused && (
            <button
              type="button"
              onClick={() => handlers.onNotHere(doctorId)}
              // 44px hit area that fills the gap between the card and the Next button, adding only ~32px to the artboard's column.
              className="-my-3 flex h-11 flex-none items-center gap-[6px] self-end rounded-[10px] px-2 text-[13px] font-medium text-muted hover:text-ink"
            >
              <UndoIcon size={14} />
              Not here? Move back 2
            </button>
          )}
          <NextPatientButton queue={queue} offline={offline != null} onNext={() => handlers.onNext(doctorId)} />
          {!idle && (
            <DeskStatusRow
              canCallAgain={serving != null}
              doctorButtonLinked={queue.doctorButtonLinked}
              onCallAgain={() => handlers.onCallAgain(doctorId)}
            />
          )}
        </section>
        {rows.length > 0 ? (
          <UpNextPanel count={queue.doctor.waitingCount} rows={rows} handlers={handlers} />
        ) : (
          <EmptyQueuePanel
            freshDay={!serving && queue.lastToken === 0}
            onPrintPoster={handlers.onPrintPoster}
            onOpenTv={handlers.onOpenTv}
          />
        )}
      </main>
    </div>
  );
}
