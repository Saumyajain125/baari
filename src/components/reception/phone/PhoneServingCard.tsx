import { BellIcon } from "@/components/icons";
import type { ServingView } from "@/lib/view";
import { KeepTokens } from "./KeepTokens";

export interface PhoneServingCardProps {
  serving: ServingView | null;
  /** "A-00": the greyed-out token shown while nobody is with the doctor. */
  placeholderLabel: string;
  /** Copy for the empty card, e.g. "Nobody yet. First token today will be A-01." */
  emptyText: string;
  /** True while the options sheet for the serving patient is open. */
  optionsOpen: boolean;
  /** Opens the sheet with "Call again" and "Not here? Move back 2". */
  onOpenOptions(trigger: HTMLElement): void;
  onCallAgain(): void;
}

const CARD = "mx-4 mt-3 flex items-center gap-[14px] rounded-[18px] border border-line bg-surface px-4 py-[14px]";
const TOKEN = "font-display text-[44px] leading-none font-extrabold";

/** "With doctor" card: token, time in room, name and a one-tap "Call again". */
export function PhoneServingCard({
  serving,
  placeholderLabel,
  emptyText,
  optionsOpen,
  onOpenOptions,
  onCallAgain,
}: PhoneServingCardProps) {
  if (!serving) {
    return (
      <section aria-label="Current patient" className={CARD}>
        <span aria-hidden="true" className={`${TOKEN} text-line-strong`}>
          {placeholderLabel}
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-balance text-muted">
          <KeepTokens text={emptyText} />
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Current patient" className={CARD}>
      {/* The token and name double as the way into "Not here? Move back 2" on the phone. */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={optionsOpen}
        aria-label={`${serving.label} ${serving.name}, with doctor. More options`}
        onClick={(event) => onOpenOptions(event.currentTarget)}
        className="-my-1 -ml-1 flex min-w-0 flex-1 items-center gap-[14px] rounded-[12px] py-1 pl-1 text-left"
      >
        <span className={`${TOKEN} text-teal`}>{serving.label}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] text-muted">With doctor · {serving.inRoom}</span>
          <span className="line-clamp-2 font-semibold break-words">{serving.name}</span>
          {serving.pending && <span className="text-[12px] font-semibold text-balance text-warn">Saved offline, not synced</span>}
        </span>
      </button>
      <button
        type="button"
        aria-label="Call again"
        onClick={onCallAgain}
        className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-ink hover:bg-teal-tint"
      >
        <BellIcon size={20} />
      </button>
    </section>
  );
}
