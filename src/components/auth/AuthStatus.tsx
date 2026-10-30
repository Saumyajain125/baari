import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { cx } from "./ui";

/**
 * Branded full-screen loading state for the moments between screens:
 * restoring the session, loading the clinic, following a redirect.
 */
export function AuthLoading({ label = "Opening your clinic…" }: { label?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4 text-ink" aria-busy>
      <div role="status" className="flex flex-col items-center gap-4">
        <span className="animate-pulse motion-reduce:animate-none">
          <LogoMark size={64} />
        </span>
        <span className="font-display text-[28px] leading-none font-extrabold text-teal">baari</span>
        <span className="text-[15px] text-muted">{label}</span>
      </div>
    </main>
  );
}

export interface AuthProblemProps {
  title: string;
  body: ReactNode;
  actions?: { label: string; onClick(): void; primary?: boolean }[];
}

/** A calm card for account problems (no access, failed load), with ways out. */
export function AuthProblem({ title, body, actions = [] }: AuthProblemProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4 text-ink">
      <div
        role="alert"
        className="flex w-full max-w-[460px] flex-col items-center gap-4 rounded-[24px] border border-line bg-surface px-6 py-10 text-center sm:px-10"
      >
        <LogoMark size={56} />
        <h1 className="font-display text-[26px] leading-tight font-bold">{title}</h1>
        <div className="text-[15px] leading-normal text-muted">{body}</div>
        {actions.length > 0 && (
          <div className="mt-2 flex w-full flex-col gap-[10px] sm:flex-row">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={cx(
                  "h-14 flex-1 rounded-[16px] px-5 text-[16px] font-semibold transition-colors",
                  a.primary ? "bg-teal text-white hover:bg-teal-dark" : "border border-line-strong bg-surface hover:bg-hover",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
