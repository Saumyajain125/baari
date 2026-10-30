import { PhonePreview } from "@/components/reception/phone/PhonePreview";

/**
 * Artboard 08 (390×844): reception on a phone, one-doctor clinic. Extra
 * states: ?state=paused | fresh | idle | offline | doctors | long.
 */
export default async function PhonePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const { state } = await searchParams;
  return <PhonePreview state={typeof state === "string" ? state : undefined} />;
}
