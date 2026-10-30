"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { EditIcon, PlusIcon } from "@/components/icons";
import type { DoctorInput } from "@/lib/clinic-admin";
import { formatHHmm } from "@/lib/time";
import type { Doctor } from "@/lib/types";
import {
  MAX_DOCTORS,
  hasErrors,
  newDoctorDraft,
  nextFreePrefix,
  toDoctorInput,
  validateDoctor,
  type DoctorDraft,
  type DoctorErrors,
} from "../clinic-form";
import { DoctorFields, LetterTile } from "../DraftFields";
import { Card, CardHeader, EditorActions, InlineConfirm, RowButton } from "./parts";

export interface DoctorsCardProps {
  doctors: Doctor[];
  /** Waiting or serving tickets per doctor id today; null while that's unknown (loading or failed). */
  inQueue: Record<string, number> | null;
  onSave(doctor: DoctorInput & { id?: string; order: number }): void;
  onSetActive(doctor: Doctor, active: boolean): void;
  /** Explains a refused action (e.g. a letter clash on reactivation). */
  onProblem(message: string): void;
}

type Mode = { kind: "idle" } | { kind: "edit"; id: string } | { kind: "add" } | { kind: "confirm-off"; id: string };

function draftFrom(d: Doctor): DoctorDraft {
  return newDoctorDraft(d.prefix, { name: d.name, room: d.room, startsAt: d.startsAt ?? "" });
}

/** Add, edit and deactivate doctors. Inactive doctors stay listed so they can come back. */
export function DoctorsCard({ doctors, inQueue, onSave, onSetActive, onProblem }: DoctorsCardProps) {
  const id = useId();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [draft, setDraft] = useState<DoctorDraft | null>(null);
  const [errors, setErrors] = useState<DoctorErrors>({});
  // After an editor closes, focus goes back to the control that opened it.
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (mode.kind !== "idle" || !focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [mode, focusId]);

  const active = doctors.filter((d) => d.active);
  const editingId = mode.kind === "edit" ? mode.id : null;

  function startEdit(d: Doctor) {
    setDraft(draftFrom(d));
    setErrors({});
    setMode({ kind: "edit", id: d.id });
  }

  function startAdd() {
    setDraft(newDoctorDraft(nextFreePrefix(active.map((d) => d.prefix))));
    setErrors({});
    setMode({ kind: "add" });
  }

  function close(returnTo: string) {
    setMode({ kind: "idle" });
    setDraft(null);
    setErrors({});
    setFocusId(returnTo);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const others = active.filter((d) => d.id !== editingId);
    const found = validateDoctor(draft, others);
    setErrors(found);
    if (hasErrors(found)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    if (editingId) {
      const current = doctors.find((d) => d.id === editingId);
      onSave({ ...toDoctorInput(draft), id: editingId, order: current?.order ?? 0 });
      close(`${id}-edit-${editingId}`);
    } else {
      const order = doctors.reduce((max, d) => Math.max(max, d.order + 1), 0);
      onSave({ ...toDoctorInput(draft), order });
      close(`${id}-add`);
    }
  }

  /**
   * The desk, TV and join page only show active doctors, so deactivating one with patients
   * still waiting (or in the room) would strand them. Checked on tap and again on confirm.
   */
  function deactivateBlocker(d: Doctor): string | null {
    if (inQueue === null) return "Couldn't check today's queue yet. Try again in a moment, or reload the page.";
    const n = inQueue[d.id] ?? 0;
    if (n === 0) return null;
    const who = n === 1 ? "1 patient is" : `${n} patients are`;
    return `${who} still in ${d.name}'s queue. Finish or move them first.`;
  }

  function startDeactivate(d: Doctor) {
    const blocker = deactivateBlocker(d);
    if (blocker) onProblem(blocker);
    else setMode({ kind: "confirm-off", id: d.id });
  }

  function reactivate(d: Doctor) {
    const clash = active.find((o) => o.prefix.toUpperCase() === d.prefix.toUpperCase());
    if (clash) {
      onProblem(`Letter ${d.prefix} is in use by ${clash.name}. Edit one of them first.`);
      return;
    }
    onSetActive(d, true);
  }

  const editor = draft && (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DoctorFields
        idBase={`${id}-form`}
        title={mode.kind === "add" ? "New doctor" : `Edit ${draft.name || "doctor"}`}
        draft={draft}
        errors={errors}
        onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
        autoFocus
      />
      <EditorActions
        saveLabel={mode.kind === "add" ? "Add doctor" : "Save doctor"}
        onCancel={() => close(editingId ? `${id}-edit-${editingId}` : `${id}-add`)}
      />
    </form>
  );

  return (
    <Card labelledBy={`${id}-title`}>
      <CardHeader
        id={`${id}-title`}
        title="Doctors"
        description="Each doctor has a queue, a token letter and a tab on the desk."
        action={
          <RowButton
            id={`${id}-add`}
            tone="primary"
            onClick={startAdd}
            disabled={mode.kind === "add" || doctors.length >= MAX_DOCTORS}
          >
            <PlusIcon size={18} />
            Add doctor
          </RowButton>
        }
      />

      {doctors.length === 0 && mode.kind !== "add" && (
        <p className="rounded-[14px] bg-canvas p-4 text-[15px] text-muted">
          No doctors yet. Add one and today&apos;s queue opens on the desk.
        </p>
      )}

      {doctors.length > 0 && (
        <ul className="flex flex-col">
          {doctors.map((d) => (
            <li key={d.id} className="border-b border-divider py-3 first:pt-0 last:border-b-0 last:pb-0">
              {editingId === d.id ? (
                editor
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <LetterTile letter={d.prefix} muted={!d.active} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[16px] font-semibold">
                      <span className={d.active ? "truncate" : "truncate text-muted"}>{d.name}</span>
                      {!d.active && (
                        <span className="shrink-0 rounded-full bg-subtle px-2.5 py-0.5 text-[12px] font-semibold text-muted">
                          Inactive
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[14px] text-muted">
                      {d.room}
                      {d.startsAt && ` · Starts ${formatHHmm(d.startsAt)}`}
                    </p>
                  </div>
                  <div className="flex basis-full justify-end gap-2 sm:basis-auto">
                    <RowButton id={`${id}-edit-${d.id}`} onClick={() => startEdit(d)} aria-label={`Edit ${d.name}`}>
                      <EditIcon size={16} />
                      Edit
                    </RowButton>
                    {d.active ? (
                      <RowButton
                        id={`${id}-off-${d.id}`}
                        tone="danger"
                        onClick={() => startDeactivate(d)}
                        aria-label={`Deactivate ${d.name}`}
                      >
                        Deactivate
                      </RowButton>
                    ) : (
                      <RowButton id={`${id}-off-${d.id}`} onClick={() => reactivate(d)} aria-label={`Reactivate ${d.name}`}>
                        Reactivate
                      </RowButton>
                    )}
                  </div>
                  {mode.kind === "confirm-off" && mode.id === d.id && (
                    <div className="basis-full">
                      <InlineConfirm
                        message={
                          <>
                            Deactivate <strong>{d.name}</strong>? Their tab leaves the desk, TV and join page. Today&apos;s
                            tokens stay saved.
                          </>
                        }
                        confirmLabel="Deactivate"
                        onConfirm={() => {
                          const blocker = deactivateBlocker(d);
                          if (blocker) onProblem(blocker);
                          else onSetActive(d, false);
                          close(`${id}-off-${d.id}`);
                        }}
                        onCancel={() => close(`${id}-off-${d.id}`)}
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {mode.kind === "add" && editor}
    </Card>
  );
}
