import type { Metadata } from "next";
import { PosterApp } from "@/components/public/poster/PosterApp";
import { decodeParam } from "@/components/public/ui";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata({
  title: "QR poster",
  description: "Printable poster with the clinic's QR code. Patients scan it to join the queue.",
});

export default async function PosterPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <PosterApp clinicId={decodeParam(clinicId)} />;
}
