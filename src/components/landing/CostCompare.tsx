"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { EASE_OUT, Reveal } from "./Reveal";
import { Container, SectionLead, SectionTitle } from "./shared";

/** What a wired token display setup usually involves, row for row against what replaces it. */
const ROWS: { old: string; label: string; now: string }[] = [
  { old: "LED token display board", label: "Display", now: "Any smart TV, or a laptop on HDMI" },
  { old: "Calling keypad for each doctor's room", label: "Doctor's keypad", now: "A spare phone in the consult room" },
  { old: "Ticket dispenser and paper rolls", label: "Tokens", now: "Patients' own phones. Paper slips only if you want them" },
  { old: "Electrician for wiring and fitting", label: "Setup", now: "Sign up, add your doctors, print the poster" },
  { old: "Yearly maintenance contract", label: "Upkeep", now: "Nothing to service. Updates arrive by themselves" },
];

/**
 * The cost story. When the lists scroll in, the old setup is struck through
 * line by line and the baari side ticks in after it.
 */
export function CostCompare() {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useInView(ref, { once: true, amount: 0.35 });

  return (
    <section id="cost" aria-labelledby="cost-title" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <Reveal className="flex flex-col gap-5">
          <p className="text-[13px] font-bold tracking-[0.12em] text-teal-dark uppercase">Lower running cost</p>
          <SectionTitle id="cost-title">
            <span className="text-teal">₹0</span> in new hardware.
          </SectionTitle>
          <SectionLead>
            baari opens in the browser on the phones, tablet, laptop and TV your clinic already has. Nothing to fit, wire or
            repair.
          </SectionLead>
        </Reveal>

        <div ref={ref} className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] border border-line bg-surface p-7 md:p-9">
            <h3 className="font-display text-[1.35rem] leading-tight font-bold text-muted">A typical token display system</h3>
            <ul className="mt-6 flex flex-col gap-5">
              {ROWS.map((r, i) => (
                <li key={r.old} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full bg-subtle text-faint">
                    <XIcon size={14} weight="bold" />
                  </span>
                  <span className="relative text-[17px] leading-snug text-muted">
                    {r.old}
                    <motion.span
                      aria-hidden="true"
                      className="absolute top-[55%] left-0 h-[2px] w-full origin-left rounded-full bg-faint"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: shown ? 1 : 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.18, ease: EASE_OUT }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] bg-teal p-7 text-white shadow-[0_30px_60px_-30px_rgb(10_89_88/0.7)] md:p-9">
            <h3 className="font-display text-[1.35rem] leading-tight font-bold">With baari</h3>
            <ul className="mt-6 flex flex-col gap-5">
              {ROWS.map((r, i) => (
                <motion.li
                  key={r.label}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 16 }}
                  animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                  transition={{ duration: 0.6, delay: 0.55 + i * 0.18, ease: EASE_OUT }}
                >
                  <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full bg-white text-teal">
                    <CheckIcon size={14} weight="bold" />
                  </span>
                  <span className="text-[17px] leading-snug">
                    <span className="font-semibold">{r.label}:</span> <span className="text-white/90">{r.now}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
