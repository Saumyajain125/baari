"use client";

import Link from "next/link";
import { useId, useMemo, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ArrowRightIcon, ChartIcon } from "@/components/icons";
import { cx } from "@/components/public/ui";
import {
  CONSULT_MAX_MS,
  CONSULT_MIN_MS,
  formatDateKey,
  formatMinutesShort,
  formatPerDay,
  hourLabel,
  INSIGHTS_RANGES,
  rangeBounds,
  rangeFor,
  summarise,
  summariseByDoctor,
  trendSentence,
  visitSentence,
  type DoctorSummary,
  type InsightsBucket,
  type InsightsRangeKey,
  type InsightsSummary,
  type VisitRow,
} from "@/lib/insights";
import type { Ticket } from "@/lib/types";
import { ColumnChart, LineChart, useGrown, type Column, type LinePoint } from "./charts";

export interface InsightsDoctor {
  id: string;
  name: string;
  prefix: string;
}

export interface InsightsViewProps {
  clinicName: string;
  timezone: string;
  /** Clinic-local "YYYY-MM-DD"; every range ends on it. */
  today: string;
  /** Doctors to choose between, in tab order. */
  doctors: InsightsDoctor[];
  /** Null shows every doctor together. */
  doctorId: string | null;
  rangeKey: InsightsRangeKey;
  /** Public tickets covering at least the selected range. */
  tickets: Ticket[];
  /** "loading": nothing to show yet. "reloading": showing the previous range while the new one arrives. */
  phase: "loading" | "reloading" | "ready";
  /** Small status beside the filters, e.g. "Updating…" or the offline note. */
  syncNote: string | null;
  error: string | null;
  back: { href: string; label: string; shortLabel: string };
  onDoctorChange(doctorId: string | null): void;
  onRangeChange(key: InsightsRangeKey): void;
}

/**
 * /insights: how each doctor's practice runs over days and weeks, from the
 * consult times the desk records on every Next. Presentational: the container
 * (InsightsScreen) or a preview supplies the tickets.
 */
