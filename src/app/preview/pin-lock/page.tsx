"use client";

import { useState } from "react";
import { PinLock } from "@/components/reception/lock/PinLock";
import { useIdleLock } from "@/components/reception/lock/useIdleLock";
import { designHeader, designStaff } from "@/lib/fixtures";

/** Any staff member unlocks with this PIN in the preview. */
const PREVIEW_PIN = "1234";
const LOCK_AFTER_MIN = 10;

/**
 * Artboard 06 on first render: Rekha selected, 2 of 4 digits entered. After
 * that it behaves like the desk: unlock with 1234, and it locks itself again
 * after 10 min idle (or via "Lock again"), preselecting whoever unlocked last.
 */
export default function PinLockPreview() {
  const [unlockedAs, setUnlockedAs] = useState<string | null>(null);
  const [firstLock, setFirstLock] = useState(true);

  useIdleLock({ minutes: LOCK_AFTER_MIN, enabled: unlockedAs !== null, onIdle: () => setUnlockedAs(null) });

  const name = designStaff.find((s) => s.id === unlockedAs)?.name;

  return (
    <>
      {unlockedAs ? (
        <main className="grid h-dvh place-items-center bg-canvas">
          <div className="flex flex-col items-center gap-4 text-[16px]">
            <p>
              Unlocked as {name}. Locks again after {LOCK_AFTER_MIN} min idle.
            </p>
            <button
              type="button"
              onClick={() => setUnlockedAs(null)}
              className="min-h-11 rounded-[12px] bg-teal px-5 font-semibold text-white"
            >
              Lock again
            </button>
          </div>
        </main>
      ) : (
        <PinLock
          clinicName={designHeader.clinicName}
          dateLabel={designHeader.dateLabel}
          lockAfterMin={LOCK_AFTER_MIN}
          staff={designStaff}
          defaultStaffId={firstLock ? "rekha" : undefined}
          initialPin={firstLock ? "12" : undefined}
          onVerify={async (_staffId, pin) => {
            await new Promise((resolve) => setTimeout(resolve, 400));
            return pin === PREVIEW_PIN;
          }}
          onUnlocked={(staffId) => {
            setFirstLock(false);
            setUnlockedAs(staffId);
          }}
          onForgot={() => window.alert("Forgot PIN: sign in again with the clinic account.")}
        />
      )}
    </>
  );
}
