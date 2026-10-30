import type { ReactNode } from "react";
import { cx } from "./ui";

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Danger tone, as "Emergency" in the walk-in dialog. */
  danger?: boolean;
}

export interface ChoiceChipsProps<T extends string> {
  /** Radio group name; must be unique on the page. */
  name: string;
  legend: ReactNode;
  description?: ReactNode;
  /** T is inferred from `value` alone, so inline option literals and setState setters both fit. */
  options: ChoiceOption<NoInfer<T>>[];
  value: T | null;
  onChange(value: NoInfer<T>): void;
  columns?: 2 | 3 | 4;
  disabled?: boolean;
}

const COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;

/**
 * Single-choice chips styled like the walk-in dialog's toggle buttons, built
 * on native radios so arrow keys, forms and screen readers just work.
 */
export function ChoiceChips<T extends string>({
  name,
  legend,
  description,
  options,
  value,
  onChange,
  columns = 2,
  disabled = false,
}: ChoiceChipsProps<T>) {
  const descriptionId = description ? `${name}-description` : undefined;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={descriptionId} disabled={disabled}>
      <legend className="float-left mb-2 w-full text-[15px] font-semibold">{legend}</legend>
      {description && (
        <p id={descriptionId} className="clear-left -mt-1 mb-1 text-[13px] leading-snug text-muted">
          {description}
        </p>
      )}
      <div className={cx("clear-left grid gap-2", COLUMNS[columns])}>
        {options.map((o) => (
          <label key={o.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cx(
                "flex min-h-[52px] flex-1 cursor-pointer items-center justify-center rounded-[14px] border px-3 py-2 text-center text-[15px] leading-tight",
                "peer-checked:border-2 peer-checked:font-semibold",
                "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal",
                "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
                o.danger
                  ? "border-danger-line bg-surface font-semibold text-danger peer-checked:border-danger peer-checked:bg-danger-tint"
                  : "border-line-strong bg-surface font-medium text-ink hover:bg-hover peer-checked:border-teal peer-checked:bg-teal-tint peer-checked:text-teal-dark",
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
