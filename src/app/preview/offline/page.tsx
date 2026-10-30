"use client";

import { UndoToast } from "@/components/reception/UndoToast";
import { TabletReception } from "@/components/reception/tablet/TabletReception";
import { previewHandlers } from "@/components/reception/tablet/previewHandlers";
import { designHeader, offlineQueue, vermaQueue } from "@/lib/fixtures";

/** Artboard 07 (1180×820): tablet reception offline, with an undo toast. */
export default function OfflinePreview() {
  return (
    <>
      <TabletReception
        header={designHeader}
        doctors={[offlineQueue.doctor, vermaQueue.doctor]}
        selectedDoctorId={offlineQueue.doctor.id}
        queue={offlineQueue}
        offline={{ offlineFor: "1:24", pendingCount: 2 }}
        handlers={previewHandlers}
      />
      <UndoToast message="A-21 moved back 2 places" secondsLeft={4} onUndo={previewHandlers.onUndo} />
    </>
  );
}
