import type { Metadata } from "next";
import { PatientStatusApp } from "@/components/public/patient/PatientStatusApp";
import { decodeParam } from "@/components/public/ui";

export const metadata: Metadata = {
  title: "Your token · baari",
};

export default async function PatientStatusPage({
  params,
}: {
  params: Promise<{ clinicId: string; ticketId: string }>;
}) {
  const { clinicId, ticketId } = await params;
  return <PatientStatusApp clinicId={decodeParam(clinicId)} ticketId={decodeParam(ticketId)} />;
}
