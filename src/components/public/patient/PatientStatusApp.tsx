"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FirebaseMissing, joinPath, PublicLoading, PublicMessage } from "@/components/public/ui";
import { buildPatientStatus } from "@/components/public/views";
import { firebaseConfigured } from "@/lib/firebase";
import {
  useAuthUser,
  useClinic,
  useDoctors,
  useNow,
  usePublicTickets,
  useQueueDays,
  useTicket,
  useToday,
} from "@/lib/hooks";
import { forgetTicket, leaveQueue, updateDistance } from "@/lib/queue/patient";
import { DEFAULT_TIMEZONE, formatClock, formatDayShort } from "@/lib/time";
import type { Distance } from "@/lib/types";
import { PatientStatus } from "./PatientStatus";
import { usePatientPrivate } from "./usePatientStore";

/** /q/[clinicId]/[ticketId]: live place in the queue for one token. */
export function PatientStatusApp({ clinicId, ticketId }: { clinicId: string; ticketId: string }) {
  if (!firebaseConfigured) return <FirebaseMissing />;
  return <PatientStatusLive clinicId={clinicId} ticketId={ticketId} />;
}

function PatientStatusLive({ clinicId, ticketId }: { clinicId: string; ticketId: string }) {
  const clinicSub = useClinic(clinicId);
  const clinic = clinicSub.data;
  const timezone = clinic?.timezone ?? DEFAULT_TIMEZONE;
  const today = useToday(timezone);
  // ETAs count down through a break or a later start.
  const now = useNow(30_000);
  const ticketSub = useTicket(clinicId, ticketId);
  const ticket = ticketSub.data;
  const doctorsSub = useDoctors(clinicId);
  const queueDays = useQueueDays(clinicId, today);
  const tickets = usePublicTickets(clinicId, today);
  const auth = useAuthUser();
  const priv = usePatientPrivate(clinicId, ticketId, auth.user?.uid ?? null);

  const serving = ticket?.status === "serving" && ticket.date === today;
  const turnKey = useTurnAlert(ticketId, ticketSub.loading ? undefined : serving ? ticket.lastCallAt : null, ticket?.label ?? "");

  if (clinicSub.loading || ticketSub.loading || doctorsSub.loading || auth.loading) return <PublicLoading />;
  if (!clinic || !ticket) {
    return (
      <PublicMessage
        title="We couldn't find this token"
        action={
          <Link href={joinPath(clinicId)} className="font-semibold">
            Join the queue
          </Link>
        }
      >
        The link may be incomplete, or the token is from another clinic.
      </PublicMessage>
    );
  }

  const doctor = doctorsSub.data.find((d) => d.id === ticket.doctorId) ?? {
    id: ticket.doctorId,
    name: "the doctor",
    room: "",
    startsAt: null,
  };
  const queue = queueDays.data[ticket.doctorId];
  const canEdit = auth.user != null && priv.data?.patientUid === auth.user.uid;

  const view = buildPatientStatus({
    clinic,
    doctor,
    ticket,
    tickets: tickets.loading ? null : tickets.data,
    queue: ticket.date === today ? queue : undefined,
    today,
    dateLabel: formatDayShort(ticket.createdAt || Date.now(), timezone),
    name: priv.data?.name ?? null,
    canEdit,
    backAtLabel: queue?.paused?.backAt != null ? formatClock(queue.paused.backAt, timezone) : null,
    now,
  });

  return (
    <PatientStatus
      view={view}
      turnKey={turnKey}
      joinHref={joinPath(clinicId)}
      onChangeDistance={(distance: Distance) => updateDistance(ticket, distance)}
      onLeave={async () => {
        await leaveQueue(ticket);
        forgetTicket(clinicId);
      }}
    />
  );
}

interface SeenCalls {
  ticketId: string;
  /** Every lastCallAt this page has shown for the ticket. */
  keys: number[];
  /** The last key seen for the first time; an undo back to an older call leaves it. */
  latest: number | null;
  /** False for the call already on screen when the page loaded. */
  buzz: boolean;
}

/**
 * When the patient is called (and on every "Call again"), buzz the phone and
 * put "It's your turn" in the tab title, so a backgrounded tab still shows it.
 * `undefined` means still loading; the first loaded value doesn't buzz, since
 * the page already says so. Only calls not seen before buzz: when the desk
 * undoes a Next or Call again, lastCallAt goes back to an earlier call.
 *
 * Returns the latest call seen for the first time, which keys the "It's your
 * turn" card so it pulses and announces once per call, not again on an undo.
 */
function useTurnAlert(ticketId: string, callKey: number | null | undefined, label: string): number | null {
  const [seen, setSeen] = useState<SeenCalls | null>(null);

  // Tracked during render (not in an effect) so the card mounts with the new
  // key straight away instead of mounting once more a render later.
  let current = seen?.ticketId === ticketId ? seen : null;
  if (callKey !== undefined && (!current || (callKey != null && !current.keys.includes(callKey)))) {
    const keys = current?.keys ?? [];
    current =
      callKey == null
        ? { ticketId, keys, latest: null, buzz: false }
        : { ticketId, keys: [...keys, callKey], latest: callKey, buzz: current != null };
    setSeen(current);
  }
  const latest = current?.latest ?? null;
  const buzz = current?.buzz ?? false;

  useEffect(() => {
    if (!buzz) return;
    try {
      navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
      // Vibration needs a prior tap on some browsers; the screen still says it.
    }
  }, [buzz, latest]);

  useEffect(() => {
    if (callKey == null) return;
    const previous = document.title;
    document.title = `It's your turn · ${label}`;
    return () => {
      document.title = previous;
    };
  }, [callKey, label]);

  return latest;
}
