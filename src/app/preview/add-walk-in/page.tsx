"use client";

import { use, useState } from "react";
import type { IssuedSlip, WalkInFormInput } from "@/components/reception/handlers";
import { AddWalkInModal } from "@/components/reception/modals/AddWalkInModal";
import { designDoctors, designHeader } from "@/lib/fixtures";
import { tokenLabel } from "@/lib/queue/logic";
import { formatSlipStamp } from "@/lib/time";

const doctors = designDoctors.map((q) => q.doctor);

/** Artboard 02's slip. */
const designSlip: IssuedSlip = {
  label: "A-25",
  clinicName: designHeader.clinicName,
  doctorName: "Dr. Anita Sharma",
  room: "Room 2",
  ahead: 7,
  etaText: "approx 35 to 45 min",
  issuedAtText: "29-10-2026 · 10:51 AM",
  offline: false,
};

/**
 * Artboard 02: the dialog open with "Kamla Bai" typed for Dr. Anita Sharma
 * and the issued slip beside it. `?state=form` opens the plain empty form
 * instead. Submitting works against fake data; a name containing "fail"
 * rejects, to exercise the error state.
 */
export default function AddWalkInPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = use(searchParams);
  const [open, setOpen] = useState(true);
  const [nextToken, setNextToken] = useState<Record<string, number>>({ anita: 25, rohit: 13 });

  async function issue(input: WalkInFormInput): Promise<IssuedSlip> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (/fail/i.test(input.name)) throw new Error("Simulated failure");
    const doctor = doctors.find((d) => d.id === input.doctorId) ?? doctors[0];
    const token = nextToken[doctor.id];
    setNextToken((t) => ({ ...t, [doctor.id]: token + 1 }));
    return {
      ...designSlip,
      label: tokenLabel(doctor.prefix, token),
      doctorName: doctor.name,
      room: doctor.room,
      ahead: doctor.waitingCount,
      issuedAtText: formatSlipStamp(Date.now()),
    };
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-scrim">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-14 rounded-2xl bg-teal px-6 font-display text-[19px] font-bold text-white"
      >
        Add walk-in
      </button>
      <AddWalkInModal
        open={open}
        doctors={doctors}
        defaultDoctorId="anita"
        nextTokenLabelFor={(id) => {
          const doctor = doctors.find((d) => d.id === id);
          return doctor ? tokenLabel(doctor.prefix, nextToken[id]) : "";
        }}
        onClose={() => setOpen(false)}
        onSubmit={issue}
        solidBackdrop
        preview={state === "form" ? undefined : { draft: { name: "Kamla Bai" }, slip: designSlip }}
      />
    </main>
  );
}
