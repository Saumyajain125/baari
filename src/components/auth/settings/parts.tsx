import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "../ui";

/** White panel with a 1px line border, as the desk's cards. */
export function Card({ labelledBy, children, className }: { labelledBy: string; children: ReactNode; className?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cx("flex min-w-0 flex-col gap-5 rounded-[16px] border border-line bg-surface p-5 sm:p-6", className)}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  // Phones: the action sits beside the title and the description runs full width
  // under both. From sm up the action spans the title and description rows.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:items-start">
      <h2 id={id} className="font-display text-[22px] leading-[1.15] font-bold">
        {title}
      </h2>
      {action && <div className="col-start-2 row-start-1 sm:row-span-2">{action}</div>}
      {description && (
        <p
          className={cx(
            "col-span-2 col-start-1 text-[14px] leading-normal text-pretty text-muted",
            action ? "sm:col-span-1" : null,
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

type ButtonProps = ComponentPropsWithRef<"button">;

/**
 * 44px row action ("Edit", "Reset PIN"), in the outlined style of the desk's
 * "Print QR poster" button. `tone="danger"` for destructive ones.
 */
export function RowButton({
  tone = "default",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps & { tone?: "default" | "danger" | "danger-solid" | "primary"; size?: "md" | "lg" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-11 px-4 text-[14px]" : "h-12 px-5 text-[15px]",
        tone === "primary" && "bg-teal text-white hover:bg-teal-dark",
        tone === "danger" && "border border-danger-line bg-surface text-danger hover:bg-danger-tint",
        tone === "danger-solid" && "bg-danger text-white hover:bg-danger/90",
        tone === "default" && "border border-line-strong bg-surface text-ink hover:bg-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Outlined link in the same footprint as RowButton, for pages that open in a new tab. */
export function RowLink({ className, children, ...props }: ComponentPropsWithRef<"a">) {
  return (
    <a
      {...props}
      className={cx(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-line-strong bg-surface px-4 text-[14px] font-semibold whitespace-nowrap text-teal-dark no-underline transition-colors hover:bg-hover",
        className,
      )}
    >
      {children}
    </a>
  );
}

/** Inline "are you sure" strip that replaces a row's actions. */
export function InlineConfirm({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: ReactNode;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
}) {
  return (
    <div
      role="group"
      aria-label="Confirm"
      className="flex flex-col gap-3 rounded-[14px] border border-danger-line bg-danger-tint p-4 sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 text-[14px] leading-normal text-danger">{message}</p>
      <div className="flex gap-2">
        <RowButton onClick={onCancel} autoFocus>
          Cancel
        </RowButton>
        <RowButton tone="danger-solid" onClick={onConfirm}>
          {confirmLabel}
        </RowButton>
      </div>
    </div>
  );
}

/** Save / Cancel pair under an inline editor. `busy` holds the save button while a check runs. */
export function EditorActions({
  saveLabel,
  onCancel,
  busy = false,
  tone = "primary",
}: {
  saveLabel: string;
  onCancel(): void;
  busy?: boolean;
  tone?: "primary" | "danger-solid";
}) {
  return (
    <div className="flex justify-end gap-2">
      <RowButton size="lg" onClick={onCancel}>
        Cancel
      </RowButton>
      <RowButton size="lg" type="submit" tone={tone} disabled={busy} aria-busy={busy || undefined}>
        {saveLabel}
      </RowButton>
    </div>
  );
}
