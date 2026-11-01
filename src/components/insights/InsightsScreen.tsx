"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClinicGate, type ClinicSession } from "@/components/auth/ClinicGate";
import { AccountProblem } from "@/components/auth/account";
import { AuthLoading } from "@/components/auth/AuthStatus";
import { useClinic, useConnectivity, useDoctors, useTicketsBetween, useToday } from "@/lib/hooks";
import { DEFAULT_RANGE, isRangeKey, rangeBounds, rangeFor, type InsightsRangeKey } from "@/lib/insights";
import { InsightsView, type InsightsViewProps } from "./InsightsView";

/**
 * /insights: the clinic account's long-run view of each doctor's work.
 * Query: `?doctor=<id>` preselects a doctor, `?range=7d|30d|3m` the period,
 * and `from=doctor` (with a doctor) sends Back to that doctor's button.
 * It reads only public ticket fields (no names or phones), so unlike Settings
 * it isn't held behind the desk's PIN lock.
 */
export function InsightsScreen() {
  return <ClinicGate>{(session) => <InsightsData key={session.clinicId} session={session} />}</ClinicGate>;
}

function InsightsData({ session }: { session: ClinicSession }) {
  const { clinicId } = session;
  const params = useSearchParams();
  const clinic = useClinic(clinicId).data ?? session.clinic;
  const doctorsSub = useDoctors(clinicId);
  const today = useToday(clinic.timezone);
  const { online } = useConnectivity();

  // The address as the page opened; later changes to it are this page's own (see below).
  const [entry] = useState(() => ({ doctor: params.get("doctor"), fromDoctor: params.get("from") === "doctor" }));
  const [rangeKey, setRangeKey] = useState<InsightsRangeKey>(() => {
    const r = params.get("range");
    return isRangeKey(r) ? r : DEFAULT_RANGE;
  });
  // undefined until someone picks: then the ?doctor= param (or the only doctor) applies.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);

  const { from, to } = rangeBounds(today, rangeFor(rangeKey));
  const data = useTicketsBetween(clinicId, from, to);

  // Active doctors, plus any removed ones who still have tokens in this period.
  const doctors = useMemo(() => {
    const withTokens = new Set(data.tickets.map((t) => t.doctorId));
    return doctorsSub.data
      .filter((d) => d.active || withTokens.has(d.id))
      .map((d) => ({ id: d.id, name: d.name, prefix: d.prefix }));
  }, [doctorsSub.data, data.tickets]);

  const known = (id: string | null | undefined) => id != null && doctors.some((d) => d.id === id);
  const doctorId =
    picked !== undefined && (picked === null || known(picked))
      ? picked
      : known(entry.doctor)
        ? entry.doctor
        : doctors.length === 1
          ? doctors[0].id
          : null;

  // Keep the choice in the address, so a refresh or a shared link opens the same view.
  const ready = !doctorsSub.loading;
  useEffect(() => {
    // Until the doctors arrive the selection isn't known yet; leave the address alone.
    if (!ready) return;
    const next = new URLSearchParams(window.location.search);
    if (doctorId) next.set("doctor", doctorId);
    else next.delete("doctor");
    if (rangeKey === DEFAULT_RANGE) next.delete("range");
    else next.set("range", rangeKey);
    const query = next.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
  }, [ready, doctorId, rangeKey]);

  useEffect(() => {
    if (data.error) console.error("Insights tickets failed to load", data.error);
  }, [data.error]);

  const onDoctorChange = useCallback((id: string | null) => setPicked(id), []);

  if (doctorsSub.error) return <AccountProblem error={doctorsSub.error} clinicId={clinicId} />;
  if (doctorsSub.loading) return <AuthLoading label="Opening insights…" />;

  const backDoctor = entry.fromDoctor ? doctorsSub.data.find((d) => d.id === entry.doctor) : undefined;
  const back: InsightsViewProps["back"] = backDoctor
    ? {
        href: `/doctor/${encodeURIComponent(clinicId)}/${encodeURIComponent(backDoctor.id)}`,
        label: "Back to doctor's button",
        shortLabel: "Back",
      }
    : { href: "/reception", label: "Back to reception", shortLabel: "Reception" };

  const neverLoaded = data.loading && data.tickets.length === 0;

  return (
    <InsightsView
      clinicName={clinic.name}
      timezone={clinic.timezone}
      today={today}
      doctors={doctors}
      doctorId={doctorId}
      rangeKey={rangeKey}
      tickets={data.tickets}
      phase={neverLoaded ? "loading" : data.loading ? "reloading" : "ready"}
      syncNote={
        !online
          ? "Offline. Showing what this device has saved."
          : data.loading || data.fromCache
            ? "Updating…"
            : null
      }
      error={data.error ? "Check the internet connection, then reload the page." : null}
      back={back}
      onDoctorChange={onDoctorChange}
      onRangeChange={setRangeKey}
    />
  );
}
