import { PauseIcon, PlayIcon } from "@/components/icons";
import type { ClinicHeaderView } from "@/lib/view";

export interface PhoneHeaderProps {
  header: ClinicHeaderView;
  paused: boolean;
  /** Set for multi-doctor clinics, so the pause button says whose queue it pauses. */
  doctorName?: string;
  onPause(): void;
  onResume(): void;
}

/** Clinic name, one-line stats and the pause / resume toggle for the selected doctor. */
export function PhoneHeader({ header, paused, doctorName, onPause, onResume }: PhoneHeaderProps) {
  const { stats } = header;
  const whose = doctorName ? ` for ${doctorName}` : "";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-[14px]">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate font-display text-[17px] font-bold">{header.clinicName}</h1>
        <p className="truncate text-[12px] text-muted">
          {`${stats.inQueue} waiting · ${stats.served} served · ${stats.avgConsult} avg`}
        </p>
      </div>
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
    </header>
  );
}
