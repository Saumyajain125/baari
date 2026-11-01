"use client";

import { use, useState } from "react";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import { LaptopReception } from "@/components/reception/laptop/LaptopReception";
import { designDoctors, designHeader, designHeaderEmpty, sharmaQueue, startOfDayQueues, vermaQueue } from "@/lib/fixtures";
import type { DoctorQueueView, QueueRowView } from "@/lib/view";

type Variant = "design" | "paused" | "offline" | "empty" | "one" | "idle";

/** Fixture states; `?state=` picks one. The default is artboard 05 exactly. */
const VARIANTS: Record<Variant, { queues: DoctorQueueView[]; empty?: boolean; offline?: boolean }> = {
  design: { queues: designDoctors },
  paused: {
    queues: [
      sharmaQueue,
      { ...vermaQueue, doctor: { ...vermaQueue.doctor, paused: true }, paused: { reason: "Lunch", backAtLabel: "1:30 PM" } },
    ],
  },
  offline: {
    offline: true,
    queues: [
      {
        ...sharmaQueue,
        serving: sharmaQueue.serving && { ...sharmaQueue.serving, pending: true },
        rows: sharmaQueue.rows.map((r) => (r.label === "A-21" ? { ...r, pending: true } : r)),
      },
      vermaQueue,
    ],
  },
  empty: { queues: startOfDayQueues, empty: true },
  one: { queues: [sharmaQueue] },
  idle: { queues: [sharmaQueue, { ...vermaQueue, rows: [], nextUp: null, doctor: { ...vermaQueue.doctor, waitingCount: 0 } }] },
};

/**
 * Artboard 05 (1440×900): laptop reception, all doctors. Handlers drive a
 * small in-memory copy of the fixtures so the menu, shortcuts, pause and
 * edit-name flows can be tried without Firebase.
 */
export default function LaptopPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = use(searchParams);
  const variant = VARIANTS[(state ?? "design") as Variant] ?? VARIANTS.design;
  const [queues, setQueues] = useState(variant.queues);
  const [history, setHistory] = useState<DoctorQueueView[][]>([]);

  function apply(doctorOrTicketId: string, change: (q: DoctorQueueView) => DoctorQueueView) {
    setHistory((h) => [...h, queues]);
    setQueues(
      queues.map((q) =>
        q.doctor.id === doctorOrTicketId || q.rows.some((r) => r.id === doctorOrTicketId) ? settle(q, change(q)) : q,
      ),
    );
  }
  const editRows = (id: string, fn: (rows: QueueRowView[], i: number) => QueueRowView[]) =>
    apply(id, (q) => ({ ...q, rows: fn(q.rows, q.rows.findIndex((r) => r.id === id)) }));

  const handlers: ReceptionHandlers = {
    onNext: (id) =>
      apply(id, (q) => {
        const [head, ...rest] = q.rows;
        if (!head) return { ...q, serving: null };
        const serving = {
          ticketId: head.id,
          label: head.label,
          name: head.name,
          phoneMasked: head.phoneMasked,
          visitTypeLabel: head.visitTypeLabel,
          inRoom: "0:00",
          consultMin: 0,
          pending: false,
        };
        return { ...q, serving, rows: rest };
      }),
    onPriority: (id) =>
      editRows(id, (rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, priority: !r.priority, tone: !r.priority ? "priority" : r.noReplyElapsed ? "noReply" : "normal" } : r,
        ),
      ),
    onBack2: (id) => editRows(id, (rows, i) => moveTo(rows, i, i + 2)),
    onSkip: (id) => editRows(id, (rows, i) => moveTo(rows, i, rows.length - 1)),
    onNoShow: (id) => editRows(id, (rows) => rows.filter((r) => r.id !== id)),
    onRemove: (id) => editRows(id, (rows) => rows.filter((r) => r.id !== id)),
    onEditName: (id, name) => editRows(id, (rows) => rows.map((r) => (r.id === id ? { ...r, name, displayName: name } : r))),
    onPause: (id) =>
      apply(id, (q) => ({ ...q, doctor: { ...q.doctor, paused: true }, paused: { reason: "Lunch", backAtLabel: "1:30 PM" } })),
    onResume: (id) => apply(id, (q) => ({ ...q, doctor: { ...q.doctor, paused: false }, paused: null })),
    onUndo: () => {
      const previous = history.at(-1);
      if (!previous) return;
      setQueues(previous);
      setHistory(history.slice(0, -1));
    },
    onSelectDoctor: () => {},
    onCallAgain: () => {},
    onNotHere: () => {},
    onAddWalkIn: (doctorId) => console.info("Add walk-in", doctorId ?? "(no doctor preselected)"),
    onOpenTv: () => {},
    onOpenSettings: () => {},
    onOpenInsights: () => {},
    onPrintPoster: () => {},
    onLock: () => {},
  };

  return (
    <LaptopReception
      header={variant.empty ? designHeaderEmpty : designHeader}
      queues={queues}
      offline={variant.offline ? { offlineFor: "1:24", pendingCount: 2 } : null}
      handlers={handlers}
    />
  );
}

/** Keeps the derived fields (priority first, next up, count) in step after an edit. */
function settle(before: DoctorQueueView, q: DoctorQueueView): DoctorQueueView {
  const rows = [...q.rows.filter((r) => r.priority), ...q.rows.filter((r) => !r.priority)];
  const head = rows[0];
  return {
    ...q,
    rows,
    nextUp: head ? { ticketId: head.id, label: head.label, name: head.displayName, priority: head.priority } : null,
    doctor: { ...q.doctor, waitingCount: Math.max(0, q.doctor.waitingCount + rows.length - before.rows.length) },
  };
}

function moveTo<T>(list: T[], from: number, to: number): T[] {
  if (from < 0) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.min(to, next.length), 0, item);
  return next;
}
