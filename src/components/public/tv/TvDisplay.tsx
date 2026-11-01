"use client";

import { LogoMark } from "@/components/brand/Logo";
import { BellIcon, PauseIcon, WifiOffIcon } from "@/components/icons";
import { QrCode } from "@/components/public/QrCode";
import { cx, keepTimesTogether } from "@/components/public/ui";
import type { TvDoctorView, TvView } from "@/components/public/views";
import styles from "./tv.module.css";
import { useFitScale } from "./useFitScale";

/** The TV is laid out once on a 1920×1080 stage and scaled to fit the screen. */
const STAGE_W = 1920;
const STAGE_H = 1080;

type Density = "xl" | "lg" | "md" | "sm";

/** Literal class strings per density, so Tailwind sees every size. */
const SIZES: Record<
  Density,
  {
    panel: string;
    tile: string;
    name: string;
    room: string;
    pill: string;
    eyebrow: string;
    token: string;
    /** Three-digit tokens ("A-104") step down so they still fit. */
    tokenLong: string;
    goTo: string;
    pause: string;
    chips: string;
    chip: string;
    /** "Nobody waiting" placeholder in the Next row. */
    empty: string;
    /** Room reserved for the Next tokens, so "Now calling" boxes line up across columns. */
    nextArea: string;
  }
> = {
  xl: {
    panel: "gap-7 p-11",
    tile: "size-[84px] rounded-[22px] text-[46px]",
    name: "text-[48px]",
    room: "text-[30px]",
    pill: "px-6 py-2 text-[28px]",
    eyebrow: "text-[26px]",
    token: "text-[300px]",
    tokenLong: "text-[250px]",
    goTo: "text-[36px]",
    pause: "text-[38px]",
    chips: "grid-cols-5 gap-5",
    chip: "h-[104px] text-[56px]",
    empty: "h-[104px] text-[30px]",
    nextArea: "",
  },
  lg: {
    panel: "gap-6 p-10",
    tile: "size-[72px] rounded-[20px] text-[40px]",
    name: "text-[40px]",
    room: "text-[26px]",
    pill: "px-5 py-[6px] text-[24px]",
    eyebrow: "text-[22px]",
    token: "text-[240px]",
    tokenLong: "text-[188px]",
    goTo: "text-[30px]",
    pause: "text-[32px]",
    chips: "grid-cols-5 gap-4",
    chip: "h-[84px] text-[36px]",
    empty: "h-[84px] text-[26px]",
    nextArea: "",
  },
  md: {
    panel: "gap-5 p-8",
    tile: "size-[60px] rounded-[18px] text-[34px]",
    name: "text-[32px]",
    room: "text-[22px]",
    pill: "px-4 py-[5px] text-[20px]",
    eyebrow: "text-[20px]",
    token: "text-[136px]",
    tokenLong: "text-[108px]",
    goTo: "text-[24px]",
    pause: "text-[26px]",
    chips: "grid-cols-3 gap-3",
    chip: "h-[68px] text-[34px]",
    empty: "h-[68px] text-[22px]",
    // Two rows of three chips (5 tokens), whether or not this doctor has that many.
    nextArea: "min-h-[148px]",
  },
  sm: {
    panel: "gap-4 p-7",
    tile: "size-[52px] rounded-[16px] text-[30px]",
    name: "text-[28px]",
    room: "text-[20px]",
    pill: "px-4 py-1 text-[18px]",
    eyebrow: "text-[18px]",
    token: "text-[112px]",
    tokenLong: "text-[90px]",
    goTo: "text-[20px]",
    pause: "text-[22px]",
    chips: "grid-cols-3 gap-3",
    chip: "h-[56px] text-[30px]",
    empty: "h-[56px] text-[20px]",
    nextArea: "",
  },
};

function densityFor(count: number): Density {
  if (count <= 1) return "xl";
  if (count === 2) return "lg";
  if (count === 3) return "md";
  return "sm";
}

export interface TvDisplayProps {
  view: TvView;
  /** Absolute join URL for the QR code; null until known (SSR). */
  joinUrl: string | null;
  /** doctorId → the callKey to flash for; only calls made while the screen is up flash. */
  flashing: Record<string, number>;
  /** Showing cached data while the internet is down. */
  offline?: boolean;
  sound?: { on: boolean; onToggle(): void };
  /** Shown while not already full screen. */
  onFullscreen?: () => void;
}

