"use client";

import { motion } from "motion/react";
import { Fragment } from "react";
import { cx } from "@/components/public/ui";
import { EASE_OUT } from "./Reveal";

/**
 * Section heading whose words rise one after another from behind a mask the
 * first time it scrolls into view. Words listed in `accent` are set in teal.
 * Reduced motion: MotionConfig drops the transform, so the words simply show.
 */
const SIZES = {
  section: "text-[2.15rem] leading-[1.08] font-bold md:text-[2.9rem]",
  closing: "text-[2.6rem] leading-[1.05] font-extrabold md:text-[3.6rem]",
};

export function SectionTitle({
  children,
  accent = [],
  size = "section",
  inverse = false,
  className,
  id,
}: {
  children: string;
  accent?: string[];
  /** Size and colour go through props: two Tailwind classes for one property don't override by order. */
  size?: keyof typeof SIZES;
  inverse?: boolean;
  className?: string;
  id?: string;
}) {
  const words = children.split(" ");
  return (
    <motion.h2
      id={id}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.5 }}
      className={cx(
        "font-display tracking-[-0.01em] text-balance",
        SIZES[size],
        inverse ? "text-white" : "text-ink",
        className,
      )}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          {/* The padding keeps descenders inside the mask; the negative margin gives the line height back. */}
          <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
            <motion.span
              className={cx("inline-block", accent.includes(word) && "text-teal")}
              variants={{
                hidden: { y: "108%" },
                shown: { y: "0%", transition: { duration: 0.95, delay: i * 0.055, ease: EASE_OUT } },
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </motion.h2>
  );
}
