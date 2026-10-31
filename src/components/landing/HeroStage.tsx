"use client";

import { motion, useScroll, useSpring, useTransform, type MotionStyle } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useEffect, useRef, type ReactNode } from "react";

const SPRING = { stiffness: 70, damping: 18, mass: 0.7 };
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Gives the hero scene depth. The whole picture tilts a few degrees toward
 * the mouse, and its layers (TV, doctor's card, phone) read --px / --py to
 * drift by different amounts, so the phone feels closest. As the page scrolls,
 * the scene eases up and back. Mouse only; holds still under reduced motion.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const px = useSpring(0, SPRING);
  const py = useSpring(0, SPRING);
  const rotateY = useTransform(px, (v) => v * 5);
  const rotateX = useTransform(py, (v) => v * -4);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, -80]);
  const scale = useTransform(scrollY, [0, 700], [1, 0.93]);

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    function move(e: PointerEvent) {
      const r = ref.current?.getBoundingClientRect();
      if (!r || r.bottom < 0) return;
      px.set(clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      py.set(clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    }
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, px, py]);

  const style = reduce
    ? undefined
    : ({ y, scale, rotateX, rotateY, transformPerspective: 1600, "--px": px, "--py": py } as unknown as MotionStyle);

  return (
    <motion.div ref={ref} style={style}>
      {children}
    </motion.div>
  );
}
