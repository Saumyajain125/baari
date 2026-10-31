"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { ReactNode } from "react";
import { EASE_OUT } from "./Reveal";

/**
 * Uncovers its content like a curtain lifting, while the content settles from
 * a slight zoom. Runs once, when it first scrolls into view. The curtain ends
 * outside the box, so drop shadows are not cut off.
 */
export function ClipReveal({ children, className, radius = 28 }: { children: ReactNode; className?: string; radius?: number }) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ clipPath: `inset(18% 6% 18% 6% round ${radius}px)`, opacity: 0.4 }}
      whileInView={{ clipPath: `inset(-30% -30% -30% -30% round ${radius}px)`, opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.2, ease: EASE_OUT }}
    >
      <motion.div
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.6, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
