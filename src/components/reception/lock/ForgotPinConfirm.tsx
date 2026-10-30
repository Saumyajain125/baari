"use client";

import { useEffect, useId, useRef } from "react";

export interface ForgotPinConfirmProps {
  /** Signing back in needs the clinic account online, so signing out is held back while offline. */
  online: boolean;
  onCancel(): void;
  onConfirm(): void;
}

/**
 * Takes the keypad's place after "Forgot?": signing the device out is the only
 * way past a forgotten PIN, and it needs the clinic password, so it is asked
 * once rather than done on a stray tap. Cancel is focused, the safe default.
 */
export function ForgotPinConfirm({ online, onCancel, onConfirm }: ForgotPinConfirmProps) {
  const titleId = useId();
  const bodyId = useId();
  const offlineId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => cancelRef.current?.focus(), []);

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="flex min-h-[244px] flex-[0_1_340px] flex-col justify-center gap-4 rounded-[20px] bg-surface p-6 shadow-[0_1px_0_var(--color-line),0_2px_6px_rgb(20_33_33/0.06)]"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={titleId} className="font-display text-[24px] leading-tight font-bold">
          Sign this device out?
        </h2>
        <p id={bodyId} className="text-[15px] text-muted">
          You&apos;ll need the clinic email and password to get back in.
        </p>
      </div>
      {!online && (
        <p id={offlineId} role="status" className="rounded-[12px] bg-amber-tint px-3 py-2 text-[14px] font-semibold text-amber">
          You&apos;re offline. Signing back in needs the internet, so connect first.
        </p>
      )}
      <div className="flex gap-2.5">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="h-14 flex-1 rounded-[16px] border border-line-strong bg-surface text-[16px] font-semibold text-ink hover:bg-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!online}
          aria-describedby={online ? undefined : offlineId}
          className="h-14 flex-1 rounded-[16px] bg-danger font-display text-[18px] font-bold text-white disabled:bg-line-strong disabled:text-faint"
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
