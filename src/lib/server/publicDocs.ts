import { paths } from "@/lib/paths";
import type { TicketShare } from "@/lib/share";

/**
 * Server-side reads of the public Firestore docs (clinics, doctors, tickets)
 * for link previews. They go over the REST API rather than the web SDK: a
 * preview needs one short, cacheable read, not listeners and an offline cache.
 * The security rules already let anyone read these docs. Every failure
 * returns null so a preview falls back to generic text instead of erroring.
 */

/** Firestore auto ids; anything else never reaches the API. */
const DOC_ID = /^[A-Za-z0-9_-]{1,128}$/;

const TIMEOUT_MS = 2500;

/** Clinic and doctor names change rarely; previews may lag a rename by this long. */
const REVALIDATE_S = 300;

type Fields = Record<string, { stringValue?: string } | undefined>;

function documentsRoot(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  const origin =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
      ? `http://${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1"}:8080`
      : "https://firestore.googleapis.com";
  return `${origin}/v1/projects/${projectId}/databases/(default)/documents`;
}

async function readFields(path: string): Promise<Fields | null> {
  const root = documentsRoot();
  if (!root) return null;
  try {
    const res = await fetch(`${root}/${path}`, {
      next: { revalidate: REVALIDATE_S },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { fields?: Fields };
    return body.fields ?? null;
  } catch {
    return null;
  }
}

function text(fields: Fields | null, key: string): string | null {
  const value = fields?.[key]?.stringValue?.replace(/\s+/g, " ").trim();
  return value ? value : null;
}

export async function getClinicName(clinicId: string): Promise<string | null> {
  if (!DOC_ID.test(clinicId)) return null;
  return text(await readFields(paths.clinic(clinicId)), "name");
}

/** Token label, clinic and doctor for a patient's token page, or null if any part is missing. */
export async function getTicketShare(clinicId: string, ticketId: string): Promise<TicketShare | null> {
  if (!DOC_ID.test(clinicId) || !DOC_ID.test(ticketId)) return null;
  const [clinicName, ticket] = await Promise.all([
    getClinicName(clinicId),
    readFields(paths.ticket(clinicId, ticketId)),
  ]);
  const label = text(ticket, "label");
  if (!clinicName || !label) return null;
  const doctorId = text(ticket, "doctorId");
  const doctor = doctorId && DOC_ID.test(doctorId) ? await readFields(paths.doctor(clinicId, doctorId)) : null;
  return { label, clinicName, doctorName: text(doctor, "name") };
}
