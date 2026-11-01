"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { pauseMessage, type PauseFormInput } from "@/components/reception/handlers";
import { PauseIcon } from "@/components/icons";
import { formatClock } from "@/lib/time";
import { Dialog } from "./Dialog";
import { CloseButton, cx, fieldErrorClass, inputClass, panelClass, secondaryButtonClass, ToggleButton } from "./controls";

const REASONS = ["Lunch break", "Emergency case", "Ward round", "Tea break"] as const;
const CUSTOM = "custom";
type ReasonChoice = (typeof REASONS)[number] | typeof CUSTOM;

const BACK_IN_MIN = [15, 30, 45] as const;
type BackInChoice = (typeof BACK_IN_MIN)[number] | "unsure";

const MESSAGE_LEAD = "Doctor is on a short break";

/** What patients see: "Lunch break" → "Lunch", "Emergency case" → "Emergency". */
function shortReason(reason: string): string {
  return reason.replace(/ (break|case)$/i, "");
}

export interface PauseQueueModalProps {
  open: boolean;
  doctorName: string;
  /** For the "45 min (1:30 PM)" labels and the backAt it confirms. */
  now: number;
  timezone: string;
  onClose(): void;
  /** The parent pauses the queue and closes the dialog. */
  onConfirm(input: PauseFormInput): void;
  /** Design previews only: paint the artboard's solid backdrop. */
  solidBackdrop?: boolean;
}

/**
 * Artboard 04. Defaults match the artboard: Lunch break, back in 45 min.
 * The artboard's "Also send a WhatsApp update" checkbox is left out until
 * patient messages exist (docs/NOTIFICATIONS.md).
 */
export function PauseQueueModal(props: PauseQueueModalProps) {
  // Mounting the body only while open resets the choices on every opening.
  return props.open ? <PauseDialog {...props} /> : null;
}

function PauseDialog({
  doctorName,
  now,
  timezone,
  onClose,
  onConfirm,
  solidBackdrop,
}: PauseQueueModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const customErrorId = useId();

  const [reasonChoice, setReasonChoice] = useState<ReasonChoice>("Lunch break");
  const [customReason, setCustomReason] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [backIn, setBackIn] = useState<BackInChoice>(45);
  const customRef = useRef<HTMLInputElement>(null);

  const reason = reasonChoice === CUSTOM ? customReason.trim() : shortReason(reasonChoice);
  const backAt = backIn === "unsure" ? null : now + backIn * 60_000;
  const message = pauseMessage(reason || "…", backAt == null ? null : formatClock(backAt, timezone));

  function chooseReason(choice: ReasonChoice) {
    setCustomError(null);
    if (choice !== CUSTOM) {
      setReasonChoice(choice);
      return;
    }
    // Render the input first so it can take focus straight away.
    flushSync(() => setReasonChoice(CUSTOM));
    customRef.current?.focus();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) {
      setCustomError("Type the reason patients will see.");
      customRef.current?.focus();
      return;
    }
    onConfirm({ reason, backAt });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy={titleId}
      describedBy={subtitleId}
      solidBackdrop={solidBackdrop}
    >
      <div className={cx(panelClass, "w-full max-w-[620px]")}>
        {/* Once the title wraps (phones), the close button stays top right instead of floating mid-header. */}
        <div className="flex items-center justify-between gap-4 px-6 pt-[22px] pb-1 max-sm:items-start">
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="font-display text-[26px] font-bold max-sm:leading-[1.15]">
              Pause {doctorName}&apos;s queue
            </h2>
            <p id={subtitleId} className="text-[14px] text-muted">
              Nobody loses their place. ETAs freeze until you resume.
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pt-4 pb-6">
          <fieldset>
            <legend className="mb-2.5 text-[15px] font-semibold">Reason patients will see</legend>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <ToggleButton
                  key={r}
                  pressed={reasonChoice === r}
                  onClick={() => chooseReason(r)}
                  className="h-[52px] rounded-full px-[18px]"
                >
                  {r}
                </ToggleButton>
              ))}
              <ToggleButton
                pressed={reasonChoice === CUSTOM}
                onClick={() => chooseReason(CUSTOM)}
                className="h-[52px] rounded-full px-[18px]"
              >
                Type your own
              </ToggleButton>
            </div>
            {reasonChoice === CUSTOM && (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  ref={customRef}
                  type="text"
                  aria-label="Your reason"
                  placeholder="e.g. Home visit"
                  maxLength={40}
                  autoComplete="off"
                  enterKeyHint="go"
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setCustomError(null);
                  }}
                  aria-invalid={customError ? true : undefined}
                  aria-describedby={customError ? customErrorId : undefined}
                  className={inputClass(!!customError)}
                />
                {customError && (
                  <p id={customErrorId} className={fieldErrorClass}>
                    {customError}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-[15px] font-semibold">Back in</legend>
            <div className="flex flex-wrap gap-2">
              {BACK_IN_MIN.map((min) => (
                <ToggleButton
                  key={min}
                  pressed={backIn === min}
                  onClick={() => setBackIn(min)}
                  className="h-[52px] rounded-full px-[18px]"
                >
                  {backIn === min ? `${min} min (${formatClock(now + min * 60_000, timezone)})` : `${min} min`}
                </ToggleButton>
              ))}
              <ToggleButton
                pressed={backIn === "unsure"}
                onClick={() => setBackIn("unsure")}
                className="h-[52px] rounded-full px-[18px]"
              >
                Not sure
              </ToggleButton>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2 rounded-2xl bg-canvas p-4">
            <span className="text-[12px] font-bold tracking-[0.08em] text-muted uppercase">
              Patients and TV will show
            </span>
            <p aria-live="polite" className="text-[16px]">
              {message.startsWith(MESSAGE_LEAD) ? (
                <>
                  <strong>{MESSAGE_LEAD}</strong>
                  {message.slice(MESSAGE_LEAD.length)}
                </>
              ) : (
                message
              )}
            </p>
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className={cx(secondaryButtonClass, "h-[60px] flex-1 px-1.5")}>
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-[60px] flex-2 items-center justify-center gap-2.5 rounded-2xl bg-ink px-1.5 font-display text-[19px] font-bold text-white hover:bg-teal-ink"
            >
              <PauseIcon size={18} />
              Pause queue
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
