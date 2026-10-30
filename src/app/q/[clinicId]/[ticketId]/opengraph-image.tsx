import { decodeParam } from "@/components/public/ui";
import { OG_CACHE_FALLBACK, OG_CACHE_LIVE, OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { canDraw } from "@/lib/og/text";
import { getTicketShare } from "@/lib/server/publicDocs";

export const alt = "Live status of your clinic token on baari";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { clinicId: string; ticketId: string } }) {
  const ticket = await getTicketShare(decodeParam(params.clinicId), decodeParam(params.ticketId));
  const body = "See how many people are ahead and when it's your turn.";
  const cache = ticket ? OG_CACHE_LIVE : OG_CACHE_FALLBACK;
  const label = canDraw(ticket?.label) ? ticket.label : undefined;
  const doctorName = canDraw(ticket?.doctorName) ? ticket.doctorName : null;
  if (!canDraw(ticket?.clinicName)) return renderOgCard({ title: "Your clinic token", accent: doctorName, body, label }, cache);
  return renderOgCard({ eyebrow: "Your token at", title: ticket.clinicName, accent: doctorName, body, label }, cache);
}
