/**
 * Form pieces for the account screens (login, setup, settings), drawn from the
 * dialogs in artboards 02 and 04: 56px inputs with 14px radii and a 2px teal
 * focus border, toggle buttons, and 60px Baloo primary buttons.
 */
import type { ComponentPropsWithRef, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** 56px input, as the walk-in dialog. Invalid fields keep a red border even when focused. */
export const inputClass = cx(
  "h-14 w-full min-w-0 rounded-[14px] border border-line-strong bg-surface px-4 text-[18px] text-ink",
  "placeholder:text-faint focus:border-teal focus:ring-1 focus:ring-teal focus:ring-inset focus-visible:outline-none",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger aria-[invalid=true]:ring-inset",
  "disabled:bg-subtle disabled:text-faint",
);

export const labelClass = "text-[15px] font-semibold";

/** Native select drawn as the 56px input; wrap it in `relative` and add <SelectChevron />. */
export const selectClass = cx(inputClass, "appearance-none pr-12");

/** The design's chevron in place of the platform's select arrow. */
export function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export interface TextFieldProps extends Omit<ComponentPropsWithRef<"input">, "id"> {
  id: string;
  label: ReactNode;
  /** Muted text after the label, e.g. "(optional)". */
  labelHint?: ReactNode;
  /** Muted line under the input. Replaced by the error when there is one. */
  hint?: ReactNode;
  error?: string | null;
  /** Element drawn inside the input's right edge (e.g. a show-password button). */
  trailing?: ReactNode;
  inputClassName?: string;
}

export function TextField({
  id,
  label,
  labelHint,
  hint,
  error,
  trailing,
  inputClassName,
  className,
  ...input
}: TextFieldProps) {
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={cx("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {labelHint && <span className="font-normal text-muted"> {labelHint}</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={cx(inputClass, trailing ? "pr-[60px]" : null, inputClassName)}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {note && (
        <p id={noteId} className={cx("text-[13px] leading-snug", error ? "font-semibold text-danger" : "text-muted")}>
          {note}
        </p>
      )}
    </div>
  );
}

type ButtonProps = ComponentPropsWithRef<"button">;

/** Big teal action, "Issue token A-25" style. `busy` keeps the label but blocks double submits. */
export function PrimaryButton({ busy = false, className, disabled, children, ...props }: ButtonProps & { busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "flex h-[60px] items-center justify-center gap-[10px] rounded-[16px] bg-teal px-6 font-display text-[19px] leading-none font-bold text-white transition-colors",
        "hover:bg-teal-dark disabled:bg-teal/60 aria-busy:cursor-progress",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Outlined companion button, "Cancel" style. */
export function SecondaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "flex h-[60px] items-center justify-center gap-2 rounded-[16px] border border-line-strong bg-surface px-6 text-[16px] font-semibold text-ink transition-colors",
        "hover:bg-hover disabled:text-faint disabled:hover:bg-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Toggle button as the doctor and visit-type choices: selected = 2px teal border on teal tint. */
export function ToggleButton({ pressed, className, children, ...props }: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...props}
      className={cx(
        "h-14 rounded-[14px] px-3 text-[15px] transition-colors",
        pressed
          ? "border-2 border-teal bg-teal-tint font-semibold text-teal-dark"
          : "border border-line-strong bg-surface font-medium text-ink hover:bg-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Quiet text button in teal ink, like the PIN pad's "Forgot?". */
export function LinkButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex min-h-11 items-center rounded-[10px] px-1 text-[15px] font-semibold text-teal-dark hover:text-teal-darker hover:underline disabled:text-faint disabled:no-underline",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** "PATIENTS AND TV WILL SHOW" style label. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("text-[12px] font-bold tracking-[0.08em] text-muted uppercase", className)}>{children}</p>
  );
}

export function ErrorNote({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="rounded-[14px] border border-danger-line bg-danger-tint px-4 py-3 text-[15px] leading-snug font-medium text-danger"
    >
      {children}
    </p>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-[14px] bg-teal-tint px-4 py-3 text-[15px] leading-snug font-medium text-teal-dark">
      {children}
    </p>
  );
}
