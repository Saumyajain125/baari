import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { SITE_DESCRIPTION } from "@/lib/share";

export const alt = "baari: walk-in queue for clinics";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({ title: "Walk-in queue for clinics", body: SITE_DESCRIPTION });
}
