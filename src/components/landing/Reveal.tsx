"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Easing used for every entrance on the page: fast start, soft landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Fades and lifts its content into place the first time it scrolls into view,
 * so each section arrives in reading order. Reduced motion keeps the fade only
 * (MotionConfig in LandingMotion drops the transform).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
