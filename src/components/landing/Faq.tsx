"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useId, useState } from "react";
import { cx } from "@/components/public/ui";
import { Reveal } from "./Reveal";
import { Container, SectionTitle } from "./shared";

const QUESTIONS = [
  {
    q: "Do patients need to download an app?",
    a: "No. They scan the QR poster and get a token in their phone's browser. No app, no sign-up.",
  },
  {
    q: "What about patients without a smartphone?",
    a: "The desk adds them as a walk-in and can print a paper token slip with their number and the people ahead, in English and Hindi.",
  },
  {
    q: "What happens when the internet goes down?",
    a: "The desk keeps working. Every tap is saved on the device and syncs when the connection is back. The TV and patient phones catch up on their own.",
  },
  {
    q: "Which TV do I need?",
    a: "Any screen that can open a web page: a smart TV browser, a TV stick, or a laptop connected over HDMI. Open your clinic's TV link and press Full screen.",
  },
  {
    q: "Can I run more than one doctor?",
    a: "Yes. Each doctor gets a letter, a room and their own queue, so tokens read A-12, B-07 and so on. The TV shows them side by side.",
  },
  {
    q: "Who can see patient names?",
    a: "Only your desk, behind staff PINs. The TV shows token numbers, never names, and a patient's phone shows only their own token.",
  },
];

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle(): void }) {
  const id = useId();
  return (
    <div className="rounded-[22px] border border-line bg-surface transition-colors has-[button:hover]:border-line-strong">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-a`}
          id={`${id}-q`}
          onClick={onToggle}
          className="flex w-full items-center gap-4 rounded-[22px] px-6 py-5 text-left"
        >
          <span className="flex-1 text-[17px] leading-snug font-semibold text-ink">{q}</span>
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className={cx(
              "flex size-8 flex-none items-center justify-center rounded-full transition-colors",
              open ? "bg-teal text-white" : "bg-teal-tint text-teal-dark",
            )}
          >
            <PlusIcon size={16} weight="bold" />
          </motion.span>
        </button>
      </h3>
      {/* grid-rows 0fr → 1fr opens to the answer's natural height without measuring it. */}
      <div
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
        className={cx(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <p className="max-w-[60ch] px-6 pb-6 text-[16px] leading-relaxed text-muted">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-20 md:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionTitle id="faq-title" className="max-w-[12ch]">
            Common questions
          </SectionTitle>
        </Reveal>
        <Reveal delay={0.08} className="flex flex-col gap-3">
          {QUESTIONS.map((item, i) => (
            <Item key={item.q} {...item} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
