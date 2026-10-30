import { previewJoinUrl } from "@/components/public/fixtures";
import { QrPoster } from "@/components/public/poster/QrPoster";

/** A4 QR poster with design data. `?name=` tries another clinic name (long names wrap). */
export default async function PosterPreview({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;
  return <QrPoster clinicName={name?.trim() || "Sharma Family Clinic"} joinUrl={previewJoinUrl} />;
}
