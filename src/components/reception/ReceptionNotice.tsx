import { LogoMark } from "@/components/brand/Logo";

export interface ReceptionNoticeProps {
  title: string;
  body?: string;
  /** Loading states: a softly pulsing mark, announced politely. */
  busy?: boolean;
  action?: { label: string; onClick(): void };
}

/**
 * Calm full-screen card for the desk's in-between states (loading, signing
 * out, a failed subscription, no doctors yet) in the reception visual language.
 */
export function ReceptionNotice({ title, body, busy = false, action }: ReceptionNoticeProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4 text-ink" aria-busy={busy || undefined}>
      <div
        role={busy ? "status" : undefined}
        className="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-[20px] border border-line bg-surface px-6 py-10 text-center sm:px-10"
      >
        <span className={busy ? "animate-pulse motion-reduce:animate-none" : undefined}>
          <LogoMark size={56} />
        </span>
        <h1 className="font-display text-[24px] leading-tight font-bold">{title}</h1>
        {body && <p className="text-[15px] leading-normal text-muted">{body}</p>}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 h-12 rounded-[14px] bg-teal px-6 text-[15px] font-bold text-white hover:bg-teal-dark"
          >
            {action.label}
          </button>
        )}
      </div>
    </main>
  );
}
