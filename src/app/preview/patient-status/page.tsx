"use client";

import { use } from "react";
import { previewPatient } from "@/components/public/fixtures";
import { PatientStatus } from "@/components/public/patient/PatientStatus";

/**
 * Patient status at 390×844. `?state=` turn | paused | no-reply | next | left | done | watch
 * shows the other screens.
 */
export default function PatientStatusPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = "waiting" } = use(searchParams);
  return (
    <PatientStatus
      view={previewPatient(state)}
      joinHref="/preview/join"
      onChangeDistance={() => new Promise((resolve) => setTimeout(resolve, 600))}
      onLeave={() => Promise.resolve()}
    />
  );
}
