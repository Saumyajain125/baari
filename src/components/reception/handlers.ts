import type { VisitType } from "@/lib/types";

/**
 * Callbacks every reception layout (tablet, laptop, phone) receives. Layouts
 * stay presentational: they call these and the container in
 * ReceptionApp.tsx performs the Firestore writes and undo bookkeeping.
 */
export interface ReceptionHandlers {
  onSelectDoctor(doctorId: string): void;
  /** "Next patient": finish the current consult and call the head of the queue. */
  onNext(doctorId: string): void;
  /** Re-announce the patient who is with the doctor. */
  onCallAgain(doctorId: string): void;
  /** Called patient didn't come in: move them back 2 and call the next one. */
  onNotHere(doctorId: string): void;
  onPriority(ticketId: string): void;
  onBack2(ticketId: string): void;
  onSkip(ticketId: string): void;
  onNoShow(ticketId: string): void;
  onRemove(ticketId: string): void;
  onEditName(ticketId: string, name: string): void;
  /** Opens the Add walk-in dialog, preselecting a doctor if given. */
  onAddWalkIn(doctorId?: string): void;
  /** Opens the Pause queue dialog for a doctor. */
  onPause(doctorId: string): void;
  onResume(doctorId: string): void;
  /** Reverts the most recent action if it's still within its undo window. */
  onUndo(): void;
  onOpenTv(): void;
  onOpenSettings(): void;
  onPrintPoster(): void;
  onLock(): void;
}

export interface WalkInFormInput {
  doctorId: string;
  name: string;
  /** Normalised 10-digit mobile, or null. */
  phone: string | null;
  visitType: VisitType;
}

/** What the token slip shows after a walk-in is issued. */
export interface IssuedSlip {
  label: string;
  clinicName: string;
  doctorName: string;
  room: string;
  ahead: number;
  /** "approx 35 to 45 min", or "You're next" when nobody is ahead. */
  etaText: string;
  /** "29-10-2026 · 10:51 AM" */
  issuedAtText: string;
  /** Issued from the cached counter while offline. */
  offline: boolean;
}

export interface PauseFormInput {
  /** "Lunch", "Emergency case", ... or the typed reason. */
  reason: string;
  /** Epoch ms the doctor is expected back, or null for "Not sure". */
  backAt: number | null;
  /** Also send a WhatsApp update to waiting patients with phones. */
  notify: boolean;
}

/** Text shown on the TV, patient phones and WhatsApp while a queue is paused. */
export function pauseMessage(reason: string, backAtLabel: string | null): string {
  const back = backAtLabel ? ` Back around ${backAtLabel}.` : "";
  return `Doctor is on a short break (${reason}).${back} Your place is safe.`;
}
