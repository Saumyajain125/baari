"use client";

import { ArrowRightIcon, BellIcon, ClockIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { cx } from "@/components/public/ui";
import { EASE_OUT } from "./Reveal";

/*
 * The hero's motion graphic: one doctor's queue playing out in a loop.
 * The doctor taps "Next patient", the waiting-room TV flashes the new token
 * and Priya's phone (token A-23) counts down until it says it's her turn.
 * Everything is sized in container units (cqw), so the scene scales as one
 * picture from phone to desktop. Data continues the app's demo clinic.
 */

const TEAL = "#0e7c7b";
const TEAL_DARK = "#0a5958";
const TINT = "#e6f2f1";
const WHITE = "#ffffff";

const PATIENT = 23;
const FIRST_CALL = 19;
const LAST_STEP = PATIENT - FIRST_CALL;
const LAST_TOKEN = 27;
const CLOCKS = ["10:51", "10:57", "11:03", "11:08", "11:14"];
/** People ahead × 5.8 min average consult, as a 5-minute range (the app's own rule). */
const ETA: Record<number, string> = { 3: "approx 15 to 20 min", 2: "approx 10 to 15 min", 1: "approx 5 to 10 min" };
const STEP_MS = 2700;
const TURN_HOLD_MS = 4800;
const PRESS_LEAD_MS = 520;

const token = (n: number) => `A-${n}`;

export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion() ?? false;
  const running = inView && !reduce;
  const [step, setStep] = useState(0);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!running) return;
    const isTurn = step === LAST_STEP;
    const hold = isTurn ? TURN_HOLD_MS : STEP_MS;
    const timers = [
      setTimeout(() => {
        setPressing(false);
        setStep((s) => (s === LAST_STEP ? 0 : s + 1));
      }, hold),
    ];
    if (!isTurn) timers.push(setTimeout(() => setPressing(true), hold - PRESS_LEAD_MS));
    return () => timers.forEach(clearTimeout);
  }, [running, step]);

  const serving = FIRST_CALL + step;
  const pressed = pressing && running;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Animated example: the doctor taps Next patient, the waiting-room TV calls the next token, and a patient's phone counts down until it says it's her turn."
      className="@container relative w-full select-none"
    >
      <div aria-hidden="true" className="relative aspect-[100/80] w-full">
        <Tv serving={serving} step={step} still={reduce} />
        <DoctorRoom serving={serving} pressed={pressed} />
        <Phone serving={serving} />
      </div>
    </div>
  );
}

