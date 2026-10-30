"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useJoinUrl, useWakeLock } from "@/components/public/hooks";
import { FirebaseMissing, PublicLoading, PublicMessage } from "@/components/public/ui";
import { buildTvDoctor, type TvDoctorView } from "@/components/public/views";
import { firebaseConfigured } from "@/lib/firebase";
import {
  useClinic,
  useConnectivity,
  useDoctors,
  useNow,
  usePublicTickets,
  useQueueDays,
  useToday,
} from "@/lib/hooks";
import { DEFAULT_TIMEZONE, formatClock, formatDayShort } from "@/lib/time";
import { TvDisplay } from "./TvDisplay";
import { useChime } from "./useChime";

/** Snapshots in this window after load settle the baseline (cache, then server) without flashing. */
const SETTLE_MS = 4000;

/** Public TV display for one clinic. No sign-in: it reads only public, name-free data. */
export function TvApp({ clinicId }: { clinicId: string }) {
  if (!firebaseConfigured) return <FirebaseMissing />;
  return <TvLive clinicId={clinicId} />;
}

function TvLive({ clinicId }: { clinicId: string }) {
  const clinicSub = useClinic(clinicId);
  const clinic = clinicSub.data;
  const timezone = clinic?.timezone ?? DEFAULT_TIMEZONE;
  const today = useToday(timezone);
  const now = useNow(5000);
  const doctorsSub = useDoctors(clinicId);
  const queueDays = useQueueDays(clinicId, today);
  const ticketsSub = usePublicTickets(clinicId, today);
  const joinUrl = useJoinUrl(clinicId);
  const { online } = useConnectivity();
  const chime = useChime();
  const fullscreen = useIsFullscreen();
  useWakeLock();

  const doctors = useMemo(() => doctorsSub.data.filter((d) => d.active), [doctorsSub.data]);
  const tvDoctors = doctors.map((d) => buildTvDoctor(d, ticketsSub.data, queueDays.data[d.id], now, timezone));
  const ready = !clinicSub.loading && !doctorsSub.loading && !ticketsSub.loading;
  const flashing = useCallFlashes(tvDoctors, ready, chime.play);

  if (clinicSub.loading || doctorsSub.loading) return <PublicLoading />;
  if (!clinic) {
    return (
      <PublicMessage title="We couldn't find this clinic">
        Open the TV display again from the reception screen (the TV button in the header).
      </PublicMessage>
    );
  }
  if (doctors.length === 0) {
    return (
      <PublicMessage title="No doctors set up yet">
        Add a doctor in Settings at the reception desk and this screen will show their queue.
      </PublicMessage>
    );
  }

  return (
    <TvDisplay
      view={{
        clinicName: clinic.name,
        dateLabel: formatDayShort(now, timezone),
        clock: formatClock(now, timezone),
        doctors: tvDoctors,
      }}
      joinUrl={joinUrl}
      flashing={flashing}
      offline={!online}
      sound={{ on: chime.on, onToggle: () => (chime.on ? chime.disable() : void chime.enable()) }}
      onFullscreen={fullscreen ? undefined : () => void document.documentElement.requestFullscreen?.().catch(() => {})}
    />
  );
}

/** How long a flash stays on: a little over the 3.2 s animation in tv.module.css. */
const FLASH_MS = 3300;

/**
 * Detects each doctor's new call (Next or Call again changes the serving
 * ticket's lastCallAt) and returns doctorId → callKey to flash, ringing the
 * chime once per batch. The first snapshots after load only set the baseline,
 * so opening the TV doesn't replay old calls. Only calls not seen before
 * count: undoing a Next or Call again brings back an earlier lastCallAt, which
 * isn't a new call. (Not "newer than the last": the desk and the doctor's
 * button stamp calls with their own clocks, which can disagree.) A flash ends
 * with its animation, so a panel remounting later (a queue resuming from a
 * pause) doesn't replay it.
 */
function useCallFlashes(doctors: TvDoctorView[], ready: boolean, onCall: () => void): Record<string, number> {
  const signature = JSON.stringify(doctors.map((d) => [d.id, d.callKey]));
  const seen = useRef<Map<string, Set<number>> | null>(null);
  const readyAt = useRef<number | null>(null);
  const onCallRef = useRef(onCall);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [flashing, setFlashing] = useState<Record<string, number>>({});

  useEffect(() => {
    onCallRef.current = onCall;
  }, [onCall]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) clearTimeout(id);
      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const current = JSON.parse(signature) as [string, number | null][];
    const baseline = seen.current == null;
    const keysById = (seen.current ??= new Map());
    readyAt.current ??= Date.now();
    const settling = baseline || Date.now() - readyAt.current < SETTLE_MS;

    const fresh: Record<string, number> = {};
    for (const [id, key] of current) {
      if (key == null) continue;
      let keys = keysById.get(id);
      if (!keys) keysById.set(id, (keys = new Set()));
      if (keys.has(key)) continue;
      keys.add(key);
      if (!settling) fresh[id] = key;
    }
    if (Object.keys(fresh).length === 0) return;
    setFlashing((f) => ({ ...f, ...fresh }));
    onCallRef.current();

    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setFlashing((f) => {
        const next = { ...f };
        // A newer call for the same doctor keeps its own flash.
        for (const [id, key] of Object.entries(fresh)) if (next[id] === key) delete next[id];
        return next;
      });
    }, FLASH_MS);
    timers.current.add(timer);
  }, [signature, ready]);

  return flashing;
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function useIsFullscreen(): boolean {
  return useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement != null,
    () => false,
  );
}
