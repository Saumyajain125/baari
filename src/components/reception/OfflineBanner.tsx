import { WifiOffIcon } from "@/components/icons";

export interface OfflineBannerProps {
  /** Time since the connection dropped, "1:24". */
  offlineFor: string;
  /** Desk taps made while offline that are waiting to sync. */
  pendingCount: number;
}

/**
 * Amber strip pinned above the reception header while the device is offline
 * (artboard 07). Only the headline is a live alert, so screen readers hear it
 * once when the connection drops instead of on every tick of the timer.
 */
export function OfflineBanner({ offlineFor, pendingCount }: OfflineBannerProps) {
  const saved = pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? "tap" : "taps"} saved on this tablet. ` : "";

  return (
    <div className="no-print flex flex-none items-start gap-3 border-b border-amber-line bg-amber-tint px-4 py-3 leading-[normal] text-amber sm:items-center sm:gap-[14px] sm:px-5 sm:py-[14px]">
      <WifiOffIcon size={24} className="flex-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p role="alert" className="text-[15px] font-bold sm:text-[16px]">
          Internet is down. Keep working, we&apos;ll catch up.
        </p>
        <p className="text-[13px] sm:text-[14px]">
          {saved}Patient phones and the TV will update when the connection is back. WhatsApp alerts are on hold.
        </p>
      </div>
      <span className="flex-none rounded-full bg-amber-chip px-3 py-[6px] text-[13px] font-bold whitespace-nowrap">
        Offline {offlineFor}
      </span>
    </div>
  );
}
