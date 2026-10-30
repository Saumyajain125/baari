import { ClockIcon } from "@/components/icons";
import type { DoctorQueueView } from "@/lib/view";

const cardClass = "@container flex flex-col rounded-[20px] border border-line bg-surface p-5";
const eyebrowClass = "text-[12px] font-bold tracking-[0.08em] text-muted uppercase";

/**
 * "With doctor now" card. Shows the patient in the room with a live timer, or
 * a pale placeholder token when nobody has been called yet (artboard 03).
 */
export function ServingCard({ queue }: { queue: DoctorQueueView }) {
  const { serving } = queue;

  if (!serving) {
    return (
      <div className={`${cardClass} gap-2`}>
        <h2 className={eyebrowClass}>With doctor now</h2>
        <span aria-hidden="true" className="font-display text-[64px] leading-none font-extrabold text-line-strong">
          {queue.doctor.prefix}-00
        </span>
        <p className="text-[14px] text-balance text-muted">{emptyCopy(queue)}</p>
      </div>
    );
  }

  return (
    <div className={`${cardClass} gap-[14px]`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={eyebrowClass}>With doctor now</h2>
        <span className="flex items-center gap-[6px] text-[13px] font-semibold whitespace-nowrap text-teal-dark">
          <ClockIcon size={16} />
          {`${serving.inRoom} in room`}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex-none font-display text-[64px] leading-none font-extrabold text-teal">{serving.label}</span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[18px] font-semibold">{serving.name}</span>
          {/* The narrower (320px) column has no room for "phone · visit type" on one line, so
              it stacks them without the dot; the pending note wraps at its comma. */}
          {serving.pending ? (
            <span className="text-[13px] font-semibold text-warn">
              Saved offline, <span className="whitespace-nowrap">not synced</span>
            </span>
          ) : (
            <span className="flex flex-col text-[14px] text-muted @min-[300px]:block">
              <span className="whitespace-nowrap">
                {serving.phoneMasked ?? "no phone"}
                <span className="hidden @min-[300px]:inline">&nbsp;·</span>
              </span>{" "}
              <span className="whitespace-nowrap">{serving.visitTypeLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function emptyCopy(queue: DoctorQueueView): React.ReactNode {
  const token = (label: string) => <span className="whitespace-nowrap">{label}</span>;
  if (queue.nextUp) return <>Nobody with the doctor. Next up is {token(queue.nextUp.label)}.</>;
  if (queue.lastToken === 0) return <>Nobody yet. First token today will be {token(queue.nextTokenLabel)}.</>;
  return <>Nobody with the doctor. Next token is {token(queue.nextTokenLabel)}.</>;
}
