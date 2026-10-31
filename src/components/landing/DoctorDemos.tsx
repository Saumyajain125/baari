"use client";

import { ArrowRightIcon, HandTapIcon } from "@phosphor-icons/react";
import Image, { type StaticImageData } from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/public/ui";
import { EASE_OUT } from "./Reveal";

/** A screenshot in a phone bezel that rises a little as its card scrolls through view. */
export function RisingPhone({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string | StaticImageData;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["14%", "-6%"]);
  return (
    <div ref={ref} className={cx("relative", className)}>
      <motion.div style={{ y }} className="rounded-[44px] bg-teal-ink p-[9px] shadow-[0_40px_80px_-30px_rgb(14_23_23/0.55)]">
        {/* Status-bar strip so the notch sits above the app's own header. */}
        <div className="relative overflow-hidden rounded-[36px] bg-surface pt-[34px]">
          <span className="absolute top-[10px] left-1/2 z-10 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-teal-ink" />
          <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 1024px) 320px, 70vw" className="block h-auto w-full" />
        </div>
      </motion.div>
    </div>
  );
}

const FIRST = 18;
const LAST = 27;

/**
 * The doctor's room button, tappable. Each tap calls the next token, the way
 * a spare phone in the consult room works in the app. Nudges with a pulse
 * until the visitor tries it once.
 */
export function DoctorButtonDemo() {
  const [serving, setServing] = useState(FIRST);
  const [tried, setTried] = useState(false);
  const reduce = usePrefersReducedMotion();
  const waiting = LAST - serving;

  function next() {
    setTried(true);
    setServing((s) => (s >= LAST ? FIRST : s + 1));
  }

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-canvas p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold tracking-[0.08em] text-muted uppercase">With you now</span>
          <span className="relative h-[44px] overflow-hidden font-display text-[40px] leading-[44px] font-extrabold text-teal">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={serving}
                className="block"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              >
                A-{serving}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        <span className="rounded-full bg-teal-tint px-3 py-1 text-[14px] font-semibold text-teal-dark" aria-live="polite">
          {waiting === 0 ? "Queue clear" : `${waiting} waiting`}
        </span>
      </div>
      <div className="relative">
        {!tried && !reduce && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[16px] border-2 border-teal"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <button
          type="button"
          onClick={next}
          className="relative flex h-[76px] w-full flex-col items-center justify-center rounded-[16px] bg-teal text-white shadow-[0_5px_0_var(--color-teal-dark)] transition-[translate,box-shadow] duration-75 active:translate-y-[4px] active:shadow-[0_1px_0_var(--color-teal-dark)]"
        >
          <span className="flex items-center gap-2 font-display text-[24px] leading-none font-extrabold">
            Next patient <ArrowRightIcon size={22} weight="bold" />
          </span>
          <span className="mt-1.5 text-[13px] opacity-90">
            {serving >= LAST ? "Start again" : `Calls A-${serving + 1}`}
          </span>
        </button>
      </div>
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <HandTapIcon size={16} weight="bold" className="flex-none text-teal" />
        Try it. This is the button on the doctor&apos;s phone.
      </p>
    </div>
  );
}

/**
 * A figure that counts up when it first scrolls into view, and glides to its
 * new value whenever `to` changes after that.
 */
export function CountUp({
  to,
  decimals = 0,
  format,
  className,
}: {
  to: number;
  decimals?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = usePrefersReducedMotion();
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => (format ? format(v) : v.toFixed(decimals)));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration: 1.4, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, reduce, to, value]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