export function InsightsView(props: InsightsViewProps) {
  const { clinicName, timezone, today, doctors, doctorId, rangeKey, tickets, phase, back } = props;
  const range = rangeFor(rangeKey);

  const { summary, perDoctor, from } = useMemo(() => {
    const { from, to } = rangeBounds(today, range);
    const options = { from, to, bucket: range.bucket, timezone };
    const mine = doctorId ? tickets.filter((t) => t.doctorId === doctorId) : tickets;
    return {
      from,
      summary: summarise(mine, options),
      perDoctor:
        doctorId == null && doctors.length > 1
          ? summariseByDoctor(
              tickets,
              doctors.map((d) => d.id),
              options,
            )
          : null,
    };
  }, [tickets, doctorId, doctors, today, range, timezone]);

  const doctor = doctorId ? doctors.find((d) => d.id === doctorId) ?? null : null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center gap-4 border-b border-line bg-surface px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-[10px]">
          <span className="flex-none">
            <LogoMark size={32} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-display text-[17px] leading-[1.1] font-bold">Insights</h1>
            <p className="truncate text-[12px] text-muted">{clinicName}</p>
          </div>
        </div>
        <Link
          href={back.href}
          className="flex h-12 shrink-0 items-center gap-2 rounded-[14px] bg-teal px-[18px] text-[15px] font-semibold text-white no-underline hover:bg-teal-dark hover:text-white"
        >
          <ArrowRightIcon size={18} className="rotate-180" />
          <span className="hidden sm:inline">{back.label}</span>
          <span className="sm:hidden">{back.shortLabel}</span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1080px] min-w-0 flex-col gap-5 px-4 py-5 sm:px-5 sm:py-6">
        <Filters {...props} />

        {props.error ? (
          <Notice title="Couldn't load insights" body={props.error} />
        ) : phase === "loading" ? (
          <Skeleton />
        ) : summary.opdDays === 0 ? (
          <Notice
            title={`Nothing to show for the last ${range.label} yet`}
            body="Insights fill in as reception or the doctor's button presses Next. Every consult is timed, from calling a patient in to the next tap."
            action={
              rangeKey !== "3m" ? (
                <button
                  type="button"
                  onClick={() => props.onRangeChange("3m")}
                  className="h-11 rounded-[12px] border border-line-strong bg-surface px-4 text-[14px] font-semibold text-teal-dark hover:bg-hover"
                >
                  Look at 3 months
                </button>
              ) : null
            }
          />
        ) : (
          <div
            aria-busy={phase === "reloading" || undefined}
            className={cx(
              "flex flex-col gap-5 transition-opacity duration-300",
              phase === "reloading" && "opacity-55",
            )}
          >
            <p className="max-w-[60ch] text-[17px] leading-relaxed text-pretty text-muted">
              <strong className="font-semibold text-ink">{doctor?.name ?? (doctors.length === 1 ? doctors[0].name : "Your doctors")}</strong>{" "}
              saw <strong className="font-semibold text-ink">{summary.seen.toLocaleString("en-IN")}</strong>{" "}
              {summary.seen === 1 ? "patient" : "patients"} on {summary.opdDays} OPD {summary.opdDays === 1 ? "day" : "days"}
              {summary.perDay != null && summary.opdDays > 1 && <>, about {formatPerDay(summary.perDay)} a day</>}, since{" "}
              <span className="whitespace-nowrap">{formatDateKey(from, true)}</span>.
            </p>
            <KpiTiles summary={summary} />
            <ConsultCard summary={summary} rangeLabel={range.label} />
            <div className="grid gap-5 lg:grid-cols-2">
              <SeenCard summary={summary} />
              <HoursCard summary={summary} />
            </div>
            <div className={cx("grid gap-5", perDoctor && perDoctor.length > 1 && "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]")}>
              <VisitCard visits={summary.visits} />
              {perDoctor && perDoctor.length > 1 && (
                <DoctorsCard rows={perDoctor} doctors={doctors} onPick={(id) => props.onDoctorChange(id)} />
              )}
            </div>
            <Method leftOut={summary.leftOut} />
          </div>
        )}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ filters

