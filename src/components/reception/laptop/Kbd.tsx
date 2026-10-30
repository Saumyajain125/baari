/**
 * The keyboard-shortcut chip from the design's `.kbd` class. Decorative: the
 * owning control exposes the shortcut through `aria-keyshortcuts` instead.
 */
export function Kbd({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <kbd
      aria-hidden="true"
      className={`inline-flex h-[22px] min-w-[34px] items-center justify-center rounded-[6px] px-1.5 font-sans text-[12px] font-semibold leading-[normal] ${
        muted ? "bg-subtle text-faint" : "bg-white/18"
      }`}
    >
      {children}
    </kbd>
  );
}
