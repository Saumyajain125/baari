/**
 * Staff PINs for the reception lock screen. The lock only gates a device that
 * is already signed in to the clinic account, so a salted SHA-256 checked on
 * the device is enough: it keeps raw PINs out of Firestore.
 */

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

export async function verifyPin(pin: string, staff: { pinHash: string; pinSalt: string }): Promise<boolean> {
  return (await hashPin(pin, staff.pinSalt)) === staff.pinHash;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** "Rekha Kumari" → "RK"; "Suresh" → "SU". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "").slice(0, 2).toUpperCase();
}
