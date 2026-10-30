import type { Metadata } from "next";
import { JoinApp } from "@/components/public/patient/JoinApp";
import { decodeParam } from "@/components/public/ui";
import { getClinicName } from "@/lib/server/publicDocs";
import { joinShareText, shareMetadata } from "@/lib/share";

type Params = Promise<{ clinicId: string }>;

/** Names the clinic in the tab and in the WhatsApp preview of the QR link. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { clinicId } = await params;
  return shareMetadata(joinShareText(await getClinicName(decodeParam(clinicId))), { ownImage: true });
}

export default async function JoinPage({ params }: { params: Params }) {
  const { clinicId } = await params;
  return <JoinApp clinicId={decodeParam(clinicId)} />;
}
