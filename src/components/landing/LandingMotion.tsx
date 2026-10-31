"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Honors the visitor's "reduce motion" setting for every motion component on
 * the page: transforms are skipped, fades stay. The looping demos also check
 * useReducedMotion and hold still.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
