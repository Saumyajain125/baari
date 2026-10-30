import { PhonePreview } from "@/components/reception/phone/PhonePreview";

/** Artboard 08 with the row action sheet open for A-33. Takes the same ?state= as /preview/phone. */
export default async function PhoneSheetPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const { state } = await searchParams;
  return <PhonePreview state={typeof state === "string" ? state : undefined} sheetFor="A-33" />;
}