/** A number or label that rolls up when it changes. */
function Roll({ value, className }: { value: string | number; className?: string }) {
  return (
    <span className={cx("relative inline-flex", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "55%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-55%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Mark({ className, variant }: { className: string; variant?: "brand" | "inverse" }) {
  return (
    <span className={cx("block flex-none [&>svg]:size-full", className)}>
      <LogoMark variant={variant} />
    </span>
  );
}

function Tv({ serving, step, still }: { serving: number; step: number; still: boolean }) {
  const next = [1, 2, 3, 4].map((i) => serving + i).filter((n) => n <= LAST_TOKEN);
  return (
    <div className="land-rise absolute top-[2%] left-[1%] w-[69%]" style={{ "--d": "180ms" } as React.CSSProperties}>
      <div className="rounded-[2.2cqw] bg-teal-ink p-[0.9cqw] shadow-[0_3cqw_6cqw_-2.5cqw_rgb(14_23_23/0.45)]">
        <div className="flex aspect-[16/10] flex-col gap-[1.3cqw] overflow-hidden rounded-[1.3cqw] bg-canvas p-[1.7cqw]">
          <div className="flex items-center gap-[1.1cqw]">
            <Mark className="size-[3.3cqw]" />
            <div className="flex min-w-0 flex-1 flex-col gap-[0.35cqw]">
              <p className="truncate font-display text-[2.05cqw] leading-none font-bold">Sharma Family Clinic</p>
              <p className="text-[1.05cqw] leading-none text-muted">Thu, 29 Oct · Walk-in queue</p>
            </div>
            <p className="flex items-baseline gap-[0.5cqw] font-display text-[2.5cqw] leading-none font-extrabold tabular-nums">
              <Roll value={CLOCKS[step]} />
              <span>AM</span>
            </p>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_14.5cqw] gap-[1.3cqw]">
            <div className="flex min-h-0 flex-col gap-[1.2cqw] rounded-[1.7cqw] border border-line bg-surface p-[1.5cqw]">
              <div className="flex items-center gap-[1cqw]">
                <span className="flex size-[3.1cqw] flex-none items-center justify-center rounded-[0.9cqw] bg-teal font-display text-[1.8cqw] font-extrabold text-white">
                  A
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[0.3cqw]">
                  <p className="truncate font-display text-[1.65cqw] leading-none font-bold">Dr. Anita Sharma</p>
                  <p className="text-[1.05cqw] leading-none text-muted">Room 2</p>
                </div>
                <span className="flex-none rounded-full bg-teal-tint px-[1cqw] py-[0.4cqw] text-[1.05cqw] font-semibold text-teal-dark">
                  <Roll value={LAST_TOKEN - serving} /> waiting
                </span>
              </div>

              <div className="relative flex min-h-0 flex-1">
                <motion.div
                  key={serving}
                  className="flex flex-1 flex-col items-center justify-center gap-[0.6cqw] rounded-[1.4cqw]"
                  initial={{ backgroundColor: still ? TINT : TEAL, color: still ? TEAL_DARK : WHITE }}
                  animate={
                    still
                      ? { backgroundColor: TINT, color: TEAL_DARK }
                      : { backgroundColor: [TEAL, TINT, TEAL, TINT], color: [WHITE, TEAL_DARK, WHITE, TEAL_DARK] }
                  }
                  transition={{ duration: 1.5, times: [0, 0.3, 0.6, 1], ease: "easeOut" }}
                >
                  <p className="text-[1cqw] font-bold tracking-[0.08em] uppercase">Now calling</p>
                  <motion.p
                    className="font-display text-[8.4cqw] leading-[0.95] font-extrabold"
                    initial={{ color: still ? TEAL : WHITE, scale: still ? 1 : 1.08 }}
                    animate={
                      still
                        ? { color: TEAL, scale: 1 }
                        : { color: [WHITE, TEAL, WHITE, TEAL], scale: [1.08, 1, 1.04, 1] }
                    }
                    transition={{ duration: 1.5, times: [0, 0.3, 0.6, 1], ease: "easeOut" }}
                  >
                    {token(serving)}
                  </motion.p>
                  <p className="text-[1.3cqw] font-semibold">Please go to Room 2</p>
                </motion.div>
                {!still && (
                  <motion.span
                    key={`ring-${serving}`}
                    className="pointer-events-none absolute inset-0 rounded-[1.4cqw] border-[0.35cqw] border-teal"
                    initial={{ opacity: 0.7, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.07 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-[0.8cqw] rounded-[1.7cqw] border border-line bg-surface p-[1.3cqw]">
              <p className="text-[1cqw] font-bold tracking-[0.08em] text-muted uppercase">Next</p>
              <div className="relative flex flex-col gap-[0.8cqw]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {next.map((n) => (
                    <motion.div
                      key={n}
                      layout
                      initial={{ opacity: 0, x: "35%" }}
                      animate={{ opacity: 1, x: "0%" }}
                      exit={{ opacity: 0, x: "-35%" }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className={cx(
                        "flex h-[4.1cqw] items-center justify-center rounded-[1cqw] font-display text-[1.85cqw] font-bold",
                        n === PATIENT ? "bg-teal-tint text-teal-dark ring-[0.25cqw] ring-teal ring-inset" : "bg-subtle text-ink",
                      )}
                    >
                      {token(n)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-[2.2cqw] w-[10cqw] bg-gradient-to-b from-[#2a3a3a] to-[#3d4f4f]" />
      <div className="mx-auto h-[0.8cqw] w-[24cqw] rounded-full bg-line-strong" />
    </div>
  );
}

function DoctorRoom({ serving, pressed }: { serving: number; pressed: boolean }) {
  return (
    <div
      className="land-rise absolute top-[67%] left-[3%] w-[47%] rounded-[2.4cqw] border border-line bg-surface p-[1.7cqw] shadow-[0_2.5cqw_5cqw_-2.5cqw_rgb(20_33_33/0.3)]"
      style={{ "--d": "520ms" } as React.CSSProperties}
    >
      <div className="mb-[1.3cqw] flex items-center justify-between gap-[1cqw]">
        <div className="flex min-w-0 flex-col gap-[0.45cqw]">
          <p className="text-[0.95cqw] leading-none font-bold tracking-[0.08em] text-muted uppercase">Doctor&apos;s room</p>
          <p className="truncate font-display text-[1.6cqw] leading-none font-bold">Dr. Anita Sharma</p>
        </div>
        <div className="flex flex-none items-baseline gap-[0.6cqw]">
          <span className="text-[1cqw] text-muted">With you</span>
          <Roll value={token(serving)} className="font-display text-[2.2cqw] leading-none font-extrabold text-teal" />
        </div>
      </div>
      <motion.div
        className="relative flex h-[7.2cqw] flex-col items-center justify-center overflow-hidden rounded-[1.5cqw] bg-teal text-white"
        initial={false}
        animate={{
          y: pressed ? "0.45cqw" : "0cqw",
          boxShadow: pressed ? `0 0.15cqw 0 ${TEAL_DARK}` : `0 0.6cqw 0 ${TEAL_DARK}`,
        }}
        transition={{ duration: 0.12 }}
      >
        <AnimatePresence>
          {pressed && (
            <motion.span
              key="ripple"
              className="absolute top-1/2 left-1/2 size-[7cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35"
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <p className="relative flex items-center gap-[0.8cqw] font-display text-[2.15cqw] leading-none font-extrabold">
          Next patient
          <ArrowRightIcon weight="bold" className="size-[2cqw]" />
        </p>
        <p className="relative mt-[0.5cqw] text-[1cqw] leading-none opacity-90">
          Calls <Roll value={token(serving + 1)} />
        </p>
      </motion.div>
    </div>
  );
}

function Phone({ serving }: { serving: number }) {
  const isTurn = serving === PATIENT;
  const ahead = PATIENT - serving - 1;
  return (
    <div
      className="land-rise absolute top-[11%] left-[68%] w-[30%]"
      style={{ "--d": "380ms" } as React.CSSProperties}
    >
      <div className="rounded-[4.6cqw] bg-teal-ink p-[0.75cqw] shadow-[0_3cqw_6cqw_-2cqw_rgb(14_23_23/0.5)]">
        <div className="relative flex aspect-[9/18] flex-col overflow-hidden rounded-[3.9cqw] bg-canvas">
          <span className="absolute top-[0.9cqw] left-1/2 z-10 h-[1.5cqw] w-[7.5cqw] -translate-x-1/2 rounded-full bg-teal-ink" />
          <div className="flex items-center gap-[0.9cqw] border-b border-line bg-surface px-[1.5cqw] pt-[3.4cqw] pb-[1.1cqw]">
            <Mark className="size-[2.5cqw]" />
            <div className="flex min-w-0 flex-col gap-[0.3cqw]">
              <p className="truncate font-display text-[1.3cqw] leading-none font-bold">Sharma Family Clinic</p>
              <p className="truncate text-[0.85cqw] leading-none text-muted">Dr. Anita Sharma · Room 2</p>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col p-[1.3cqw]">
            <AnimatePresence mode="wait" initial={false}>
              {isTurn ? (
                <motion.div
                  key="turn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="flex flex-1 flex-col items-center justify-center gap-[0.9cqw] rounded-[2.3cqw] bg-teal px-[1.4cqw] text-center text-white shadow-[0_0.5cqw_0_#0a5958]"
                >
                  <span className="relative flex size-[5cqw] items-center justify-center rounded-full bg-white/20">
                    <motion.span
                      className="absolute inset-0 rounded-full border-[0.25cqw] border-white/60"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 1.3, repeat: 2, ease: "easeOut" }}
                    />
                    <BellIcon weight="bold" className="size-[2.4cqw]" />
                  </span>
                  <p className="font-display text-[2.2cqw] leading-[1.05] font-bold">
                    It&apos;s your turn,
                    <br />
                    <span className="text-[1.45cqw]">please go to Room 2</span>
                  </p>
                  <p className="font-display text-[7.4cqw] leading-none font-extrabold">{token(PATIENT)}</p>
                  <p lang="hi" className="text-[1.05cqw] leading-snug">
                    आपकी बारी है, कृपया कमरा 2 में जाएँ
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-[1.1cqw]"
                >
                  <div className="flex flex-col items-center rounded-[2.2cqw] border border-line bg-surface px-[1.4cqw] pt-[1.8cqw] pb-[1.6cqw] text-center">
                    <p className="text-[0.85cqw] font-bold tracking-[0.08em] text-muted uppercase">Your token</p>
                    <p className="mt-[0.6cqw] font-display text-[7cqw] leading-none font-extrabold text-teal">
                      {token(PATIENT)}
                    </p>
                    <p className="mt-[0.5cqw] text-[1.1cqw] font-semibold">Priya Meena</p>
                    <span className="my-[1.2cqw] h-px w-full bg-line" />
                    <p className="font-display text-[1.7cqw] leading-tight font-bold">
                      {ahead > 0 ? (
                        <>
                          <Roll value={ahead} /> {ahead === 1 ? "person" : "people"} ahead of you
                        </>
                      ) : (
                        "You're next"
                      )}
                    </p>
                    <p className="mt-[0.5cqw] flex items-center gap-[0.5cqw] text-[1cqw] text-muted">
                      <ClockIcon weight="bold" className="size-[1.1cqw]" />
                      {ahead > 0 ? ETA[ahead] : "Please stay close"}
                    </p>
                    <p lang="hi" className="mt-[0.5cqw] text-[1.1cqw] font-semibold">
                      {ahead === 0 ? "आप अगले हैं" : ahead === 1 ? "आपसे पहले 1 व्यक्ति" : `आपसे पहले ${ahead} लोग`}
                    </p>
                  </div>

                  <div className="flex items-center gap-[1.1cqw] rounded-[2cqw] border border-line bg-surface p-[1.3cqw]">
                    <Roll
                      value={token(serving)}
                      className="font-display text-[3.1cqw] leading-none font-extrabold text-teal"
                    />
                    <div className="flex min-w-0 flex-col gap-[0.35cqw]">
                      <p className="text-[0.85cqw] leading-none text-muted">With doctor now · Room 2</p>
                      <p className="truncate text-[1.1cqw] leading-none font-semibold">Dr. Anita Sharma</p>
                    </div>
                  </div>

                  <div className="rounded-[2cqw] border border-line bg-surface p-[1.3cqw]">
                    <p className="text-[1.05cqw] font-semibold">How far are you?</p>
                    <div className="mt-[0.9cqw] grid grid-cols-2 gap-[0.7cqw] text-[0.95cqw]">
                      <span className="flex h-[3.4cqw] items-center justify-center rounded-[0.9cqw] border border-line-strong">
                        Here
                      </span>
                      <span className="flex h-[3.4cqw] items-center justify-center rounded-[0.9cqw] border-[0.2cqw] border-teal bg-teal-tint font-semibold text-teal-dark">
                        Under 15 min
                      </span>
                    </div>
                  </div>
                  <p className="px-[1cqw] text-center text-[0.85cqw] leading-snug text-muted">
                    This page updates by itself. Keep it open.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