/**
 * Waiting-room TV: per doctor the token being called (huge), the next five
 * tokens and any pause notice, plus the clock and a QR code to join. Shows
 * tokens only, never names, so it's safe in a public room.
 */
export function TvDisplay({ view, joinUrl, flashing, offline = false, sound, onFullscreen }: TvDisplayProps) {
  const scale = useFitScale(STAGE_W, STAGE_H);
  const density = densityFor(view.doctors.length);
  const columns = view.doctors.length <= 3 ? Math.max(1, view.doctors.length) : view.doctors.length === 4 ? 2 : 3;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-canvas">
      <div
        className={cx(
          "flex h-[1080px] w-[1920px] shrink-0 flex-col gap-7 px-12 pt-10 pb-8 text-ink",
          scale == null && "invisible",
        )}
        style={scale == null ? undefined : { transform: `scale(${scale})` }}
      >
        <header className="flex h-[96px] items-center gap-6">
          <LogoMark size={76} />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate font-display text-[52px] leading-[1.05] font-bold">{view.clinicName}</h1>
            <p className="text-[26px] text-muted">{view.dateLabel} · Walk-in queue</p>
          </div>
          {offline && (
            <span className="flex items-center gap-3 rounded-full bg-amber-chip px-6 py-3 text-[24px] font-semibold text-amber">
              <WifiOffIcon size={28} />
              Offline, showing the last update
            </span>
          )}
          <p className="font-display text-[76px] leading-none font-extrabold tabular-nums">
            <span className="sr-only">Time </span>
            {view.clock}
          </p>
        </header>

        <main className="flex min-h-0 flex-1 gap-7">
          <div
            className="grid min-h-0 min-w-0 flex-1 gap-7"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {view.doctors.map((d) => (
              <DoctorPanel key={d.id} doctor={d} density={density} flash={d.callKey != null && flashing[d.id] === d.callKey} />
            ))}
          </div>
          <JoinRail joinUrl={joinUrl} />
        </main>

        <footer className="flex h-[48px] items-center justify-between gap-6 text-[24px] text-muted">
          <p>Watch for your token number. Names are never shown on this screen.</p>
          <div className="flex items-center gap-3">
            {sound && (
              <button
                type="button"
                onClick={sound.onToggle}
                className={cx(
                  "flex h-12 items-center gap-3 rounded-[14px] border px-5 text-[22px] font-semibold",
                  sound.on ? "border-teal bg-teal-tint text-teal-dark" : "border-line-strong bg-surface text-ink hover:bg-hover",
                )}
              >
                <BellIcon size={24} />
                {sound.on ? "Turn off chime" : "Turn on chime"}
              </button>
            )}
            {onFullscreen && (
              <button
                type="button"
                onClick={onFullscreen}
                className="flex h-12 items-center rounded-[14px] border border-line-strong bg-surface px-5 text-[22px] font-semibold text-ink hover:bg-hover"
              >
                Full screen
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function DoctorPanel({ doctor, density, flash }: { doctor: TvDoctorView; density: Density; flash: boolean }) {
  const s = SIZES[density];
  const headingId = `tv-doctor-${doctor.id}`;
  const compact = density === "sm";
  const narrow = density === "md" || density === "sm";

  return (
    <section
      aria-labelledby={headingId}
      className={cx("flex min-h-0 min-w-0 flex-col rounded-[32px] border border-line bg-surface", s.panel)}
    >
      <div className="flex items-center gap-5">
        <span
          aria-hidden="true"
          className={cx("flex flex-none items-center justify-center bg-teal font-display font-extrabold text-white", s.tile)}
        >
          {doctor.prefix}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={headingId} className={cx("truncate font-display leading-[1.1] font-bold", s.name)}>
            {doctor.name}
          </h2>
          <p className={cx("truncate text-muted", s.room)}>
            {doctor.startsAtLabel ?? doctor.room}
            {/* Narrow panels fold the count into this line so the name keeps its width. */}
            {narrow && ` · ${doctor.waitingCount} waiting`}
          </p>
        </div>
        {!narrow && (
          <span className={cx("flex-none rounded-full bg-teal-tint font-semibold whitespace-nowrap text-teal-dark", s.pill)}>
            {doctor.waitingCount} waiting
          </span>
        )}
      </div>

      <div className={cx("flex min-h-0 flex-1 gap-6", compact ? "flex-row" : "flex-col")}>
        <NowCalling doctor={doctor} density={density} flash={flash} />
        <NextTokens doctor={doctor} density={density} />
      </div>
    </section>
  );
}

function NowCalling({ doctor, density, flash }: { doctor: TvDoctorView; density: Density; flash: boolean }) {
  const s = SIZES[density];
  const eyebrow = cx("font-bold tracking-[0.08em] uppercase", s.eyebrow);

  if (doctor.pausedMessage) {
    return (
      <div
        role="status"
        className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-[28px] border border-amber-line bg-amber-tint px-8 text-center text-amber"
      >
        <PauseIcon size={density === "sm" ? 40 : 56} />
        <p className={eyebrow}>Short break</p>
        <p className={cx("max-w-[22ch] leading-snug font-semibold text-balance", s.pause)}>
          {keepTimesTogether(doctor.pausedMessage)}
        </p>
        {doctor.nowCalling && (
          <p className={cx("font-semibold", s.goTo)}>With doctor: {doctor.nowCalling}</p>
        )}
      </div>
    );
  }

  return (
    // The live region stays mounted; its content is re-keyed per call so the flash replays.
    <div aria-live="polite" aria-atomic="true" className="flex min-h-0 min-w-0 flex-1">
      <div
        key={doctor.callKey ?? "none"}
        className={cx(
          "flex min-w-0 flex-1 flex-col items-center justify-center rounded-[28px] bg-teal-tint px-6 text-center text-teal-dark",
          flash && styles.flashBox,
        )}
      >
        <p className={eyebrow}>{doctor.nowCalling ? "Now calling" : "Not started yet"}</p>
        {doctor.nowCalling ? (
          <>
            <p
              className={cx(
                "font-display leading-[0.95] font-extrabold whitespace-nowrap text-teal",
                doctor.nowCalling.length > 4 ? s.tokenLong : s.token,
                flash && styles.flashToken,
              )}
            >
              {doctor.nowCalling}
            </p>
            <p className={cx("font-semibold", s.goTo)}>Please go to {doctor.room}</p>
          </>
        ) : (
          <>
            <p aria-hidden="true" className={cx("font-display leading-[0.95] font-extrabold text-line-strong", s.token)}>
              {doctor.prefix}-00
            </p>
            <p className={cx("font-semibold", s.goTo)}>
              {doctor.startsAtLabel ?? (doctor.waitingCount > 0 ? "First token will be called soon" : "Nobody waiting yet")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function NextTokens({ doctor, density }: { doctor: TvDoctorView; density: Density }) {
  const s = SIZES[density];
  const compact = density === "sm";
  return (
    <div className={cx("flex min-w-0 flex-col gap-4", compact && "flex-1 justify-center")}>
      <p className={cx("font-bold tracking-[0.08em] text-muted uppercase", s.eyebrow)}>Next</p>
      <div className={s.nextArea}>
        {doctor.next.length > 0 ? (
          <ol className={cx("grid", s.chips)} aria-label={`Next tokens for ${doctor.name}`}>
            {doctor.next.map((label) => (
              <li
                key={label}
                className={cx(
                  "flex min-w-0 items-center justify-center rounded-[20px] bg-subtle font-display leading-none font-extrabold whitespace-nowrap",
                  s.chip,
                )}
              >
                {label}
              </li>
            ))}
          </ol>
        ) : (
          <p className={cx("flex items-center rounded-[20px] border-2 border-dashed border-line px-6 text-muted", s.empty)}>
            Nobody waiting
          </p>
        )}
      </div>
    </div>
  );
}

function JoinRail({ joinUrl }: { joinUrl: string | null }) {
  return (
    <aside
      aria-label="Join the queue"
      className="flex w-[420px] flex-none flex-col items-center justify-center gap-6 rounded-[32px] border border-line bg-surface px-8 py-10 text-center"
    >
      <div className="rounded-[24px] border-[3px] border-teal p-4">
        {joinUrl ? (
          <QrCode value={joinUrl} size={272} label="QR code to join the queue" />
        ) : (
          <div className="size-[272px] rounded-[12px] bg-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="font-display text-[40px] leading-[1.1] font-bold text-balance">Scan to join the queue</p>
        <p lang="hi" className="text-[24px] leading-snug text-balance text-muted">
          क्यू में शामिल होने के लिए स्कैन करें
        </p>
      </div>
      <p className="border-t border-divider pt-6 text-[22px] leading-snug text-balance text-muted">
        Wait anywhere. Keep the page open on your phone to see when it&apos;s your turn.
      </p>
    </aside>
  );
}
