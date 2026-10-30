import type { Metadata } from "next";
import { JoinApp } from "@/components/public/patient/JoinApp";
import { decodeParam } from "@/components/public/ui";

export const metadata: Metadata = {
  title: "Join the queue · baari",
};

export default async function JoinPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <JoinApp clinicId={decodeParam(clinicId)} />;
}
