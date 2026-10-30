"use client";

import { TabletReception } from "@/components/reception/tablet/TabletReception";
import { previewHandlers } from "@/components/reception/tablet/previewHandlers";
import { designHeaderEmpty, startOfDayQueues } from "@/lib/fixtures";

/** Artboard 03 (1180×820): tablet reception before the first token of the day. */
export default function StartOfDayPreview() {
  const queue = startOfDayQueues[0];
  return (
    <TabletReception
      header={designHeaderEmpty}
      doctors={startOfDayQueues.map((q) => q.doctor)}
      selectedDoctorId={queue.doctor.id}
      queue={queue}
      offline={null}
      handlers={previewHandlers}
    />
  );
}
