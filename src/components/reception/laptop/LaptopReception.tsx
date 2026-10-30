"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReceptionHandlers } from "@/components/reception/handlers";
import { OfflineBanner } from "@/components/reception/OfflineBanner";
import type { ClinicHeaderView, DoctorQueueView, QueueRowView } from "@/lib/view";
import { DoctorColumn, canCallNext } from "./DoctorColumn";
import { EditNameDialog, type EditNameTarget } from "./EditNameDialog";
import { LaptopHeader } from "./LaptopHeader";
import { matchesQuery, shortDoctorName } from "./search";
import { WALK_IN_KEY, useLaptopShortcuts } from "./useLaptopShortcuts";

export interface LaptopReceptionProps {
  header: ClinicHeaderView;
  /** One column per doctor, 2-up grid (1 doctor = full width). */
  queues: DoctorQueueView[];
  offline: { offlineFor: string; pendingCount: number } | null;
  handlers: ReceptionHandlers;
}

/** How long the Next button shows as pressed after its keyboard shortcut. */
const FLASH_MS = 160;

/**
 * Reception on a laptop (artboard 05): every doctor side by side, driven
 * mostly from the keyboard. Presentational: data in, handler calls out.
 */
export function LaptopReception({ header, queues, offline, handlers }: LaptopReceptionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditNameTarget | null>(null);
  const [flashedId, setFlashedId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // First doctor wins a prefix; "W" stays reserved for walk-ins.
  const nextKeys = useMemo(() => {
    const keys: Record<string, string> = {};
    for (const q of queues) {
      const key = q.doctor.prefix.trim().toUpperCase();
      if (/^[A-Z]$/.test(key) && key !== WALK_IN_KEY && !(key in keys)) keys[key] = q.doctor.id;
    }
    return keys;
  }, [queues]);

  const filtered = useMemo(
    () => queues.map((q) => (query.trim() ? q.rows.filter((r) => matchesQuery(r, query)) : q.rows)),
    [queues, query],
  );
  const matchCount = filtered.reduce((n, rows) => n + rows.length, 0);

  useLaptopShortcuts({
    nextKeys,
    searchRef,
    rootRef,
    onAddWalkIn: () => handlers.onAddWalkIn(),
    onUndo: handlers.onUndo,
    onNext: (doctorId) => {
      const queue = queues.find((q) => q.doctor.id === doctorId);
      if (!queue || !canCallNext(queue)) return;
      handlers.onNext(doctorId);
      setFlashedId(doctorId);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashedId(null), FLASH_MS);
    },
  });

  function openEditName(queue: DoctorQueueView, row: QueueRowView, trigger: HTMLButtonElement) {
    setEditing({
      ticketId: row.id,
      label: row.label,
      name: row.name,
      doctorName: queue.doctor.name,
      returnFocus: trigger,
    });
  }

  const shortcutDoctors = queues.filter((q) => nextKeys[q.doctor.prefix.trim().toUpperCase()] === q.doctor.id);

  return (
    <div
      ref={rootRef}
      className="flex h-dvh min-w-0 flex-col bg-canvas font-sans text-[16px] leading-[normal] text-ink"
    >
      {offline && <OfflineBanner offlineFor={offline.offlineFor} pendingCount={offline.pendingCount} />}

      <LaptopHeader
        header={header}
        query={query}
        onQueryChange={setQuery}
        searchRef={searchRef}
        onAddWalkIn={() => handlers.onAddWalkIn()}
        onOpenTv={handlers.onOpenTv}
        onLock={handlers.onLock}
        onPrintPoster={handlers.onPrintPoster}
        onOpenSettings={handlers.onOpenSettings}
      />

      <main
        aria-label="Queues"
        className={`grid min-h-0 flex-auto gap-5 px-6 py-5 ${
          queues.length > 1 ? "grid-cols-2" : "grid-cols-1"
        } ${queues.length > 2 ? "auto-rows-[minmax(480px,1fr)] overflow-y-auto" : ""}`}
      >
        {queues.map((q, i) => (
          <DoctorColumn
            key={q.doctor.id}
            queue={q}
            rows={filtered[i]}
            query={query}
            offline={offline != null}
            shortcutKey={shortcutDoctors.includes(q) ? q.doctor.prefix.trim().toUpperCase() : null}
            flashed={flashedId === q.doctor.id}
            handlers={handlers}
            onEditName={(row, trigger) => openEditName(q, row, trigger)}
          />
        ))}
      </main>

      <footer className="flex flex-none gap-5 border-t border-line bg-surface px-6 py-2.5 text-[12px] text-muted">
        <span>
          Keyboard:{" "}
          {shortcutDoctors.map((q) => (
            <Fragment key={q.doctor.id}>
              <strong>{q.doctor.prefix.trim().toUpperCase()}</strong>
              {` next for ${shortDoctorName(q.doctor.name)} · `}
            </Fragment>
          ))}
          <strong>{WALK_IN_KEY}</strong> walk-in · <strong>/</strong> find · <strong>Ctrl Z</strong> undo
        </span>
        <span className="ml-auto">More actions: skip, no-show, remove, edit name</span>
      </footer>

      <p aria-live="polite" className="sr-only">
        {query.trim() ? `${matchCount} ${matchCount === 1 ? "patient matches" : "patients match"}` : ""}
      </p>

      {editing && (
        <EditNameDialog
          key={editing.ticketId}
          target={editing}
          onSave={handlers.onEditName}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
