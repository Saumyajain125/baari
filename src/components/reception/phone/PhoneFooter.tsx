import { Fragment } from "react";
import { PlusIcon } from "@/components/icons";
import { KeepTokens } from "./KeepTokens";

/**
 * What the big button says. Disabled renders the dashed, greyed-out variant
 * (start of day, or the queue is paused) with its own title.
 */
export type PhoneNextState = { enabled: true; detail: string } | { enabled: false; title: string; detail: string };

export interface PhoneFooterProps {
  next: PhoneNextState;
  onAddWalkIn(): void;
  onNext(): void;
}

/**
 * The artboard's "→" is a fallback glyph (Baloo 2 has no U+2192): a 2.5px
 * shaft and a solid, slightly blunt head, sitting a little above the line's
 * centre. Draw that shape so it looks the same on every phone instead of
 * whatever arrow the OS fallback font happens to have.
 */
function ArrowGlyph() {
  return (
    <svg
      width="20"
      height="13"
      viewBox="0 0 20 13"
      fill="currentColor"
      aria-hidden="true"
      className="mt-[4.2px] mr-[1.7px] shrink-0 self-start"
    >
      <rect x="0" y="5" width="13.6" height="2.5" />
      <path d="M13.2 0.65h.75l5.15 5.15v.8l-5 5H13.2z" />
    </svg>
  );
}

/**
 * The small line under the button title. When it has two sentences ("Still
 * works offline. Call the name out loud.") a narrow phone breaks between them
 * rather than mid-sentence; a single sentence wraps balanced. Token labels
 * never split at their hyphen.
 */
function Detail({ text }: { text: string }) {
  const sentences = text.split(/(?<=\.) /);
  if (sentences.length === 1) return <KeepTokens text={text} />;
  return sentences.map((sentence, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="inline-block">
        <KeepTokens text={sentence} />
      </span>
    </Fragment>
  ));
}

/** Thumb zone: the 72×72 "Walk-in" button beside the big "Next patient →". */
export function PhoneFooter({ next, onAddWalkIn, onNext }: PhoneFooterProps) {
  return (
    <footer className="flex gap-[10px] border-t border-line bg-surface px-4 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
      <button
        type="button"
        aria-label="Add walk-in"
        onClick={onAddWalkIn}
        className="flex size-[72px] shrink-0 flex-col items-center justify-center gap-[2px] rounded-[20px] border border-line-strong bg-surface text-[11px] font-semibold text-ink hover:bg-hover"
      >
        <PlusIcon size={22} />
        Walk-in
      </button>

      {next.enabled ? (
        <button
          type="button"
          onClick={onNext}
          className="flex h-[72px] min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] bg-teal px-3 text-white shadow-[0_4px_0_var(--color-teal-dark)] transition-[translate,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-teal-dark)]"
        >
          <span className="flex gap-[7.3px] font-display text-[24px] leading-[1.1] font-extrabold">
            Next patient
            <ArrowGlyph />
          </span>
          <span className="line-clamp-2 max-w-full text-center text-[12px] leading-[14px] text-balance opacity-90">
            <Detail text={next.detail} />
          </span>
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="flex h-[72px] min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-line-strong bg-surface px-3 text-faint"
        >
          <span className="font-display text-[22px] leading-[1.1] font-extrabold">{next.title}</span>
          <span className="line-clamp-2 max-w-full text-center text-[12px] leading-[14px] text-balance">
            <Detail text={next.detail} />
          </span>
        </button>
      )}
    </footer>
  );
}
