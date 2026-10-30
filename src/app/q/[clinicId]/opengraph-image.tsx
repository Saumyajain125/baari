import { decodeParam } from "@/components/public/ui";
import { OG_CACHE_FALLBACK, OG_CACHE_LIVE, OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { canDraw } from "@/lib/og/text";
import { getClinicName } from "@/lib/server/publicDocs";

export const alt = "Join the clinic queue on baari";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { clinicId: string } }) {
  const clinicName = await getClinicName(decodeParam(params.clinicId));
  const body = "Get your token on your phone and see live how many people are ahead. No app needed.";
  const cache = clinicName ? OG_CACHE_LIVE : OG_CACHE_FALLBACK;
  if (!canDraw(clinicName)) return renderOgCard({ title: "Join the clinic queue", body }, cache);
  return renderOgCard({ eyebrow: "Join the queue at", title: clinicName, body }, cache);
}
