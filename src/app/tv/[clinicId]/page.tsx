import type { Metadata } from "next";
import { TvApp } from "@/components/public/tv/TvApp";
import { decodeParam } from "@/components/public/ui";

export const metadata: Metadata = {
  title: "TV display · baari",
};

export default async function TvPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  return <TvApp clinicId={decodeParam(clinicId)} />;
}
