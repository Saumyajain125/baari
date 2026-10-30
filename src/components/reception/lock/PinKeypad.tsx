import { BackspaceIcon } from "@/components/icons";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const KEY = "flex items-center justify-center rounded-[20px] select-none touch-manipulation";
const DIGIT_KEY = `${KEY} bg-surface font-display text-[30px] font-bold text-ink shadow-[0_1px_0_var(--color-line),0_2px_6px_rgb(20_33_33/0.06)] active:translate-y-px active:bg-subtle active:shadow-none`;
const QUIET_KEY = `${KEY} bg-transparent active:bg-subtle`;

export interface PinKeypadProps {
  /** Verifying: keys ignore presses (aria-disabled keeps focus where it is). */
  busy: boolean;
  onDigit(digit: string): void;
  onDelete(): void;
  onForgot(): void;
}

/** 3×4 phone-style keypad: 1–9, then Forgot? / 0 / delete. */
export function PinKeypad({ busy, onDigit, onDelete, onForgot }: PinKeypadProps) {
  const digitKey = (digit: string) => (
    <button key={digit} type="button" aria-disabled={busy} onClick={() => onDigit(digit)} className={DIGIT_KEY}>
      {digit}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="PIN keypad"
      // Four equal rows in a 340px box = the design's 76px keys. In a short column the box gives way
      // (keys never below 52px). The dim is delayed so an instant check doesn't flicker.
      className={`grid min-h-[244px] flex-[0_1_340px] grid-cols-3 grid-rows-4 gap-3 transition-opacity ${busy ? "opacity-60 delay-150" : ""}`}
    >
      {DIGITS.map(digitKey)}
      <button
        type="button"
        aria-label="Forgot PIN?"
        onClick={onForgot}
        className={`${QUIET_KEY} text-[15px] font-semibold text-teal-dark`}
      >
        Forgot?
      </button>
      {digitKey("0")}
      <button type="button" aria-label="Delete" aria-disabled={busy} onClick={onDelete} className={`${QUIET_KEY} text-ink`}>
        <BackspaceIcon size={28} />
      </button>
    </div>
  );
}
