"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { FirebaseMissing, PublicLoading, PublicMessage, statusPath } from "@/components/public/ui";
import { buildJoinDoctorOption } from "@/components/public/views";
import { firebaseConfigured } from "@/lib/firebase";
import { useClinic, useDoctors, useNow, usePublicTickets, useQueueDays, useTicket, useToday } from "@/lib/hooks";
import { joinQueue, newTicketId, PatientFacingError, rememberTicket } from "@/lib/queue/patient";
import { DEFAULT_TIMEZONE, dateKey, formatDayShort } from "@/lib/time";
import { JoinForm, type JoinFormValues } from "./JoinForm";
import { useRememberedTicket } from "./usePatientStore";

/** /q/[clinicId]: the page the QR poster and TV code open. */
export function JoinApp({ clinicId }: { clinicId: string }) {
  if (!firebaseConfigured) return <FirebaseMissing />;
  return <JoinLive clinicId={clinicId} />;
}

function JoinLive({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const clinicSub = useClinic(clinicId);
  const clinic = clinicSub.data;
  const timezone = clinic?.timezone ?? DEFAULT_TIMEZONE;
  const today = useToday(timezone);
  const now = useNow(30_000);
  const doctorsSub = useDoctors(clinicId);
  const queueDays = useQueueDays(clinicId, today);
  const tickets = usePublicTickets(clinicId, today);
  // The ticket id of the join being tried, kept across retries until one succeeds.
  const attempt = useRef<{ ticketId: string; doctorId: string; date: string } | null>(null);

  // Only offer the remembered token while it's still in today's queue.
  const remembered = useRememberedTicket(clinicId, today);
  const rememberedTicket = useTicket(clinicId, remembered?.ticketId).data;
  const existing =
    remembered && rememberedTicket && (rememberedTicket.status === "waiting" || rememberedTicket.status === "serving")
      ? { label: remembered.label, href: statusPath(clinicId, remembered.ticketId) }
      : null;

  const doctors = useMemo(() => doctorsSub.data.filter((d) => d.active), [doctorsSub.data]);

  if (clinicSub.loading || doctorsSub.loading) return <PublicLoading />;
  if (!clinic) {
    return (
      <PublicMessage title="We couldn't find this clinic">
        The link may be incomplete. Scan the QR code on the poster again, or ask at reception.
      </PublicMessage>
    );
  }
  if (doctors.length === 0) {
    return (
      <PublicMessage title="The queue isn't open yet">
        {clinic.name} hasn&apos;t set up its doctors yet. Please ask at reception.
      </PublicMessage>
    );
  }

  const options = doctors.map((d) => buildJoinDoctorOption(d, tickets.data, queueDays.data[d.id], clinic, now));

  async function join(values: JoinFormValues) {
    const doctor = doctors.find((d) => d.id === values.doctorId);
    if (!doctor || !clinic) {
      throw new PatientFacingError("That doctor isn't taking patients right now. Please choose another one.");
    }
    // Taken at submit time so a page left open past midnight joins the right day.
    const date = dateKey(Date.now(), timezone);
    // A retry after the SDK gave up may follow a commit that did land: the same
    // id finds that token instead of taking a second one. Another doctor or day
    // is a different join.
    let current = attempt.current;
    if (!current || current.doctorId !== doctor.id || current.date !== date) {
      current = attempt.current = { ticketId: newTicketId(clinicId), doctorId: doctor.id, date };
    }
    const joined = await joinQueue(
      clinicId,
      date,
      doctor,
      { name: values.name, phone: values.phone, visitType: values.visitType, distance: values.distance },
      current.ticketId,
    ).catch((err: unknown) => {
      // Refused before anything was written, so the next try can start afresh.
      if (err instanceof PatientFacingError) attempt.current = null;
      throw err;
    });
    attempt.current = null;
    rememberTicket(clinicId, { ticketId: joined.ticketId, label: joined.label, doctorId: doctor.id, date });
    router.replace(statusPath(clinicId, joined.ticketId));
  }

  return (
    <JoinForm
      clinicName={clinic.name}
      dateLabel={formatDayShort(now, timezone)}
      doctors={options}
      existing={existing}
      onSubmit={join}
    />
  );
}
