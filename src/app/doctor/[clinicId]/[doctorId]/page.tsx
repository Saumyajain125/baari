import type { Metadata } from "next";
import { ClinicLockGate } from "@/components/auth/ReceptionLockGate";
import { DoctorApp } from "@/components/public/doctor/DoctorApp";
import { decodeParam } from "@/components/public/ui";

export const metadata: Metadata = {
  title: "Doctor's button · baari",
};

export default async function DoctorButtonPage({
  params,
}: {
  params: Promise<{ clinicId: string; doctorId: string }>;
}) {
  const { clinicId, doctorId } = await params;
  // A locked desk device must not reach the queue (patient names, a working Next) by typing this URL.
  return (
    <ClinicLockGate>
      <DoctorApp clinicId={decodeParam(clinicId)} doctorId={decodeParam(doctorId)} />
    </ClinicLockGate>
  );
}
