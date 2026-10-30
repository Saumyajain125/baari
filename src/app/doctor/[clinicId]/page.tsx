import type { Metadata } from "next";
import { DoctorPicker } from "@/components/public/doctor/DoctorPicker";
import { decodeParam } from "@/components/public/ui";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata({
  title: "Doctor's button",
  description: "Pick the doctor's room to open their Next patient button.",
});

export default async function DoctorPickerPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <DoctorPicker clinicId={decodeParam(clinicId)} />;
}
