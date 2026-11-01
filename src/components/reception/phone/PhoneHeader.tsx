import { PauseIcon, PlayIcon } from "@/components/icons";
import { ClinicIdentity } from "@/components/reception/ClinicIdentity";
import { SettingsMenu } from "@/components/reception/tablet/SettingsMenu";
import type { ClinicHeaderView } from "@/lib/view";

export interface PhoneHeaderProps {
  header: ClinicHeaderView;
  paused: boolean;
  /** Set for multi-doctor clinics, so the pause button says whose queue it pauses. */
  doctorName?: string;
  onPause(): void;
  onResume(): void;
  onOpenTv(): void;
  onLock(): void;
  onPrintPoster(): void;
  onOpenSettings(): void;
  onOpenInsights(): void;
}

/**
 * Logo, clinic name, one-line stats, the pause / resume toggle for the selected
 * doctor, and the settings menu (lock, QR poster, TV display, settings).
 */
export function PhoneHeader({
  header,
  paused,
  doctorName,
  onPause,
  onResume,
  onOpenTv,
  onLock,
  onPrintPoster,
  onOpenSettings,
  onOpenInsights,
}: PhoneHeaderProps) {
  const { stats } = header;
  const whose = doctorName ? ` for ${doctorName}` : "";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-[14px]">
      {/* Below 380px the logo would push "6 min avg" off the stats line. */}
      <ClinicIdentity
        clinicName={header.clinicName}
        subtitle={`${stats.inQueue} waiting · ${stats.served} served · ${stats.avgConsult} avg`}
        logoClassName="max-[379px]:hidden"
      />
      <div className="flex shrink-0 items-center gap-2">
        {paused ? (
          <button
            type="button"
            aria-label={`Resume queue${whose}`}
            onClick={onResume}
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-teal bg-teal text-white active:bg-teal-dark"
          >
            <PlayIcon size={18} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Pause queue${whose}`}
            onClick={onPause}
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-line bg-surface text-ink hover:bg-hover"
          >
            <PauseIcon size={18} />
          </button>
        )}
        <SettingsMenu
          compact
          onLock={onLock}
          onPrintPoster={onPrintPoster}
          onOpenTv={onOpenTv}
          onOpenSettings={onOpenSettings}
          onOpenInsights={onOpenInsights}
        />
      </div>
    </header>
  );
}
