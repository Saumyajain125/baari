import type { DoctorTabView } from "@/lib/view";

export interface PhoneDoctorSwitcherProps {
  doctors: DoctorTabView[];
  selectedDoctorId: string;
  onSelect(doctorId: string): void;
}

function statusText(d: DoctorTabView): string {
  if (d.paused) return "Paused";
  if (d.startsAtLabel) return d.startsAtLabel;
  return `${d.waitingCount} waiting`;
}

/**
 * Compact doctor picker for multi-doctor clinics: the phone counterpart of the
 * tablet's doctor tabs. Two doctors share the row; more scroll sideways.
 */
export function PhoneDoctorSwitcher({ doctors, selectedDoctorId, onSelect }: PhoneDoctorSwitcherProps) {
  return (
    <nav aria-label="Doctors" className="flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
      {doctors.map((d) => {
        const selected = d.id === selectedDoctorId;
        const status = statusText(d);
        return (
          <button
            key={d.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(d.id)}
            className={`flex h-[52px] min-w-[160px] flex-1 items-center gap-2 rounded-[14px] max-[374px]:gap-1.5 bg-surface text-left ${
              selected ? "border-2 border-teal pr-[9px] pl-[7px]" : "border border-line pr-2.5 pl-2"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-7 shrink-0 items-center justify-center rounded-[8px] font-display text-[14px] font-extrabold ${
                selected ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"
              }`}
            >
              {d.prefix}
            </span>
            <span className="flex min-w-0 flex-col">
              {/* Weights follow the tablet tabs: 600 selected, 500 otherwise. 13px on the narrowest phones keeps "Dr. Anita Sharma" whole. */}
              <span className={`truncate text-[14px] max-[374px]:text-[13px] ${selected ? "font-semibold" : "font-medium"}`}>
                {d.name}
              </span>
              <span
                className={`truncate text-[12px] ${
                  d.paused ? "font-semibold text-warn" : selected ? "text-teal-dark" : "text-muted"
                }`}
              >
                {status}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
