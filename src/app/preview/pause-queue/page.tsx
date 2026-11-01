"use client";

import { useState } from "react";
import type { PauseFormInput } from "@/components/reception/handlers";
import { PauseQueueModal } from "@/components/reception/modals/PauseQueueModal";
import { sharmaQueue } from "@/lib/fixtures";
import { DEFAULT_TIMEZONE, formatClock } from "@/lib/time";

/** 12:45 PM IST on the design's day, so "45 min" reads "(1:30 PM)". */
const NOW = Date.parse("2026-10-29T12:45:00+05:30");

/** Artboard 04: the pause dialog open for Dr. Anita Sharma. */
export default function PauseQueuePreview() {
  const [open, setOpen] = useState(true);
  const [confirmed, setConfirmed] = useState<PauseFormInput | null>(null);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-scrim p-4 text-white">
      {confirmed && (
        <p className="text-[16px]">
          Paused: {confirmed.reason}, back {confirmed.backAt ? formatClock(confirmed.backAt) : "not sure"}.
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-14 rounded-2xl bg-ink px-6 font-display text-[19px] font-bold text-white"
      >
        Pause queue
      </button>
      <PauseQueueModal
        open={open}
        doctorName={sharmaQueue.doctor.name}
        now={NOW}
        timezone={DEFAULT_TIMEZONE}
        onClose={() => setOpen(false)}
        onConfirm={(input) => {
          setConfirmed(input);
          setOpen(false);
        }}
        solidBackdrop
      />
    </main>
  );
}
