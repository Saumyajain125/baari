import { ArrowRightIcon } from "@/components/icons";
import type { DoctorQueueView } from "@/lib/view";

export interface NextPatientButtonProps {
  queue: DoctorQueueView;
  offline: boolean;
  onNext(): void;
}

/**
 * The big teal "Next patient" button that fills the left column. It turns into
 * a dashed, disabled outline while the queue is paused or there is nobody to
 * call or finish (artboard 03).
 */
export function NextPatientButton({ queue, offline, onNext }: NextPatientButtonProps) {
  const { serving, nextUp, paused } = queue;

  if (paused) {
    const back = paused.backAtLabel ? ` · back around ${paused.backAtLabel}` : "";
    return (
      <DisabledNext title="Queue paused" detail="Resume to call the next patient" note={`${paused.reason}${back}`} />
    );
  }
  if (!serving && !nextUp) {
    return <DisabledNext title="Next patient" detail="Turns on when someone joins" />;
  }

  // Offline the TV and patient phones can't hear the call, so reception says it out loud (artboard 07).
  const sayAloud = offline && nextUp != null;
  let calls: React.ReactNode;
  if (!nextUp) calls = "Nobody waiting";
  else if (sayAloud) calls = "Still works offline. Call the name out loud.";
  else
    calls = (
      <>
        Calls{" "}
        <strong>
          {nextUp.label} {nextUp.name}
        </strong>
        {nextUp.priority && " (priority)"}
      </>
    );

  const saves = serving
    ? nextUp
      ? `Saves ${serving.label} as done · ${serving.consultMin} min consult`
      : `Saves ${serving.label} as done`
    : null;

  return (
    <button
      type="button"
      onClick={onNext}
      className="flex min-h-[220px] flex-auto flex-col items-center justify-center gap-2 rounded-[24px] bg-teal px-5 text-center text-white shadow-[0_6px_0_var(--color-teal-dark)] transition-[translate,box-shadow] duration-75 active:translate-y-[4px] active:shadow-[0_2px_0_var(--color-teal-dark)]"
    >
      <span className="flex items-center gap-3 font-display text-[40px] leading-none font-extrabold">
        Next patient
        <ArrowRightIcon size={36} />
      </span>
      <span className={`${sayAloud ? "text-[15px]" : "text-[16px]"} text-balance opacity-[0.92]`}>{calls}</span>
      {saves && <span className="text-[13px] text-balance opacity-80">{saves}</span>}
    </button>
  );
}

function DisabledNext({ title, detail, note }: { title: string; detail: string; note?: string }) {
  return (
    <button
      type="button"
      disabled
      className="flex min-h-[220px] flex-auto flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-line-strong bg-surface px-5 text-center text-faint"
    >
      <span className="font-display text-[36px] leading-none font-extrabold">{title}</span>
      <span className="text-[15px] text-balance">{detail}</span>
      {note && <span className="text-[13px] font-semibold text-balance">{note}</span>}
    </button>
  );
}
