import type { ReceptionHandlers } from "@/components/reception/handlers";

const noop = () => {};

/** No-op handlers for the /preview design pages. */
export const previewHandlers: ReceptionHandlers = {
  onSelectDoctor: noop,
  onNext: noop,
  onCallAgain: noop,
  onNotHere: noop,
  onPriority: noop,
  onBack2: noop,
  onSkip: noop,
  onNoShow: noop,
  onRemove: noop,
  onEditName: noop,
  onAddWalkIn: noop,
  onPause: noop,
  onResume: noop,
  onUndo: noop,
  onOpenTv: noop,
  onOpenSettings: noop,
  onPrintPoster: noop,
  onLock: noop,
};
