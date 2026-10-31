"use client";

import { motion, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { PointerEvent, ReactNode } from "react";

const SPRING = { stiffness: 220, damping: 18, mass: 0.5 };

/** Lets a button lean a few pixels toward the mouse, then spring back. Mouse only; still under reduced motion. */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = usePrefersReducedMotion();
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function leave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div style={{ x, y }} onPointerMove={move} onPointerLeave={leave} className={className}>
      {children}
    </motion.div>
  );
}
