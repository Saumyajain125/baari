import { BellIcon } from "@/components/icons";

export interface DeskStatusRowProps {
  /** False when nobody is with the doctor, so there is no one to call again. */
  canCallAgain: boolean;
  doctorButtonLinked: boolean;
  onCallAgain(): void;
}

/** "Call again" plus the doctor's room-button link status, under the Next button. */
export function DeskStatusRow({ canCallAgain, doctorButtonLinked, onCallAgain }: DeskStatusRowProps) {
  return (
    <div className="flex flex-none gap-[10px]">
      <button
        type="button"
        onClick={onCallAgain}
        disabled={!canCallAgain}
        // px-[6px] is the browser default the design kept; it makes this button 14px wider than the chip, as drawn.
        className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-line-strong bg-surface px-[6px] text-[15px] font-semibold whitespace-nowrap text-ink hover:bg-hover disabled:text-faint disabled:hover:bg-surface"
      >
        <BellIcon size={18} />
        Call again
      </button>
      {/* Equal flex shares at full size with no chip padding, exactly as drawn (182 / 168px);
          on narrower columns (or with the longer "not linked" copy) the chip sizes to its
          text so it stays on one line where it can. */}
      <div
        className={`flex h-[52px] flex-auto items-center justify-center gap-2 rounded-[14px] px-2 text-center text-[13px] font-semibold ${
          doctorButtonLinked ? "bg-teal-tint text-teal-dark min-[1100px]:flex-1 min-[1100px]:px-0" : "bg-subtle text-muted"
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-2 flex-none rounded-full ${doctorButtonLinked ? "bg-teal" : "bg-dash"}`}
        />
        {doctorButtonLinked ? "Doctor's button linked" : "Doctor's button not linked"}
      </div>
    </div>
  );
}
