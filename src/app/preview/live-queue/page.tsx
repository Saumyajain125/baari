"use client";

import { TabletReception } from "@/components/reception/tablet/TabletReception";
import { previewHandlers } from "@/components/reception/tablet/previewHandlers";
import { designDoctors, designHeader, sharmaQueue } from "@/lib/fixtures";

/** Artboard 01 (1180×820): tablet reception with a busy queue. */
export default function LiveQueuePreview() {
  return (
    <TabletReception
      header={designHeader}
      doctors={designDoctors.map((q) => q.doctor)}
      selectedDoctorId={sharmaQueue.doctor.id}
      queue={sharmaQueue}
      offline={null}
      handlers={previewHandlers}
    />
  );
}
