import type { ButtonHTMLAttributes } from "react";
import { CloseIcon } from "@/components/icons";

/** Joins class names, skipping falsy parts. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** The white card both dialogs (and the token-issued panel) are built from. */
export const panelClass =
  "flex flex-col rounded-3xl bg-surface text-ink leading-[normal] shadow-[0_24px_60px_rgb(20_33_33/0.35)]";

/** Outlined white button: Cancel, Done. Height is set by the caller. */
export const secondaryButtonClass =
  "rounded-2xl border border-line-strong bg-surface text-[16px] font-semibold text-ink hover:bg-hover disabled:opacity-60";

/** Inline field error under an input. */
export const fieldErrorClass = "text-[14px] font-medium text-danger";

/**
 * Text input as drawn in the design: 56px, 14px radius, 18px text. The 2px
 * teal border is the focus indicator in place of the global outline; an
 * invalid field keeps its red border and gains a soft red ring on focus.
 * The placeholder grey is the browser default the artboard was drawn with
 * (#757575, 4.6:1 on white); Tailwind's preflight would otherwise fade it.
 */
export function inputClass(invalid: boolean): string {
  return cx(
    "h-14 w-full rounded-[14px] bg-surface px-4 text-[18px] font-normal text-ink outline-none placeholder:text-[#757575]",
    invalid
      ? "border-2 border-danger focus:ring-4 focus:ring-danger/20"
      : "border border-line-strong focus:border-2 focus:border-teal",
  );
}

export function CloseButton({ onClick, disabled }: { onClick(): void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      disabled={disabled}
      className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-subtle text-ink hover:bg-hover disabled:opacity-60"
    >
      <CloseIcon size={20} />
    </button>
  );
}

type Tone = "teal" | "danger";

const TOGGLE_TONES: Record<Tone, { on: string; off: string }> = {
  teal: {
    on: "border-2 border-teal bg-teal-tint font-semibold text-teal-dark",
    off: "border border-line-strong bg-surface font-medium text-ink hover:bg-hover",
  },
  danger: {
    on: "border-2 border-danger bg-danger-tint font-semibold text-danger",
    off: "border border-danger-line bg-surface font-semibold text-danger hover:bg-danger-tint",
  },
};

interface ToggleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-pressed"> {
  pressed: boolean;
  tone?: Tone;
}

/** aria-pressed choice button (doctor, visit type, pause reason chips). Size and radius come from className. */
export function ToggleButton({ pressed, tone = "teal", className, ...rest }: ToggleButtonProps) {
  const t = TOGGLE_TONES[tone];
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx("text-[15px]", pressed ? t.on : t.off, className)}
      {...rest}
    />
  );
}
