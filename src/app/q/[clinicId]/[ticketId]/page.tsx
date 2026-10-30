import type { Metadata } from "next";
import { PatientStatusApp } from "@/components/public/patient/PatientStatusApp";
import { decodeParam } from "@/components/public/ui";
import { getTicketShare } from "@/lib/server/publicDocs";
import { shareMetadata, ticketShareText } from "@/lib/share";

type Params = Promise<{ clinicId: string; ticketId: string }>;

/** Names the token and clinic in the tab and in link previews. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { clinicId, ticketId } = await params;
  const ticket = await getTicketShare(decodeParam(clinicId), decodeParam(ticketId));
  return shareMetadata(ticketShareText(ticket), { ownImage: true });
}

export default async function PatientStatusPage({ params }: { params: Params }) {
  const { clinicId, ticketId } = await params;
  return <PatientStatusApp clinicId={decodeParam(clinicId)} ticketId={decodeParam(ticketId)} />;
}
