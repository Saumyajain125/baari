"use client";

/**
 * Dev-only harness for the /preview/phone* routes: renders PhoneReception
 * with the design fixtures, plus a few extra states (?state=...) for checking
 * the variants the artboard doesn't draw. Not used by the real app.
 */
import { useState } from "react";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import { designDoctors, designHeader, phoneHeader, phoneQueue } from "@/lib/fixtures";
import type { ClinicHeaderView, DoctorQueueView } from "@/lib/view";
import { PhoneReception } from "./PhoneReception";

const PHONE_PREVIEW_STATES = ["live", "paused", "fresh", "idle", "offline", "doctors", "long"] as const;
type PhonePreviewState = (typeof PHONE_PREVIEW_STATES)[number];

interface Scenario {
  header: ClinicHeaderView;
  queues: DoctorQueueView[];
  offline: { offlineFor: string; pendingCount: number } | null;
}

const geeta = phoneQueue.serving;
const [rajat, pooja, ...restRows] = phoneQueue.rows;

const SCENARIOS: Record<PhonePreviewState, Scenario> = {
  live: { header: phoneHeader, queues: [phoneQueue], offline: null },
  paused: {
    header: phoneHeader,
    queues: [
      {
        ...phoneQueue,
        doctor: { ...phoneQueue.doctor, paused: true },
        paused: { reason: "Lunch", backAtLabel: "1:30 PM" },
      },
    ],
    offline: null,
  },
  fresh: {
    header: { ...phoneHeader, stats: { inQueue: 0, served: 0, avgConsult: "6 min", avgConsultIsDefault: true, avgWait: null } },
    queues: [
      {
        ...phoneQueue,
        doctor: { ...phoneQueue.doctor, waitingCount: 0 },
        serving: null,
        nextUp: null,
        rows: [],
        nextTokenLabel: "A-01",
        lastToken: 0,
      },
    ],
    offline: null,
  },
  idle: {
    header: { ...phoneHeader, stats: { ...phoneHeader.stats, inQueue: 0 } },
    queues: [{ ...phoneQueue, doctor: { ...phoneQueue.doctor, waitingCount: 0 }, nextUp: null, rows: [] }],
    offline: null,
  },
  offline: {
    header: phoneHeader,
    queues: [
      {
        ...phoneQueue,
        serving: geeta && { ...geeta, pending: true },
        nextUp: { ticketId: pooja.id, label: pooja.label, name: pooja.displayName, priority: true },
        rows: [
          { ...pooja, priority: true, tone: "priority", pending: true },
          { ...rajat, noReplyElapsed: "1:40", tone: "noReply" },
          ...restRows,
        ],
      },
    ],
    offline: { offlineFor: "1:24", pendingCount: 2 },
  },
  doctors: { header: designHeader, queues: designDoctors, offline: null },
  // Stress case for narrow phones: long names, three-digit tokens, every badge.
  long: {
    header: {
      ...phoneHeader,
      clinicName: "Dr. Venkataraman Subramanian's Family Clinic",
      stats: { ...phoneHeader.stats, inQueue: 128, served: 240, avgConsult: "12.5 min" },
    },
    queues: [
      {
        ...phoneQueue,
        serving: geeta && { ...geeta, label: "W-188", name: "Muhammad Abdul Rahman Siddiqui", pending: true },
        nextUp: { ticketId: rajat.id, label: "W-189", name: "Walk-in: Lakshmi Narayanan Iyer", priority: true },
        rows: [
          {
            ...rajat,
            label: "W-189",
            displayName: "Walk-in: Lakshmi Narayanan Iyer",
            visitType: "emergency",
            visitTypeLabel: "Emergency",
            distanceLabel: "Over 30 min",
            waitedLabel: "1 h 12 min",
            priority: true,
            tone: "priority",
            noReplyElapsed: "12:40",
            pending: true,
          },
          { ...pooja, label: "W-190", displayName: "Pooja Agarwal-Chaturvedi" },
          ...restRows,
        ],
      },
    ],
    offline: null,
  },
};

function isState(value: string | undefined): value is PhonePreviewState {
  return (PHONE_PREVIEW_STATES as readonly string[]).includes(value ?? "");
}

export function PhonePreview({ state, sheetFor }: { state?: string; sheetFor?: string }) {
  const scenario = SCENARIOS[isState(state) ? state : "live"];
  const [selectedId, setSelectedId] = useState(scenario.queues[0].doctor.id);
  const queue = scenario.queues.find((q) => q.doctor.id === selectedId) ?? scenario.queues[0];

  const log =
    (name: string) =>
    (...args: unknown[]) =>
      console.info(`[phone preview] ${name}`, ...args);

  const handlers: ReceptionHandlers = {
    onSelectDoctor: setSelectedId,
    onNext: log("onNext"),
    onCallAgain: log("onCallAgain"),
    onNotHere: log("onNotHere"),
    onPriority: log("onPriority"),
    onBack2: log("onBack2"),
    onSkip: log("onSkip"),
    onNoShow: log("onNoShow"),
    onRemove: log("onRemove"),
    onEditName: log("onEditName"),
    onAddWalkIn: log("onAddWalkIn"),
    onPause: log("onPause"),
    onResume: log("onResume"),
    onUndo: log("onUndo"),
    onOpenTv: log("onOpenTv"),
    onOpenSettings: log("onOpenSettings"),
    onOpenInsights: log("onOpenInsights"),
    onPrintPoster: log("onPrintPoster"),
    onLock: log("onLock"),
  };

  return (
    <PhoneReception
      header={scenario.header}
      doctors={scenario.queues.map((q) => q.doctor)}
      selectedDoctorId={queue.doctor.id}
      queue={queue}
      offline={scenario.offline}
      handlers={handlers}
      initialActionsFor={sheetFor}
    />
  );
}
