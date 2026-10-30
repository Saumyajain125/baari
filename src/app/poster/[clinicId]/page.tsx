import type { Metadata } from "next";
import { PosterApp } from "@/components/public/poster/PosterApp";
import { decodeParam } from "@/components/public/ui";

export const metadata: Metadata = {
  title: "QR poster · baari",
};

export default async function PosterPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <PosterApp clinicId={decodeParam(clinicId)} />;
}
