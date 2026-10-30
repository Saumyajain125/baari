"use client";

import { useJoinUrl } from "@/components/public/hooks";
import { FirebaseMissing, PublicLoading, PublicMessage } from "@/components/public/ui";
import { firebaseConfigured } from "@/lib/firebase";
import { useClinic } from "@/lib/hooks";
import { QrPoster } from "./QrPoster";

/** /poster/[clinicId]: reads only the public clinic name, so it prints from any browser. */
export function PosterApp({ clinicId }: { clinicId: string }) {
  if (!firebaseConfigured) return <FirebaseMissing />;
  return <PosterLive clinicId={clinicId} />;
}

function PosterLive({ clinicId }: { clinicId: string }) {
  const clinicSub = useClinic(clinicId);
  const joinUrl = useJoinUrl(clinicId);

  if (clinicSub.loading) return <PublicLoading label="Preparing your poster…" />;
  if (!clinicSub.data) {
    return (
      <PublicMessage title="We couldn't find this clinic">
        Open the poster from the reception screen (Print QR poster) so it carries your clinic&apos;s link.
      </PublicMessage>
    );
  }
  return <QrPoster clinicName={clinicSub.data.name} joinUrl={joinUrl} />;
}
