import type { Metadata } from "next";
import { DoctorPicker } from "@/components/public/doctor/DoctorPicker";
import { decodeParam } from "@/components/public/ui";

export const metadata: Metadata = {
  title: "Doctor's button · baari",
};

export default async function DoctorPickerPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <DoctorPicker clinicId={decodeParam(clinicId)} />;
}
