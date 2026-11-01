"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/public/ui";
import { EASE_OUT, Reveal } from "./Reveal";
import { Container, SectionTitle } from "./shared";

interface Beat {
  title: string;
  body: string;
  img: { src: string; alt: string; width: number; height: number };
  kind: "poster" | "phone";
}

const BEATS: Beat[] = [
  {
    title: "Stick up the QR poster",
    body: "Print it from settings and put it where patients wait. It's in English and Hindi, and scans in colour or black and white.",
    img: {
      src: "/landing/poster.webp",
      alt: "The A4 QR poster: Scan to join the queue, in English and Hindi, with three simple steps",
      width: 1100,
      height: 1557,
    },
    kind: "poster",
  },
  {
    title: "Patients scan and join",
    body: "Name, doctor and how far away they are. No app, no sign-up. Patients without a smartphone get a paper slip at the desk.",
    img: {
      src: "/landing/patient-join.webp",
      alt: "The join screen on a patient's phone: pick the doctor, type a name, optional mobile number",
      width: 780,
      height: 1688,
    },
    kind: "phone",
  },
  {
    title: "They wait wherever they like",
    body: "In the car, at the chemist, outside with a chai. Their phone shows how many people are ahead and the approx wait, live.",
    img: {
      src: "/landing/patient-waiting.webp",
      alt: "A patient's phone showing token A-23, 5 people ahead, approx 25 to 30 minutes",
      width: 780,
      height: 1688,
    },
    kind: "phone",
  },
  {
    title: "The TV calls them in",
    body: "Their token flashes on the waiting-room TV, with a chime if you want one, and the page on their phone shows it's their turn.",
    img: {
      src: "/landing/patient-turn.webp",
      alt: "A patient's phone saying It's your turn, please go to Room 2, token A-23",
      width: 780,
      height: 1688,
    },
    kind: "phone",
  },
];

function Visual({ beat, priority = false }: { beat: Beat; priority?: boolean }) {
  if (beat.kind === "poster") {
    return (
      <div className="w-[min(78%,400px)] -rotate-2 rounded-[6px] bg-surface p-1 shadow-[0_40px_80px_-30px_rgb(14_23_23/0.45)]">
        <Image {...beat.img} alt={beat.img.alt} sizes="400px" priority={priority} className="block h-auto w-full" />
      </div>
    );
  }
  return (
    <div className="w-[min(62%,300px)] rounded-[44px] bg-teal-ink p-[9px] shadow-[0_40px_80px_-30px_rgb(14_23_23/0.55)]">
      {/* Status-bar strip so the notch sits above the app's own header. */}
      <div className="relative overflow-hidden rounded-[36px] bg-surface pt-[34px]">
        <span className="absolute top-[10px] left-1/2 z-10 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-teal-ink" />
        <Image {...beat.img} alt={beat.img.alt} sizes="300px" className="block h-auto w-full" />
      </div>
    </div>
  );
}

/** One beat of the story; tells the section which picture to show while it sits mid-screen. */
function BeatText({ beat, index, onActive }: { beat: Beat; index: number; onActive: (i: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const centred = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (centred) onActive(index);
  }, [centred, index, onActive]);

  return (
    <li ref={ref} className="relative flex flex-col gap-8 lg:min-h-[72vh] lg:justify-center lg:pl-14">
      <div className="flex justify-center rounded-[28px] bg-teal-tint py-10 lg:hidden">
        <Visual beat={beat} />
      </div>
      {/* Only the wide layout dims the steps that aren't in focus; on phones each step has its own picture. */}
      <div className={cx("flex flex-col gap-3 transition-opacity duration-500", !centred && "lg:opacity-35")}>
        <h3 className="font-display text-[1.9rem] leading-[1.1] font-bold text-ink md:text-[2.25rem]">{beat.title}</h3>
        <p className="max-w-[42ch] text-[17px] leading-relaxed text-pretty text-muted md:text-[18px]">{beat.body}</p>
      </div>
    </li>
  );
}

/**
 * The patient's journey told on scroll: on wide screens the picture on the
 * left stays put and changes as each step reaches the middle of the screen,
 * while a rail fills to show how far along the visit is.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start center", "end center"] });
  // The rail runs from the first step's dot to the last one's (the middle of the first and last eighth).
  const half = 0.5 / BEATS.length;
  const fill = useSpring(useTransform(scrollYProgress, [half, 1 - half], [0, 1]), { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-surface py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionTitle id="how-title" className="max-w-[18ch]">
            {"From the poster on your wall to “it's your turn”"}
          </SectionTitle>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:mt-4 lg:grid-cols-2 lg:gap-8">
          <div className="sticky top-16 hidden h-[calc(100dvh-4rem)] items-center lg:flex">
            <div className="relative flex aspect-[4/5] max-h-full w-full items-center justify-center overflow-hidden rounded-[28px] bg-teal-tint">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={active}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, y: 60, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -60, scale: 0.94 }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                >
                  <Visual beat={BEATS[active]} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute top-[12.5%] bottom-[12.5%] left-[5px] hidden w-[3px] rounded-full bg-line lg:block">
              <motion.div style={{ scaleY: fill }} className="h-full w-full origin-top rounded-full bg-teal" />
            </div>
            <ol ref={listRef} className="flex flex-col gap-16 lg:gap-0">
              {BEATS.map((beat, i) => (
                <BeatText key={beat.title} beat={beat} index={i} onActive={setActive} />
              ))}
            </ol>
            <ul aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden lg:block">
              {BEATS.map((beat, i) => (
                <li
                  key={beat.title}
                  className={cx(
                    "absolute -left-[3px] size-[19px] rounded-full border-[3px] transition-colors duration-500",
                    i <= active ? "border-teal bg-teal" : "border-line-strong bg-surface",
                  )}
                  style={{ top: `calc(${(i + 0.5) * (100 / BEATS.length)}% - 9px)` }}
                />
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
