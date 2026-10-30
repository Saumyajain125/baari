import { Fragment } from "react";

/** A token label such as "A-32": a prefix of capital letters, a hyphen, digits. */
const TOKEN = /\b([A-Z]{1,3}-\d+)\b/;

/**
 * Renders `text` with every token label kept on one line. Browsers may break
 * a line after the hyphen, which on a narrow phone leaves "A-" at the end of
 * one line and "01." at the start of the next.
 */
export function KeepTokens({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  if (parts.length === 1) return text;
  // split() with a capture group puts the matches at the odd indexes.
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
