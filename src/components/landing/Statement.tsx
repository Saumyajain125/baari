"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useRef } from "react";
import { cx } from "@/components/public/ui";
import { Container } from "./shared";
import { TurnDots } from "./TurnDots";

/** Words starting with "*" are set in teal. */
const TEXT =
  "Your patients wait wherever they like: at home, at the chemist, over a cup of chai. One look at their phone shows how near *their *turn *is. Your door stays quiet, and your OPD runs in order.";
const WORDS = TEXT.split(" ").map((w) => ({ text: w.replace(/^\*/, ""), accent: w.startsWith("*") }));

/**
 * One sentence about the patient's side, lit word by word as it scrolls up
 * the screen, the way a queue moves one token at a time.
 */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });

  return (
    <section aria-label="What changes for your patients" className="pt-24 pb-4 md:pt-36 md:pb-8">
      <Container>
        <TurnDots className="h-8 w-auto text-teal" />
        <p
          ref={ref}
          className="mt-8 max-w-[26ch] font-display text-[2rem] leading-[1.18] font-bold tracking-[-0.01em] text-ink sm:text-[2.6rem] lg:text-[3.4rem]"
        >
          {WORDS.map((w, i) => (
            <span key={i}>
              {reduce ? (
                <span className={cx(w.accent && "text-teal")}>{w.text}</span>
              ) : (
                <Word progress={scrollYProgress} index={i} total={WORDS.length} accent={w.accent}>
                  {w.text}
                </Word>
              )}
              {i < WORDS.length - 1 && " "}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}

function Word({
  progress,
  index,
  total,
  accent,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  accent: boolean;
  children: string;
}) {
  // Each word fades up over a window three words wide, so the light sweeps rather than ticks.
  const start = index / total;
  const end = Math.min(1, (index + 3) / total);
  const opacity = useTransform(progress, [start, end], [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={cx(accent && "text-teal")}>
      {children}
    </motion.span>
  );
}
