"use client";

import { ArrowsDownUpIcon, KeyboardIcon, LockKeyIcon, PauseIcon, PrinterIcon, WifiSlashIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cx } from "@/components/public/ui";
import { ClipReveal } from "./ClipReveal";
import { EASE_OUT, Reveal } from "./Reveal";
import { Container, SectionLead, SectionTitle } from "./shared";

const SCREENS = [
  {
    id: "laptop",
    label: "Laptop",
    src: "/landing/desk-laptop.webp",
    width: 2400,
    height: 1500,
    alt: "The reception desk on a laptop: both doctors side by side, each with a Next patient button and the waiting list with tokens, names, visit type and wait time",
  },
  {
    id: "tablet",
    label: "Tablet",
    src: "/landing/desk-tablet.webp",
    width: 2360,
    height: 1640,
    alt: "The reception desk on a tablet: the token with the doctor, a large Next patient button and the up-next list with one-tap actions",
  },
  {
    id: "phone",
    label: "Phone",
    src: "/landing/desk-phone.webp",
    width: 780,
    height: 1688,
    alt: "The reception desk on a phone: the token with the doctor, the next patient button and the waiting list",
  },
] as const;

const GROUPS: { title: string; items: { icon: Icon; text: string }[] }[] = [
  {
    title: "In the rush",
    items: [
      { icon: ArrowsDownUpIcon, text: "Priority, back 2, skip and no-show, each a single tap" },
      { icon: PrinterIcon, text: "A printed token slip for walk-ins without a phone" },
      { icon: KeyboardIcon, text: "Laptop shortcuts: a doctor's letter calls their next patient, W adds a walk-in" },
    ],
  },
  {
    title: "When something goes wrong",
    items: [
      { icon: WifiSlashIcon, text: "Internet down? The desk keeps working and catches up later" },
      { icon: PauseIcon, text: "Pause a doctor for lunch. Patients see when they're back" },
      { icon: LockKeyIcon, text: "Locks itself after 10 idle minutes. Staff unlock with a PIN" },
    ],
  },
];

/** The reception desk on each device, switchable, with what it handles beneath. */
export function DeskShowcase() {
  const [active, setActive] = useState<(typeof SCREENS)[number]["id"]>("laptop");
  const screen = SCREENS.find((s) => s.id === active) ?? SCREENS[0];
  const base = useId();

  return (
    <section aria-labelledby="desk-title" className="bg-surface py-20 md:py-28">
      <Container>
        <Reveal className="flex flex-col gap-5">
          <SectionTitle id="desk-title" className="max-w-[20ch]">
            One big button runs the front desk
          </SectionTitle>
          <SectionLead>
            Next patient calls the next token, records the consult time and updates every screen. Every tap has a 5-second
            Undo.
          </SectionLead>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <div role="tablist" aria-label="Reception desk on" className="inline-flex rounded-full border border-line bg-canvas p-1">
            {SCREENS.map((s) => {
              const selected = s.id === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`${base}-tab-${s.id}`}
                  aria-selected={selected}
                  aria-controls={`${base}-panel`}
                  onClick={() => setActive(s.id)}
                  className={cx(
                    "relative h-10 rounded-full px-5 text-[15px] font-semibold transition-colors",
                    selected ? "text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId={`${base}-pill`}
                      className="absolute inset-0 rounded-full bg-teal"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{s.label}</span>
                </button>
              );
            })}
          </div>

          <ClipReveal className="mt-6">
            <div
              id={`${base}-panel`}
              role="tabpanel"
              aria-labelledby={`${base}-tab-${active}`}
              className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-teal-tint sm:aspect-[16/10]"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={screen.id}
                  className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 lg:p-12"
                  initial={{ opacity: 0, y: 40, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.55, ease: EASE_OUT }}
                >
                  {screen.id === "phone" ? (
                    <div className="h-full rounded-[40px] bg-teal-ink p-[8px] shadow-[0_40px_80px_-30px_rgb(14_23_23/0.55)]">
                      <Image
                        src={screen.src}
                        alt={screen.alt}
                        width={screen.width}
                        height={screen.height}
                        sizes="320px"
                        className="block h-full w-auto rounded-[32px]"
                      />
                    </div>
                  ) : (
                    <div className="max-h-full overflow-hidden rounded-[16px] border border-line bg-surface shadow-[0_40px_80px_-40px_rgb(14_23_23/0.5)]">
                      <Image
                        src={screen.src}
                        alt={screen.alt}
                        width={screen.width}
                        height={screen.height}
                        sizes="(min-width: 1200px) 1080px, 92vw"
                        className="block h-auto max-h-full w-full object-contain"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ClipReveal>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
          {GROUPS.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 0.1}>
              <h3 className="font-display text-[1.35rem] leading-tight font-bold text-ink">{g.title}</h3>
              <ul className="mt-5 flex flex-col gap-4">
                {g.items.map((it) => (
                  <li key={it.text} className="flex items-start gap-4">
                    <span className="flex size-10 flex-none items-center justify-center rounded-[12px] bg-teal-tint text-teal-dark">
                      <it.icon size={20} weight="bold" />
                    </span>
                    <span className="pt-2 text-[16px] leading-snug text-ink">{it.text}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
