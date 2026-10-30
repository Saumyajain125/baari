import type { Ref } from "react";

export interface PinDotsProps {
  length: number;
  filled: number;
  /** "error" paints the entered digits red while the dots shake. */
  tone: "default" | "error";
  ref?: Ref<HTMLDivElement>;
}

/** One dot per PIN digit: filled teal once typed, outlined while empty. */
export function PinDots({ length, filled, tone, ref }: PinDotsProps) {
  return (
    <div ref={ref} role="img" aria-label={`${filled} of ${length} digits entered`} className="flex gap-4">
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={`size-[18px] rounded-full ${
            i < filled ? (tone === "error" ? "bg-danger" : "bg-teal") : "border-2 border-dash"
          }`}
        />
      ))}
    </div>
  );
}
