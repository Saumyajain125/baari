"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { QueueRowView } from "@/lib/view";
import { BottomSheet } from "./BottomSheet";

export interface PhoneEditNameSheetProps {
  row: QueueRowView;
  onSave(name: string): void;
  onClose(): void;
}

/** Fix a misspelt name without touching the token or its place in the queue. */
export function PhoneEditNameSheet({ row, onSave, onClose }: PhoneEditNameSheetProps) {
  const titleId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(row.name);
  const [showError, setShowError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setShowError(true);
      inputRef.current?.focus();
      return;
    }
    if (trimmed === row.name) onClose();
    else onSave(trimmed);
  }

  const invalid = showError && !name.trim();

  return (
    <BottomSheet labelledBy={titleId} describedBy={hintId} onClose={onClose} initialFocusRef={inputRef}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pt-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={titleId} className="font-display text-[22px] leading-tight font-bold">
            Edit name
          </h2>
          <p id={hintId} className="text-[13px] text-muted">
            Token {row.label} keeps its place in the queue.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold">Patient name</span>
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            // firestore.rules caps names at 80 characters.
            maxLength={80}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={`h-[52px] rounded-[14px] border bg-surface px-4 text-[17px] text-ink ${
              invalid ? "border-danger" : "border-line-strong"
            }`}
          />
        </label>
        {invalid && (
          <p id={errorId} role="alert" className="-mt-2 text-[13px] font-semibold text-danger">
            Enter the patient&apos;s name
          </p>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-[16px] border border-line-strong bg-surface text-[16px] font-semibold text-ink hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-14 flex-[2] rounded-[16px] bg-teal font-display text-[20px] font-extrabold text-white shadow-[0_4px_0_var(--color-teal-dark)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-teal-dark)]"
          >
            Save name
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
