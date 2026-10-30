"use client";

import { use } from "react";
import { previewJoinDoctors } from "@/components/public/fixtures";
import { JoinForm } from "@/components/public/patient/JoinForm";

/** Patient join form at 390×844. `?existing=1` shows the "You already have token" card, `?filled=1` a filled form. */
export default function JoinPreview({ searchParams }: { searchParams: Promise<{ existing?: string; filled?: string }> }) {
  const params = use(searchParams);
  return (
    <JoinForm
      clinicName="Sharma Family Clinic"
      dateLabel="Thu, 29 Oct"
      doctors={previewJoinDoctors}
      existing={params.existing === "1" ? { label: "A-27", href: "/preview/patient-status" } : null}
      initial={
        params.filled === "1"
          ? { doctorId: "anita", name: "Priya Meena", phone: "98290 12345", visitType: "follow_up", distance: "under_15" }
          : undefined
      }
      onSubmit={() => new Promise((resolve) => setTimeout(resolve, 1500))}
    />
  );
}
