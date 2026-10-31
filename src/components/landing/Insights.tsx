"use client";

import { ChartLineUpIcon, StethoscopeIcon, TimerIcon, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cx } from "@/components/public/ui";
import { CountUp } from "./DoctorDemos";
import { EASE_OUT, Reveal } from "./Reveal";
import { Container, SectionLead, SectionTitle } from "./shared";

/*
 * Example data, labelled as such on the page. Every figure on the panel is
 * derived from these arrays so the tiles, charts and sentences always agree.
 */
interface Doctor {
  id: string;
  short: string;
  name: string;
  /** Average consult in minutes, one value per week, oldest first (12 weeks). */
  weekly: number[];
  /** Average patients arriving in each hour of an OPD day, 9 am to 8 pm. */
  hourly: number[];
  /** Average consult in minutes by visit type. */
  visits: { newCase: number; followUp: number };
}

const DOCTORS: Doctor[] = [
  {
    id: "a",
    short: "Dr. Sharma",
    name: "Dr. Anita Sharma",
    weekly: [6.8, 6.5, 6.9, 6.4, 6.1, 6.3, 5.9, 6.0, 5.7, 5.9, 5.6, 5.8],
    hourly: [3, 6, 6, 4, 2, 0, 0, 0, 3, 6, 7, 3],
    visits: { newCase: 8.6, followUp: 4.4 },
  },
  {
    id: "b",
    short: "Dr. Verma",
    name: "Dr. Rohit Verma",
    weekly: [4.9, 5.2, 5.0, 5.4, 5.3, 5.6, 5.5, 5.9, 5.8, 6.1, 6.4, 6.3],
    hourly: [2, 4, 6, 5, 3, 0, 0, 0, 2, 4, 4, 2],
    visits: { newCase: 7.4, followUp: 4.3 },
  },
];

const FIRST_HOUR = 9;
/** Six OPD days a week for the 12 weeks shown. */
const OPD_DAYS = 72;
const Y_MIN = 4;
const Y_MAX = 8;
const HOUR_MAX = 8;
const VISIT_MAX = 10;
/** Accent for the one bar the story is about; the rest stay gray (checked with the dataviz palette validator). */
const BAR_GRAY = "#8f9998";

const POINTS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: TimerIcon,
    title: "Time per patient, for each doctor",
    body: "Your average consult, week by week, so you can see whether it is creeping up or settling down.",
  },
  {
    icon: ChartLineUpIcon,
    title: "When the rush comes",
    body: "The hours that bring the most patients, so you can plan staff, breaks and your own day around them.",
  },
  {
    icon: StethoscopeIcon,
    title: "New cases and follow-ups",
    body: "How much longer a new patient takes than a follow-up, doctor by doctor.",
  },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const hourLabel = (i: number) => {
  const h = FIRST_HOUR + i;
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;
};
const weekLabel = (i: number, n: number) => {
  const ago = n - 1 - i;
  return ago === 0 ? "This week" : ago === 1 ? "Last week" : `${ago} weeks ago`;
};

function summarise(d: Doctor) {
  const peak = d.hourly.indexOf(Math.max(...d.hourly));
  const drift = mean(d.weekly.slice(-4)) - mean(d.weekly.slice(0, 4));
  const ratio = d.visits.newCase / d.visits.followUp;
  return {
    seen: sum(d.hourly) * OPD_DAYS,
    avg: Math.round(mean(d.weekly) * 10) / 10,
    peak,
    trend:
      Math.abs(drift) < 0.05
        ? "Consults are steady over 12 weeks."
        : `Consults are ${Math.abs(drift).toFixed(1)} min ${drift < 0 ? "shorter" : "longer"} than 12 weeks ago.`,
    ratio: ratio >= 1.9 ? "about twice as long" : `${ratio.toFixed(1)} times as long`,
  };
}

/**
 * The long-run side of consult timing: every Next tap records how long the
 * consult took, and over weeks that becomes a picture of each doctor's work.
 * The panel is an illustration with example data; its charts draw themselves
 * in when they scroll into view and re-flow when you switch doctors.
 */
