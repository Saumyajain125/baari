export interface LockStaff {
  id: string;
  name: string;
  /** "RK" */
  initials: string;
}

export interface StaffPickerProps {
  staff: LockStaff[];
  selectedId: string | null;
  onSelect(staffId: string): void;
}

/** "Who's at the desk?" toggle cards, two per row. */
export function StaffPicker({ staff, selectedId, onSelect }: StaffPickerProps) {
  return (
    <div role="group" aria-label="Staff" className="grid grid-cols-2 gap-[10px]">
      {staff.map((member) => {
        const selected = member.id === selectedId;
        return (
          <button
            key={member.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(member.id)}
            className={`flex min-h-16 min-w-0 items-center gap-3 rounded-[16px] px-4 text-left text-[16px] font-semibold text-ink ${
              selected ? "border-2 border-teal bg-teal-tint" : "border border-line bg-surface hover:border-line-strong"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                selected ? "bg-teal text-white" : "bg-teal-tint text-teal-dark"
              }`}
            >
              {member.initials}
            </span>
            <span className="min-w-0 truncate">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}
