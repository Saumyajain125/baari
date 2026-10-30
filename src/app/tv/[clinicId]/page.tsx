import type { Metadata } from "next";
import { TvApp } from "@/components/public/tv/TvApp";
import { decodeParam } from "@/components/public/ui";
import { shareMetadata } from "@/lib/share";

export const metadata: Metadata = shareMetadata({
  title: "TV display",
  description: "Now-serving screen for the clinic's waiting room, with a QR code to join the queue.",
});

export default async function TvPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <TvApp clinicId={decodeParam(clinicId)} />;
}
