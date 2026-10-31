"use client";

import { motion, useReducedMotion } from "motion/react";
import { DOTS } from "@/components/brand/Logo";

/**
 * The logo's three dots, growing one after another toward "your turn"
 * (बारी), the idea the mark is built on. Holds still under reduced motion.
 */
export function TurnDots({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="20 40 90 48" className={className} overflow="visible" aria-hidden="true">
      {DOTS.map(([cx, cy, r], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="currentColor"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ opacity: [0.45, 0.72, 1][i] }}
          animate={
            reduce
              ? { opacity: [0.45, 0.72, 1][i] }
              : { opacity: [0.35, 1, 0.35], scale: [1, 1.25, 1] }
          }
          transition={reduce ? undefined : { duration: 1.8, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