export function Insights() {
  return (
    <section id="insights" aria-labelledby="insights-title" className="scroll-mt-20 py-20 md:py-28">
      <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-14">
        <div className="lg:sticky lg:top-28">
          <Reveal className="flex flex-col gap-5">
            <p className="text-[13px] font-bold tracking-[0.12em] text-teal-dark uppercase">Insights for doctors</p>
            <SectionTitle id="insights-title" accent={["really"]}>
              See how your practice really runs.
            </SectionTitle>
            <SectionLead>
              baari times every consult, from the moment you call a patient in to the moment you press Next. Over weeks and
              months, those minutes add up to a clear picture of your work.
            </SectionLead>
          </Reveal>
          <ul className="mt-10 flex flex-col gap-6">
            {POINTS.map((p, i) => (
              <li key={p.title}>
                <Reveal delay={0.1 + i * 0.08} y={18} className="flex gap-4">
                  <span className="flex size-11 flex-none items-center justify-center rounded-full bg-teal-tint text-teal-dark">
                    <p.icon size={22} weight="bold" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[17px] font-semibold text-ink">{p.title}</span>
                    <span className="text-[15px] leading-relaxed text-muted">{p.body}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <Reveal delay={0.1} y={40}>
          <InsightsPanel />
        </Reveal>
      </Container>
    </section>
  );
}

function InsightsPanel() {
  const [activeId, setActiveId] = useState(DOCTORS[0].id);
  const doctor = DOCTORS.find((d) => d.id === activeId) ?? DOCTORS[0];
  const s = summarise(doctor);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const base = useId();

  return (
    <div
      ref={ref}
      className="rounded-[28px] border border-line bg-surface p-5 shadow-[0_50px_100px_-60px_rgb(14_23_23/0.45)] sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[22px] leading-none font-bold text-ink">Insights</h3>
          <span className="rounded-full bg-subtle px-3 py-1 text-[13px] font-semibold text-muted">Last 12 weeks</span>
        </div>
        <div role="tablist" aria-label="Doctor" className="inline-flex rounded-full border border-line bg-canvas p-1">
          {DOCTORS.map((d) => {
            const selected = d.id === activeId;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                id={`${base}-tab-${d.id}`}
                aria-selected={selected}
                aria-controls={`${base}-panel`}
                onClick={() => setActiveId(d.id)}
                className={cx(
                  "relative h-9 rounded-full px-4 text-[14px] font-semibold transition-colors",
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
                <span className="relative">{d.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${activeId}`}>
        <dl className="mt-6 grid grid-cols-3 divide-x divide-line rounded-[20px] bg-canvas py-4">
          <Tile label="Patients seen">
            <CountUp to={s.seen} format={(v) => Math.round(v).toLocaleString("en-IN")} />
          </Tile>
          <Tile label="Average consult">
            <CountUp to={s.avg} decimals={1} />
            <span className="ml-1 text-[15px] font-semibold text-muted">min</span>
          </Tile>
          <Tile label="Busiest hour">
            <Swap value={hourLabel(s.peak)} />
          </Tile>
        </dl>

        <div className="mt-7">
          <ChartHead title="Average consult in minutes, by week" note={s.trend} />
          <ConsultLine values={doctor.weekly} play={inView} />
        </div>

        <div className="mt-7 grid gap-8 border-t border-divider pt-7 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <ChartHead title="Patients by hour, average day" note={`Busiest at ${hourLabel(s.peak)}.`} />
            <HourBars values={doctor.hourly} peak={s.peak} play={inView} />
          </div>
          <div>
            <ChartHead title="Consult by visit type" note={`New patients take ${s.ratio} as follow-ups.`} />
            <VisitBars visits={doctor.visits} play={inView} />
          </div>
        </div>

        <DataTables doctor={doctor} />
      </div>

      <p className="mt-6 border-t border-divider pt-4 text-[13px] text-faint">Example data for two doctors, to show what builds up over time.</p>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-1 px-3 sm:px-5">
      <dt className="text-[12px] leading-tight text-muted sm:text-[13px]">{label}</dt>
      <dd className="flex items-baseline text-[22px] leading-none font-semibold text-ink sm:text-[28px]">{children}</dd>
    </div>
  );
}

/** A short text value that rolls when it changes (the busiest hour). */
function Swap({ value }: { value: string }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="inline-block whitespace-nowrap"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ChartHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
      <p className="mt-0.5 text-[13px] text-muted">{note}</p>
    </div>
  );
}

/** Tracks an element's width, for charts drawn in real pixels so their text never scales. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const LINE_H = 168;
const PAD = { top: 12, right: 64, bottom: 28, left: 34 };

/** One series, so no legend: the heading names it. A crosshair snaps to the nearest week on hover. */
function ConsultLine({ values, play }: { values: number[]; play: boolean }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = values.length;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = LINE_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (plotW * i) / (n - 1);
  const y = (v: number) => PAD.top + plotH * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN));
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;
  const last = values[n - 1];

  function onMove(e: PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div ref={wrapRef} className="relative" style={{ height: LINE_H }}>
      {width > 0 && (
        <svg width={width} height={LINE_H} aria-hidden="true" className="block overflow-visible">
          {[4, 6, 8].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[12px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          <text x={x(0)} y={LINE_H - 6} className="fill-muted text-[12px]">
            12 weeks ago
          </text>
          <text x={x(n - 1)} y={LINE_H - 6} textAnchor="end" className="fill-muted text-[12px]">
            This week
          </text>

          <motion.path
            fill="var(--color-teal)"
            initial={{ opacity: 0, d: area }}
            animate={{ opacity: play ? 0.1 : 0, d: area }}
            transition={{ opacity: { duration: 1, delay: 0.9 }, d: { duration: 0.8, ease: EASE_OUT } }}
          />
          <motion.path
            fill="none"
            stroke="var(--color-teal)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, d: line }}
            animate={{ pathLength: play ? 1 : 0, d: line }}
            transition={{ pathLength: { duration: 1.6, ease: [0.65, 0, 0.35, 1] }, d: { duration: 0.8, ease: EASE_OUT } }}
          />
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: play ? 1 : 0 }}
            transition={{ duration: 0.4, delay: play ? 1.5 : 0 }}
          >
            <motion.circle
              r={4.5}
              fill="var(--color-teal)"
              stroke="var(--color-surface)"
              strokeWidth={2}
              initial={{ cx: x(n - 1), cy: y(last) }}
              animate={{ cx: x(n - 1), cy: y(last) }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            />
            <motion.text
              className="fill-ink text-[13px] font-semibold"
              initial={{ attrX: x(n - 1) + 10, attrY: y(last) + 4.5 }}
              animate={{ attrX: x(n - 1) + 10, attrY: y(last) + 4.5 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            >
              {last.toFixed(1)} min
            </motion.text>
          </motion.g>

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--color-ink)" strokeOpacity={0.25} />
              <circle cx={x(hover)} cy={y(values[hover])} r={4.5} fill="var(--color-teal)" stroke="var(--color-surface)" strokeWidth={2} />
            </g>
          )}
          <rect
            x={PAD.left - 10}
            y={PAD.top}
            width={plotW + 20}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] bg-teal-ink px-3 py-2 text-white shadow-lg"
          style={{ left: x(hover), top: y(values[hover]) - 12 }}
        >
          <p className="text-[14px] leading-tight font-semibold whitespace-nowrap">{values[hover].toFixed(1)} min</p>
          <p className="text-[12px] whitespace-nowrap text-white/70">{weekLabel(hover, n)}</p>
        </div>
      )}
    </div>
  );
}

/** Emphasis form: the busiest hour in teal, the rest gray. Each column is its own hover target. */
function HourBars({ values, peak, play }: { values: number[]; peak: number; play: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="relative grid h-[132px] grid-cols-12 gap-[2px] border-b border-line" onPointerLeave={() => setHover(null)}>
        {values.map((v, i) => (
          <div key={i} className="relative flex h-full items-end justify-center" onPointerEnter={() => setHover(i)}>
            <motion.div
              className="relative w-full max-w-[18px] rounded-t-[4px]"
              initial={{ height: "0%" }}
              animate={{
                height: play ? `${(v / HOUR_MAX) * 100}%` : "0%",
                backgroundColor: i === peak ? "#0e7c7b" : BAR_GRAY,
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
              transition={{
                height: { duration: 0.9, delay: play ? 0.3 + i * 0.045 : 0, ease: EASE_OUT },
                backgroundColor: { duration: 0.4 },
                opacity: { duration: 0.2 },
              }}
            >
              {i === peak && v > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[12px] font-semibold text-ink">{v}</span>
              )}
            </motion.div>
            {hover === i && (
              <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 rounded-[10px] bg-teal-ink px-2.5 py-1.5 text-center text-white shadow-lg">
                <p className="text-[13px] leading-tight font-semibold whitespace-nowrap">
                  {v} {v === 1 ? "patient" : "patients"}
                </p>
                <p className="text-[11px] whitespace-nowrap text-white/70">{hourLabel(i)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-12 gap-[2px]">
        {values.map((_, i) => (
          <span key={i} className="text-center text-[11px] whitespace-nowrap text-muted">
            {i % 3 === 0 ? hourLabel(i) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Two bars on one baseline, values at the tips. */
function VisitBars({ visits, play }: { visits: Doctor["visits"]; play: boolean }) {
  const rows = [
    { label: "New patient", value: visits.newCase },
    { label: "Follow-up", value: visits.followUp },
  ];
  return (
    <div className="flex flex-col gap-5 pt-2">
      {rows.map((r, i) => (
        <div key={r.label}>
          <p className="mb-2 text-[13px] text-muted">{r.label}</p>
          <div className="flex items-center gap-2.5">
            <motion.div
              className="h-[14px] rounded-r-[4px] bg-teal"
              initial={{ width: "0%" }}
              animate={{ width: play ? `${(r.value / VISIT_MAX) * 78}%` : "0%" }}
              transition={{ duration: 1, delay: play ? 0.6 + i * 0.15 : 0, ease: EASE_OUT }}
            />
            <span className="text-[14px] font-semibold whitespace-nowrap text-ink tabular-nums">{r.value.toFixed(1)} min</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The same numbers as tables, for screen readers (the charts above are hidden from them). */
function DataTables({ doctor }: { doctor: Doctor }) {
  return (
    <div className="sr-only">
      <table>
        <caption>Example: {doctor.name}, average consult by week</caption>
        <tbody>
          {doctor.weekly.map((v, i) => (
            <tr key={i}>
              <th scope="row">{weekLabel(i, doctor.weekly.length)}</th>
              <td>{v.toFixed(1)} min</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Example: {doctor.name}, average patients by hour</caption>
        <tbody>
          {doctor.hourly.map((v, i) => (
            <tr key={i}>
              <th scope="row">{hourLabel(i)}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Example: {doctor.name}, average consult by visit type</caption>
        <tbody>
          <tr>
            <th scope="row">New patient</th>
            <td>{doctor.visits.newCase.toFixed(1)} min</td>
          </tr>
          <tr>
            <th scope="row">Follow-up</th>
            <td>{doctor.visits.followUp.toFixed(1)} min</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
