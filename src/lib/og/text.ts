/**
 * True when the preview images can draw `text` correctly. Satori has no
 * complex-script shaping (Devanagari conjuncts and vowel signs come out
 * broken) and no emoji font, so such names stay out of the image; the
 * preview's title text, drawn by the app showing it, still carries them.
 */
export function canDraw(text: string | null | undefined): text is string {
  if (!text) return false;
  return /^[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]*$/u.test(text) && !/\p{Extended_Pictographic}/u.test(text);
}
