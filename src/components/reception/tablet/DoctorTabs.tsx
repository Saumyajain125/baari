import { PauseIcon, PlayIcon } from "@/components/icons";
import type { DoctorTabView } from "@/lib/view";

export interface DoctorTabsProps {
  doctors: DoctorTabView[];
  selectedDoctorId: string;
  onSelect(doctorId: string): void;
  /** What the right-hand button does for the selected doctor; null hides it. */
  queueControl: "pause" | "resume" | null;
  onPause(): void;
  onResume(): void;
}

/**
 * Row of doctor toggles under the header, with Pause / Resume queue on the right.
 * On narrow tablets the tabs scroll sideways and Pause / Resume drop to icons.
 */
export function DoctorTabs({ doctors, selectedDoctorId, onSelect, queueControl, onPause, onResume }: DoctorTabsProps) {
  return (
    <nav aria-label="Doctors" className="flex flex-none items-center gap-[10px] px-5 pt-[14px]">
      {/* Negative margin + padding keeps the focus ring clear of the scroll clip. */}
      <div className="-m-[6px] flex min-w-0 gap-[10px] overflow-x-auto p-[6px]">
        {doctors.map((d) => (
          <DoctorTab key={d.id} doctor={d} selected={d.id === selectedDoctorId} onSelect={onSelect} />
        ))}
      </div>
      <div className="flex-1" />
      {queueControl === "pause" && (
        <button
          type="button"
          onClick={onPause}
          className="flex h-12 flex-none items-center gap-2 rounded-[14px] border border-line-strong bg-surface px-4 text-[15px] font-semibold whitespace-nowrap text-ink hover:bg-hover"
        >
          <PauseIcon size={18} />
          <span className="max-[860px]:sr-only">Pause queue</span>
        </button>
      )}
      {queueControl === "resume" && (
        <button
          type="button"
          onClick={onResume}
          className="flex h-12 flex-none items-center gap-2 rounded-[14px] border border-teal bg-teal px-4 text-[15px] font-semibold whitespace-nowrap text-white hover:bg-teal-dark"
        >
          <PlayIcon size={18} />
          <span className="max-[860px]:sr-only">Resume queue</span>
        </button>
      )}
    </nav>
  );
}

function DoctorTab({
  doctor,
  selected,
  onSelect,
}: {
  doctor: DoctorTabView;
  selected: boolean;
  onSelect(doctorId: string): void;
}) {
  const pill =
    doctor.startsAtLabel ?? (doctor.paused ? "Paused" : doctor.waitingCount > 0 ? `${doctor.waitingCount} waiting` : null);
  const pillTone = doctor.paused
    ? "bg-amber-tint text-amber"
    : selected
      ? "bg-teal-tint text-teal-dark"
      : "bg-subtle text-muted";

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(doctor.id)}
      className={`flex h-14 flex-none items-center gap-3 rounded-[16px] bg-surface px-[18px] text-[16px] whitespace-nowrap text-ink ${
        selected ? "border-2 border-teal font-semibold" : "border border-line font-medium hover:bg-hover"
      }`}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-[10px] font-display text-[16px] font-extrabold ${
          selected ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"
        }`}
      >
        {doctor.prefix}
      </span>
      {doctor.name}
      {pill && <span className={`rounded-full px-[10px] py-[3px] text-[13px] ${pillTone}`}>{pill}</span>}
    </button>
  );
}