function Filters({ doctors, doctorId, rangeKey, syncNote, onDoctorChange, onRangeChange }: InsightsViewProps) {
  const options: { id: string | null; label: string; prefix: string | null }[] = [
    ...(doctors.length > 1 ? [{ id: null, label: "All doctors", prefix: null }] : []),
    ...doctors.map((d) => ({ id: d.id, label: d.name, prefix: d.prefix })),
  ];
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {options.length > 1 ? (
        <div
          role="group"
          aria-label="Doctor"
          className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0"
        >
          {options.map((o) => {
            const selected = o.id === doctorId;
            return (
              <button
                key={o.id ?? "all"}
                type="button"
                aria-pressed={selected}
                onClick={() => onDoctorChange(o.id)}
                className={cx(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full border pr-4 text-[15px] font-semibold whitespace-nowrap transition-colors",
                  o.prefix ? "pl-[6px]" : "pl-4",
                  selected ? "border-teal bg-teal text-white" : "border-line bg-surface text-ink hover:bg-hover",
                )}
              >
                {o.prefix && (
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex size-8 items-center justify-center rounded-full font-display text-[15px] font-bold",
                      selected ? "bg-white/20 text-white" : "bg-teal-tint text-teal-dark",
                    )}
                  >
                    {o.prefix}
                  </span>
                )}
                {o.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[15px] font-semibold">{doctors[0]?.name}</p>
      )}

      <div className="flex shrink-0 items-center gap-3">
        <div role="group" aria-label="Period" className="inline-flex rounded-[14px] border border-line bg-surface p-1">
          {INSIGHTS_RANGES.map((r) => {
            const selected = r.key === rangeKey;
            return (
              <button
                key={r.key}
                type="button"
                aria-pressed={selected}
                onClick={() => onRangeChange(r.key)}
                className={cx(
                  "h-9 rounded-[10px] px-3 text-[14px] font-semibold whitespace-nowrap transition-colors sm:px-4",
                  selected ? "bg-ink text-white" : "text-muted hover:text-ink",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {syncNote && (
          <p role="status" className="text-[13px] text-muted">
            {syncNote}
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ tiles

function KpiTiles({ summary: s }: { summary: InsightsSummary }) {
  const rate = s.noShowRate == null ? null : Math.round(s.noShowRate * 100);
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <Kpi label="Patients seen" value={s.seen.toLocaleString("en-IN")}>
        {s.perDay != null && `${formatPerDay(s.perDay)} a day on average`}
      </Kpi>
      <Kpi label="Average consult" value={s.consultMin == null ? null : formatMinutesShort(s.consultMin)}>
        {s.consults ? `From ${s.consults.toLocaleString("en-IN")} timed ${s.consults === 1 ? "consult" : "consults"}` : "No timed consults yet"}
      </Kpi>
      <Kpi label="Average wait" value={s.waitMin == null ? null : formatMinutesShort(s.waitMin)}>
        From token to being called in
      </Kpi>
      <Kpi label="No-shows" value={String(s.noShows)}>
        {rate == null ? "Nobody called yet" : `${rate}% of tokens called`}
      </Kpi>
    </dl>
  );
}

function Kpi({ label, value, children }: { label: string; value: string | null; children: ReactNode }) {
  // "5.8 min": the unit drops to a smaller, muted size beside the number.
  const [num, unit] = value?.endsWith(" min") ? [value.slice(0, -4), "min"] : [value, null];
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[16px] border border-line bg-surface p-4 sm:p-5">
      <dt className="text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="flex items-baseline gap-1 font-display text-[32px] leading-[1.1] font-bold text-ink tabular-nums sm:text-[36px]">
        {num ?? <span className="font-sans text-[20px] font-semibold text-faint">Not yet</span>}
        {unit && <span className="font-sans text-[15px] font-semibold text-muted">{unit}</span>}
      </dd>
      <dd className="text-[13px] leading-snug text-muted">{children}</dd>
    </div>
  );
}

// ------------------------------------------------------------------ cards

function ChartCard({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note: string | null;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cx("flex min-w-0 flex-col rounded-[16px] border border-line bg-surface p-5 sm:p-6", className)}>
      <h2 id={id} className="font-display text-[20px] leading-[1.15] font-bold">
        {title}
      </h2>
      {note && <p className="mt-1 text-[14px] leading-snug text-pretty text-muted">{note}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

const bucketName = (b: InsightsBucket, kind: InsightsSummary["bucket"]) =>
  kind === "day" ? formatDateKey(b.start, true) : `Week of ${formatDateKey(b.start)}`;

function axisEnds(summary: InsightsSummary): [string, string] {
  const first = summary.buckets[0];
  return [formatDateKey(first.start), summary.bucket === "day" ? "Today" : "This week"];
}

function ConsultCard({ summary, rangeLabel }: { summary: InsightsSummary; rangeLabel: string }) {
  const kind = summary.bucket;
  const points: LinePoint[] = summary.buckets.map((b) => ({
    key: b.start,
    value: b.consultMin,
    sub: `${bucketName(b, kind)} · ${b.consults} timed`,
  }));
  const [start, end] = axisEnds(summary);
  const hasLine = points.some((p) => p.value != null);
  return (
    <ChartCard
      title={`Average consult in minutes, by ${kind}`}
      note={
        trendSentence(summary.trendMin, rangeLabel) ??
        (kind === "day" ? "Each point is one day's average." : "Each point is one week's average.")
      }
    >
      {hasLine ? (
        <LineChart points={points} startLabel={start} endLabel={end} format={formatMinutesShort} />
      ) : (
        <p className="text-[15px] text-muted">No timed consults in this period yet.</p>
      )}
      <DataTable
        caption={`Average consult by ${kind}`}
        head={[kind === "day" ? "Day" : "Week", "Average consult", "Timed consults"]}
        rows={summary.buckets.map((b) => [
          bucketName(b, kind),
          b.consultMin == null ? "No data" : formatMinutesShort(b.consultMin),
          String(b.consults),
        ])}
      />
    </ChartCard>
  );
}

function SeenCard({ summary }: { summary: InsightsSummary }) {
  const kind = summary.bucket;
  const [start, end] = axisEnds(summary);
  const n = summary.buckets.length;
  const columns: Column[] = summary.buckets.map((b, i) => ({
    key: b.start,
    value: b.seen,
    tip: `${b.seen} seen`,
    sub: bucketName(b, kind),
    axis: i === 0 ? start : i === n - 1 ? end : undefined,
  }));
  const peak = summary.buckets.reduce((best, b, i) => (b.seen > summary.buckets[best].seen ? i : best), 0);
  const top = summary.buckets[peak];
  return (
    <ChartCard
      title={`Patients seen, by ${kind}`}
      note={top.seen ? `Busiest ${kind}: ${bucketName(top, kind)}, with ${top.seen} seen.` : null}
    >
      <ColumnChart columns={columns} emphasis={top.seen ? peak : null} tone="single" format={String} />
      <DataTable
        caption={`Patients seen by ${kind}`}
        head={[kind === "day" ? "Day" : "Week", "Patients seen"]}
        rows={summary.buckets.map((b) => [bucketName(b, kind), String(b.seen)])}
      />
    </ChartCard>
  );
}

function HoursCard({ summary }: { summary: InsightsSummary }) {
  const slots = summary.hours;
  const every = slots.length > 9 ? 3 : 2;
  const columns: Column[] = slots.map((h, i) => ({
    key: String(h.hour),
    value: h.perDay,
    tip: `${formatPerDay(h.perDay)} tokens taken`,
    sub: `${hourLabel(h.hour)} to ${hourLabel(h.hour + 1)}, average day`,
    axis: i % every === 0 ? hourLabel(h.hour) : undefined,
  }));
  const peakIndex = slots.findIndex((h) => h.hour === summary.peakHour);
  const peak = slots[peakIndex];
  return (
    <ChartCard
      title="When patients join, on an average day"
      note={
        peak
          ? `Busiest from ${hourLabel(peak.hour)} to ${hourLabel(peak.hour + 1)}, with ${formatPerDay(peak.perDay)} tokens taken in that hour.`
          : null
      }
    >
      <ColumnChart columns={columns} emphasis={peakIndex < 0 ? null : peakIndex} tone="emphasis" format={formatPerDay} />
      <DataTable
        caption="Tokens taken by hour, average day"
        head={["Hour", "Tokens on an average day"]}
        rows={slots.map((h) => [`${hourLabel(h.hour)} to ${hourLabel(h.hour + 1)}`, formatPerDay(h.perDay)])}
      />
    </ChartCard>
  );
}

function VisitCard({ visits }: { visits: VisitRow[] }) {
  const max = Math.max(1e-9, ...visits.map((v) => v.consultMin ?? 0));
  const grown = useGrown();
  return (
    <ChartCard title="Consult by visit type" note={visitSentence(visits) ?? "Average consult for each kind of visit."}>
      <ul className="flex max-w-[720px] flex-col gap-5">
        {visits.map((v) => (
          <li key={v.type}>
            <p className="mb-2 flex items-baseline justify-between gap-3 text-[14px]">
              <span className="font-semibold text-ink">{v.label}</span>
              <span className="text-muted tabular-nums">
                {v.seen.toLocaleString("en-IN")} seen
              </span>
            </p>
            <div className="flex items-center gap-2.5">
              {v.consultMin != null ? (
                <>
                  <div
                    className="h-[14px] rounded-r-[4px] bg-teal transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: grown ? `${(v.consultMin / max) * 78}%` : "0%" }}
                  />
                  <span className="text-[14px] font-semibold whitespace-nowrap text-ink tabular-nums">
                    {formatMinutesShort(v.consultMin)}
                  </span>
                </>
              ) : (
                <span className="text-[14px] text-muted">No timed consults</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

function DoctorsCard({
  rows,
  doctors,
  onPick,
}: {
  rows: DoctorSummary[];
  doctors: InsightsDoctor[];
  onPick(doctorId: string): void;
}) {
  const id = useId();
  const byId = new Map(doctors.map((d) => [d.id, d]));
  const cell = "py-3 pr-3 text-right tabular-nums";
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col rounded-[16px] border border-line bg-surface p-5 sm:p-6">
      <h2 id={id} className="font-display text-[20px] leading-[1.15] font-bold">
        Doctors side by side
      </h2>
      <p className="mt-1 text-[14px] leading-snug text-muted">Tap a doctor to see their own charts.</p>
      <table className="mt-5 w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-line text-[12px] text-muted">
            <th scope="col" className="py-2 pr-3 text-left font-semibold">
              Doctor
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Seen
            </th>
            <th scope="col" className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">
              A day
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">
              Consult
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Wait
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ doctorId, summary: s }) => {
            const d = byId.get(doctorId);
            return (
              <tr key={doctorId} className="border-b border-divider last:border-b-0">
                <th scope="row" className="py-1.5 pr-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => onPick(doctorId)}
                    className="-ml-2 flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-left hover:bg-hover"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 flex-none items-center justify-center rounded-full bg-teal-tint font-display text-[14px] font-bold text-teal-dark"
                    >
                      {d?.prefix ?? "?"}
                    </span>
                    <span className="min-w-0">{d?.name ?? "Removed doctor"}</span>
                  </button>
                </th>
                <td className={cell}>{s.seen.toLocaleString("en-IN")}</td>
                <td className={cx(cell, "hidden sm:table-cell")}>{s.perDay == null ? "None" : formatPerDay(s.perDay)}</td>
                <td className={cx(cell, "whitespace-nowrap")}>{s.consultMin == null ? "None" : formatMinutesShort(s.consultMin)}</td>
                <td className="py-3 text-right whitespace-nowrap tabular-nums">
                  {s.waitMin == null ? "None" : formatMinutesShort(s.waitMin)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Method({ leftOut }: { leftOut: number }) {
  const shortest = CONSULT_MIN_MS / 1000;
  const longest = CONSULT_MAX_MS / 60_000;
  return (
    <p className="max-w-[72ch] text-[13px] leading-relaxed text-faint">
      How it&apos;s measured: a consult runs from calling a patient in to the next tap on Next, at the desk or on the doctor&apos;s
      button. A wait runs from taking a token to being called in. Consults under {shortest} seconds or over {longest} minutes are
      left out of averages
      {leftOut > 0 && ` (${leftOut.toLocaleString("en-IN")} in this period)`}. Dates and hours are in clinic time.
    </p>
  );
}

// ------------------------------------------------------------------ states

function Notice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-[16px] border border-line bg-surface px-6 py-14 text-center">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-teal-tint text-teal-dark">
        <ChartIcon size={28} />
      </span>
      <h2 className="font-display text-[22px] leading-[1.15] font-bold">{title}</h2>
      <p className="max-w-[46ch] text-[15px] leading-relaxed text-muted">{body}</p>
      {action}
    </section>
  );
}

function Skeleton() {
  const block = "rounded-[16px] border border-line bg-surface";
  const bar = "rounded-[6px] bg-subtle motion-safe:animate-pulse";
  return (
    <div aria-busy="true" aria-label="Loading insights" className="flex flex-col gap-5">
      <div className={cx(bar, "h-5 w-full max-w-[460px]")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cx(block, "flex flex-col gap-3 p-5")}>
            <div className={cx(bar, "h-3 w-24")} />
            <div className={cx(bar, "h-8 w-20")} />
            <div className={cx(bar, "h-3 w-32")} />
          </div>
        ))}
      </div>
      <div className={cx(block, "flex flex-col gap-4 p-6")}>
        <div className={cx(bar, "h-5 w-64")} />
        <div className={cx(bar, "h-[200px] w-full")} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cx(block, "flex flex-col gap-4 p-6")}>
            <div className={cx(bar, "h-5 w-48")} />
            <div className={cx(bar, "h-[150px] w-full")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The chart's numbers as a table, for screen readers. */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            <th scope="row">{r[0]}</th>
            {r.slice(1).map((c, i) => (
              <td key={i}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
