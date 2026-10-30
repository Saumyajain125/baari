"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ForgotPinConfirm } from "./ForgotPinConfirm";
import { readLastStaffId, rememberLastStaffId, subscribeLastStaffId } from "./lastStaff";
import { PinDots } from "./PinDots";
import { PinKeypad } from "./PinKeypad";
import { StaffPicker, type LockStaff } from "./StaffPicker";

export type { LockStaff } from "./StaffPicker";

export const PIN_LENGTH = 4;

const WRONG_PIN = "Wrong PIN, try again";
const CHECK_FAILED = "Couldn't check the PIN, try again";

const SHAKE: Keyframe[] = [0, -10, 10, -8, 8, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` }));
const SHAKE_MS = 420;

export interface PinLockProps {
  clinicName: string;
  /** "Thu, 29 Oct" */
  dateLabel: string;
  /** Shown in the footnote: "Locked automatically after 10 min idle …" */
  lockAfterMin: number;
  staff: LockStaff[];
  /** Preselected staff; otherwise whoever last unlocked this device, then the first. */
  defaultStaffId?: string;
  /** Resolves true when the PIN matches. A rejection reads as "couldn't check". */
  onVerify(staffId: string, pin: string): Promise<boolean>;
  onUnlocked(staffId: string): void;
  onForgot(): void;
  /** Preview only: digits already typed, so the artboard's half-filled dots render. Production never passes it. */
  initialPin?: string;
}

/** entry: accepting digits · checking: onVerify in flight · rejected: wrong PIN, dots shaking. */
type Phase = "entry" | "checking" | "rejected";

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Full-screen reception lock (artboard 06). Opens as a native modal dialog so
 * the desk underneath is inert and sits above any other overlay; Esc can't
 * close it. Digits and Backspace on a physical keyboard work anywhere on it,
 * and keystrokes never leak to desk shortcuts underneath.
 */
export function PinLock({
  clinicName,
  dateLabel,
  lockAfterMin,
  staff,
  defaultStaffId,
  onVerify,
  onUnlocked,
  onForgot,
  initialPin = "",
}: PinLockProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  const rememberedId = useSyncExternalStore(subscribeLastStaffId, readLastStaffId, () => null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pin, setPin] = useState(() => initialPin.replace(/\D/g, "").slice(0, PIN_LENGTH));
  const [phase, setPhase] = useState<Phase>("entry");
  const [error, setError] = useState<string | null>(null);
  // "Forgot?" signs the device out, so it asks first (in place of the keypad).
  const [confirmingForgot, setConfirmingForgot] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  // Derived so a staff list that changes underneath (someone removed in Settings) never strands the selection.
  const staffId =
    [pickedId, defaultStaffId, rememberedId].find((id) => id != null && staff.some((s) => s.id === id)) ??
    staff[0]?.id ??
    null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // Focus the dialog itself, not the first staff card: a stray Enter must not switch staff.
    dialog.focus();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  function pressDigit(digit: string) {
    if (phase !== "entry" || staffId === null || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === PIN_LENGTH) void submit(staffId, next);
  }

  function pressDelete() {
    if (phase !== "entry") return;
    setPin((current) => current.slice(0, -1));
    setError(null);
  }

  function selectStaff(id: string) {
    if (phase !== "entry" || id === staffId) return;
    setPickedId(id);
    setPin("");
    setError(null);
  }

  async function submit(forStaffId: string, candidate: string) {
    setPhase("checking");
    let ok = false;
    let failure = WRONG_PIN;
    try {
      ok = await onVerify(forStaffId, candidate);
    } catch {
      failure = CHECK_FAILED;
    }

    if (ok) {
      rememberLastStaffId(forStaffId);
      setPin("");
      setPhase("entry");
      onUnlocked(forStaffId);
      return;
    }

    setError(failure);
    setPhase("rejected");
    await shake(dotsRef.current);
    setPin("");
    setPhase("entry");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    // The lock owns the keyboard: nothing typed here reaches desk shortcuts (Next, Undo, ...) underneath.
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      if (confirmingForgot) cancelForgot();
      return;
    }
    // The keypad is hidden while confirming; Tab and Enter still work its buttons.
    if (confirmingForgot) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      if (!event.repeat) pressDigit(event.key);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      pressDelete();
    }
  }

  function cancelForgot() {
    setConfirmingForgot(false);
    dialogRef.current?.focus();
  }

  const footnote = `Locked automatically after ${lockAfterMin} min idle so patients can't tap the screen.`;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Reception locked"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onCancel={(event) => event.preventDefault()}
      onClose={(event) => {
        // Browsers may force-close a modal on repeated Esc; a lock must stay up until unlocked.
        const dialog = event.currentTarget;
        if (!dialog.open && dialog.isConnected) dialog.showModal();
      }}
      aria-busy={phase === "checking"}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-canvas p-0 leading-[normal] text-ink outline-none backdrop:bg-canvas"
    >
      <div className="flex h-full flex-col lg:flex-row">
        {/* Brand panel: a full-height teal column on wide screens, a header strip on narrow ones. */}
        <section className="flex shrink-0 items-start gap-3 bg-teal px-4 py-4 text-white sm:px-6 lg:flex-1 lg:flex-col lg:items-stretch lg:justify-between lg:gap-0 lg:p-14">
          <div className="flex shrink-0 items-center gap-3 [&>svg]:size-10 lg:[&>svg]:size-11">
            <LogoMark variant="inverse" size={44} />
            <span className="hidden font-display text-[32px] font-extrabold lg:inline">baari</span>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 lg:gap-[10px]">
            <p className="font-display text-[22px] leading-[1.1] font-bold lg:text-[40px]">{clinicName}</p>
            <p className="text-[14px] opacity-90 lg:text-[18px]">Reception · {dateLabel}</p>
            <p className="mt-2 self-start rounded-full bg-white/16 px-3 py-1 text-[13px] font-semibold lg:mt-3 lg:px-[14px] lg:py-2 lg:text-[15px]">
              Queue keeps running while locked
            </p>
          </div>
          <p className="hidden text-[14px] opacity-85 lg:block">{footnote}</p>
        </section>

        {/*
          PIN column: centred under the strip on narrow screens, top-aligned beside the panel on wide ones.
          On short viewports (phone browsers with toolbars) the gaps tighten, the footnote drops and the
          keypad shrinks so the whole keypad stays on screen; it only scrolls once keys would go under 52px.
        */}
        <section className="mx-auto flex min-h-0 w-full max-w-[520px] flex-1 flex-col justify-center-safe gap-[clamp(12px,2.7dvh,22px)] overflow-y-auto overscroll-contain px-4 py-6 sm:px-14 sm:py-12 lg:m-0 lg:w-[520px] lg:flex-none lg:justify-start lg:gap-[22px]">
          <h1 className="font-display text-[30px] font-bold">Who&apos;s at the desk?</h1>

          {staff.length > 0 ? (
            <StaffPicker staff={staff} selectedId={staffId} onSelect={selectStaff} />
          ) : (
            <p className="text-[15px] text-muted">
              No staff PINs are set up yet. Tap Forgot? to sign in with the clinic account.
            </p>
          )}

          <div className="flex flex-col items-center gap-[10px]">
            <p className="text-[15px] font-semibold">
              {error === null && `Enter your ${PIN_LENGTH} digit PIN`}
              <span aria-live="assertive" className="text-danger">
                {error}
              </span>
            </p>
            <PinDots
              ref={dotsRef}
              length={PIN_LENGTH}
              filled={pin.length}
              tone={phase === "rejected" ? "error" : "default"}
            />
          </div>

          {confirmingForgot ? (
            <ForgotPinConfirm online={online} onCancel={cancelForgot} onConfirm={onForgot} />
          ) : (
            <PinKeypad
              busy={phase === "checking"}
              onDigit={pressDigit}
              onDelete={pressDelete}
              onForgot={() => setConfirmingForgot(true)}
            />
          )}

          <p className="text-center text-[13px] text-muted lg:hidden [@media(max-height:699px)]:hidden">{footnote}</p>
        </section>
      </div>
    </dialog>
  );
}

/** Wrong-PIN shake; with reduced motion the red dots just hold for a beat instead. */
async function shake(el: HTMLElement | null): Promise<void> {
  const still = !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) {
    await new Promise((resolve) => setTimeout(resolve, SHAKE_MS));
    return;
  }
  try {
    await el.animate(SHAKE, { duration: SHAKE_MS, easing: "ease-in-out" }).finished;
  } catch {
    // Cancelled (e.g. unmounted mid-shake): nothing left to wait for.
  }
}
