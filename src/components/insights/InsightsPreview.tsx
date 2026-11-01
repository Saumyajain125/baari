"use client";

import { useMemo, useState } from "react";
import { DEFAULT_RANGE, type InsightsRangeKey } from "@/lib/insights";
import { DEMO_DOCTORS, DEMO_TODAY, demoTickets } from "./fixtures";
import { InsightsView } from "./InsightsView";

/** Dev preview of the insights screen with fixture tickets (no Firebase). */
export function InsightsPreview({ state, singleDoctor }: { state: "ready" | "loading" | "empty"; singleDoctor: boolean }) {
  const doctors = singleDoctor ? DEMO_DOCTORS.slice(0, 1) : DEMO_DOCTORS;
  const all = useMemo(() => demoTickets(), []);
  const tickets = useMemo(
    () => (state === "empty" ? [] : all.filter((t) => doctors.some((d) => d.id === t.doctorId))),
    [all, doctors, state],
  );
  const [doctorId, setDoctorId] = useState<string | null>(singleDoctor ? doctors[0].id : null);
  const [rangeKey, setRangeKey] = useState<InsightsRangeKey>(DEFAULT_RANGE);

  return (
    <InsightsView
      clinicName="Sharma Family Clinic"
      timezone="Asia/Kolkata"
      today={DEMO_TODAY}
      doctors={doctors}
      doctorId={doctorId}
      rangeKey={rangeKey}
      tickets={tickets}
      phase={state === "loading" ? "loading" : "ready"}
      syncNote={null}
      error={null}
      back={{ href: "/preview/laptop", label: "Back to reception", shortLabel: "Reception" }}
      onDoctorChange={setDoctorId}
      onRangeChange={setRangeKey}
    />
  );
}
