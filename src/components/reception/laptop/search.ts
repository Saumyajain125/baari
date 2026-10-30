/**
 * Pure helpers for the laptop desk: the search box filter and the short
 * doctor names used in the keyboard hint. Kept free of React so they can be
 * unit-tested.
 */
import type { QueueRowView } from "@/lib/queue/logic";

/** Token-like queries: "A-26", "a26", "26", "a 2". */
const TOKEN_QUERY = /^([a-z])?(\d+)$/;

/**
 * Does a row match what was typed in "Find token, name or phone"?
 *
 * - Tokens match with or without the dash ("a26", "A-26") or by number ("26").
 * - Names match case-insensitively anywhere in the name.
 * - Phones match by digits. Rows only carry the masked number ("98290 •••45"),
 *   so a query matches the visible digits: the 5-digit prefix, the last two, or
 *   a full 10-digit number whose head and tail agree with the mask.
 */
export function matchesQuery(row: QueueRowView, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;

  if (row.name.toLowerCase().includes(q)) return true;

  const compact = q.replace(/[\s-]/g, "");
  const token = TOKEN_QUERY.exec(compact);
  if (token) {
    const [prefix, number] = row.label.toLowerCase().split("-");
    const [, letter, digits] = token;
    if ((!letter || letter === prefix) && number.includes(digits)) return true;
  }

  const qDigits = q.replace(/\D/g, "");
  if (qDigits && qDigits.length === compact.length && row.phoneMasked) {
    return phoneMatches(row.phoneMasked, qDigits);
  }
  return false;
}

function phoneMatches(masked: string, digits: string): boolean {
  const [head = "", tail = ""] = masked.split("•••").map((part) => part.replace(/\D/g, ""));
  if (digits.length >= 10) {
    const ten = digits.slice(-10);
    return ten.startsWith(head) && ten.endsWith(tail);
  }
  return head.includes(digits) || (digits.length <= tail.length && tail.endsWith(digits));
}

/** "Dr. Anita Sharma" → "Dr. Sharma"; names without a title are kept whole. */
export function shortDoctorName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 2 && /^dr\.?$/i.test(parts[0])) return `${parts[0]} ${parts[parts.length - 1]}`;
  return name.trim();
}
