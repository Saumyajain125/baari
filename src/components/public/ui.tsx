import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";

/** Joins class names, skipping falsy parts. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** "1:30 PM" never splits across lines: the space before AM/PM becomes non-breaking. */
export function keepTimesTogether(text: string): string {
  return text.replace(/(\d) (AM|PM)\b/g, "$1\u00a0$2");
}

/** Path patients open to join a clinic's queue (what the QR codes encode). */
export function joinPath(clinicId: string): string {
  return `/q/${encodeURIComponent(clinicId)}`;
}

export function statusPath(clinicId: string, ticketId: string): string {
  return `${joinPath(clinicId)}/${encodeURIComponent(ticketId)}`;
}

/** Uppercase section label, as "WITH DOCTOR NOW" in the reception artboards. */
export const eyebrowClass = "text-[12px] font-bold tracking-[0.08em] text-muted uppercase";

/*
 * Button looks. They leave size, radius, gap and padding to the caller: two
 * Tailwind classes for the same property (rounded-[20px] + rounded-[14px])
 * resolve by stylesheet order, not by the order they're written, so a base
 * class must never carry a property a caller overrides.
 */

/** Teal fill with the pressed-key shadow used by "Next patient". */
export const primaryButtonClass =
  "flex items-center justify-center bg-teal text-white shadow-[0_4px_0_var(--color-teal-dark)] transition-[translate,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-teal-dark)] disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none";

/** Outlined white button (Cancel, Done, Print QR poster). */
export const secondaryButtonClass =
  "flex items-center justify-center gap-2 rounded-[14px] border border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-hover";

export interface PublicMessageProps {
  title: string;
  children?: ReactNode;
  /** Optional call to action under the copy. */
  action?: ReactNode;
  /** Shows the soft logo mark above the title, as the artboard 03 empty state. */
  illustrated?: boolean;
}

/**
 * Centred full-screen message for loading, missing and error states on the
 * public pages, in the "Fresh queue for today" empty-state style.
 */
export function PublicMessage({ title, children, action, illustrated = true }: PublicMessageProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-[24px] border border-line bg-surface px-6 py-10 text-center">
        {illustrated && <LogoMark variant="empty" size={96} />}
        <h1 className="font-display text-[24px] leading-tight font-bold">{title}</h1>
        {children && <div className="text-[15px] leading-relaxed text-muted">{children}</div>}
        {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
      </div>
    </main>
  );
}

/** Shown on public pages when the app has no Firebase project configured yet. */
export function FirebaseMissing() {
  return (
    <PublicMessage title="This clinic isn't connected yet">
      The queue needs a Firebase project. Copy <code className="font-semibold">.env.example</code> to{" "}
      <code className="font-semibold">.env.local</code>, fill in your project&apos;s web config and restart the app.
    </PublicMessage>
  );
}

/** Branded loading state while the first snapshot arrives. */
export function PublicLoading({ label = "Loading the queue…" }: { label?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4" aria-busy="true">
      <span className="animate-pulse">
        <LogoMark size={56} />
      </span>
      <p role="status" className="text-[15px] font-medium text-muted">
        {label}
      </p>
    </main>
  );
}

/** Route params arrive percent-encoded on some paths; decoding twice is harmless for Firestore ids. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
