import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { CountUp, DoctorButtonDemo, RisingPhone } from "./DoctorDemos";
import { ClipReveal } from "./ClipReveal";
import { Reveal } from "./Reveal";
import { Container, SectionLead, SectionTitle } from "./shared";
import { Spotlight } from "./Spotlight";

const card = "relative isolate flex flex-col overflow-hidden rounded-[28px]";
const cardTitle = "font-display text-[1.6rem] leading-[1.12] font-bold text-balance md:text-[1.75rem]";
const cardBody = "mt-3 max-w-[46ch] text-[16px] leading-relaxed text-pretty";

const DESK_ROWS = [
  { token: "A-23", name: "Priya Meena", phone: "98290 •••45" },
  { token: "A-24", name: "Harish Saini", phone: "90010 •••63" },
  { token: "A-25", name: "Kamla Bai", phone: "walk-in" },
];

/** The desk header's figures from the demo clinic's morning (labelled as an example on the card). */
const STATS = [
  { value: 31, decimals: 0, unit: null, label: "patients seen" },
  { value: 5.8, decimals: 1, unit: "min", label: "average consult" },
  { value: 22, decimals: 0, unit: "min", label: "average wait" },
];

/** How baari positions the doctor: calmer door, a professional TV, control from the chair, numbers, privacy. */
export function DoctorBento() {
  return (
    <section id="doctors" aria-labelledby="doctors-title" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <Reveal className="flex flex-col gap-5">
          <SectionTitle id="doctors-title" className="max-w-[20ch]">
            Your clinic looks as organised as a hospital.
          </SectionTitle>
          <SectionLead>Patients judge a clinic by its wait. baari makes yours feel short, fair and in order.</SectionLead>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          {/* A: the door stays quiet */}
          <Reveal className={`${card} bg-teal-tint p-7 md:col-span-2 md:p-9 lg:col-span-5 lg:row-span-2`}>
            <Spotlight />
            <h3 className={`${cardTitle} text-teal-darker`}>No more &ldquo;kitna time lagega?&rdquo; at your door</h3>
            <p className={`${cardBody} text-teal-dark`}>
              Every patient sees their place in line and the approx wait on their own phone, so they stop asking you.
            </p>
            <div className="-mb-40 flex flex-1 items-end justify-center pt-10 md:-mb-48">
              <RisingPhone
                src="/landing/patient-waiting.webp"
                alt="A patient's phone showing token A-23 with 5 people ahead and an approx wait of 25 to 30 minutes"
                width={780}
                height={1688}
                className="w-[88%] max-w-[380px]"
              />
            </div>
          </Reveal>

          {/* B: the TV */}
          <Reveal delay={0.08} className={`${card} border border-line bg-surface p-7 md:col-span-2 md:p-9 lg:col-span-7`}>
            <Spotlight />
            <h3 className={cardTitle}>Your name and room on the waiting-room TV</h3>
            <p className={`${cardBody} text-muted`}>
              Big tokens anyone can read from the back row, with a flash and an optional chime when a number is called.
            </p>
            <ClipReveal radius={18} className="mt-8">
              <div className="rounded-[18px] bg-teal-ink p-2 shadow-[0_30px_60px_-30px_rgb(14_23_23/0.5)]">
                <Image
                  src="/landing/tv.webp"
                  alt="The waiting-room TV calling A-18 for Dr. Anita Sharma in Room 2 and B-07 for Dr. Rohit Verma in Room 3, with the next five tokens for each"
                  width={1920}
                  height={1080}
                  sizes="(min-width: 1024px) 640px, 90vw"
                  className="block h-auto w-full rounded-[11px]"
                />
              </div>
            </ClipReveal>
          </Reveal>

          {/* C: the doctor's own button */}
          <Reveal delay={0.12} className={`${card} border border-line bg-surface p-7 lg:col-span-4`}>
            <Spotlight />
            <h3 className={cardTitle}>Call the next patient from your chair</h3>
            <p className={`${cardBody} mb-6 text-muted`}>A spare phone in your room becomes a big Next button. No bell, no shouting names.</p>
            <div className="mt-auto">
              <DoctorButtonDemo />
            </div>
          </Reveal>

          {/* D: numbers */}
          <Reveal delay={0.16} className={`${card} bg-teal-ink p-7 text-white lg:col-span-3`}>
            <Spotlight tone="dark" />
            <h3 className={`${cardTitle} text-white`}>Every consult timed for you</h3>
            <dl className="mt-7 flex flex-col gap-5">
              {STATS.map((st) => (
                <div key={st.label} className="flex flex-col-reverse gap-1">
                  <dt className="text-[14px] text-white/70">{st.label}</dt>
                  <dd className="font-display text-[44px] leading-none font-extrabold text-teal-bright">
                    <CountUp to={st.value} decimals={st.decimals} />
                    {st.unit && <span className="ml-1.5 text-[22px]">{st.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-auto pt-7 text-[13px] leading-snug text-white/60">
              Example morning, two doctors. The desk shows your real numbers live.
            </p>
          </Reveal>

          {/* E: privacy */}
          <Reveal
            className={`${card} border border-line bg-surface p-7 md:col-span-2 md:p-9 lg:col-span-12 lg:flex-row lg:items-center lg:gap-12`}
          >
            <Spotlight />
            <div className="lg:w-[38%]">
              <h3 className={cardTitle}>Names stay off the screen</h3>
              <p className={`${cardBody} text-muted`}>
                The TV shows token numbers only. Phone numbers are masked at the desk, and staff unlock it with their own PIN.
              </p>
            </div>
            <div className="mt-8 grid flex-1 items-center gap-4 sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] lg:mt-0">
              <div className="rounded-[20px] border border-line bg-canvas p-4">
                <p className="px-2 pb-2 text-[12px] font-bold tracking-[0.08em] text-muted uppercase">At the desk</p>
                <ul className="flex flex-col gap-1.5">
                  {DESK_ROWS.map((r, i) => (
                    <li key={r.token}>
                      <Reveal delay={0.1 + i * 0.08} y={10} className="flex items-baseline gap-3 rounded-[12px] bg-surface px-3 py-2.5">
                        <span className="w-[52px] flex-none font-display text-[20px] font-extrabold text-ink">{r.token}</span>
                        <span className="truncate text-[15px] font-semibold text-ink">{r.name}</span>
                        <span className="ml-auto flex-none text-[13px] text-muted">{r.phone}</span>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </div>
              <ArrowRightIcon size={24} weight="bold" className="mx-auto rotate-90 text-teal sm:rotate-0" aria-hidden="true" />
              <div className="rounded-[20px] bg-teal-tint p-4">
                <p className="px-2 pb-2 text-[12px] font-bold tracking-[0.08em] text-teal-dark uppercase">On the TV</p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                  {DESK_ROWS.map((r, i) => (
                    <li key={r.token}>
                      <Reveal
                        delay={0.35 + i * 0.08}
                        y={10}
                        className="flex h-[46px] items-center justify-center rounded-[12px] bg-surface font-display text-[22px] font-extrabold text-teal"
                      >
                        {r.token}
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
