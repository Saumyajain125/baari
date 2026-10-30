"use client";

import Link from "next/link";
import { ClinicGate, type ClinicSession } from "@/components/auth/ClinicGate";
import { ReceptionLockGate } from "@/components/auth/ReceptionLockGate";
import { ArrowRightIcon } from "@/components/icons";
import { PublicLoading, PublicMessage } from "@/components/public/ui";
import { ClinicIdentity } from "@/components/reception/ClinicIdentity";
import { useDoctors } from "@/lib/hooks";
import { WrongClinic } from "./DoctorApp";

/** /doctor/[clinicId]: pick which doctor's room this device sits in. */
export function DoctorPicker({ clinicId }: { clinicId: string }) {
  return (
    <ClinicGate>
      {(session) => (
        <ReceptionLockGate clinicId={session.clinicId} clinic={session.clinic}>
          {session.clinicId === clinicId ? <PickDoctor session={session} /> : <WrongClinic session={session} />}
        </ReceptionLockGate>
      )}
    </ClinicGate>
  );
}

function PickDoctor({ session }: { session: ClinicSession }) {
  const { clinicId, clinic } = session;
  const doctorsSub = useDoctors(clinicId);
  const doctors = doctorsSub.data.filter((d) => d.active);

  if (doctorsSub.loading) return <PublicLoading />;
  if (doctors.length === 0) {
    return (
      <PublicMessage title="No doctors set up yet" action={<Link href="/settings" className="font-semibold">Open Settings</Link>}>
        Add a doctor in Settings, then open this page on the device in their room.
      </PublicMessage>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="border-b border-line bg-surface px-5 py-3">
        <ClinicIdentity clinicName={clinic.name} subtitle="Doctor's button" />
      </header>
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 p-5">
        <h1 className="font-display text-[28px] leading-tight font-bold">Whose room is this?</h1>
        <p className="text-[15px] leading-snug text-muted">
          Pick the doctor. This screen becomes their Next button and reception sees &ldquo;Doctor&apos;s button linked&rdquo;.
        </p>
        <ul className="mt-2 flex flex-col gap-3">
          {doctors.map((d) => (
            <li key={d.id}>
              <Link
                href={`/doctor/${encodeURIComponent(clinicId)}/${encodeURIComponent(d.id)}`}
                className="flex min-h-[72px] items-center gap-4 rounded-[18px] border border-line bg-surface px-4 text-ink no-underline hover:border-teal hover:bg-teal-tint hover:text-ink"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 flex-none items-center justify-center rounded-[12px] bg-teal font-display text-[22px] font-extrabold text-white"
                >
                  {d.prefix}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[17px] font-semibold">{d.name}</span>
                  <span className="text-[13px] text-muted">{d.room}</span>
                </span>
                <ArrowRightIcon size={22} className="flex-none text-teal-dark" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
