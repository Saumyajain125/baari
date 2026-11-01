"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cx } from "@/components/public/ui";

/**
 * Small, dependency-free charts for the insights screen, drawn in real pixels
 * so their text never scales. One series each, so no legends: the card title
 * names the measure. Hover (or tap) shows the exact figure; the screen also
 * renders every series as a table for screen readers.
 */

/** Bars the story isn't about. Paired with teal it passed the dataviz palette check (CVD ΔE 10+). */
export const BAR_GRAY = "#8f9998";

/** Tracks an element's content width. */
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

/** False for the first paint, then true, so bars can grow in from the baseline once. */
export function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return grown;
}

/** Where a tooltip sits against its anchor, so the ones at the edges stay inside the card. */
type Align = "start" | "center" | "end";

function alignFor(fraction: number): Align {
  return fraction < 0.2 ? "start" : fraction > 0.8 ? "end" : "center";
}

function Tip({ title, sub, align }: { title: string; sub: string; align: Align }) {
  return (
    <div
      className={cx(
        "pointer-events-none absolute bottom-full z-10 mb-2 rounded-[10px] bg-ink px-3 py-2 text-white shadow-[0_8px_24px_rgba(20,33,33,0.22)]",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
      )}
    >
      <p className="text-[14px] leading-tight font-semibold whitespace-nowrap tabular-nums">{title}</p>
      <p className="mt-0.5 text-[12px] whitespace-nowrap text-white/70">{sub}</p>
    </div>
  );
}

// ------------------------------------------------------------------ line

export interface LinePoint {
  key: string;
  /** Null leaves the point out (no data that day); the line joins its neighbours. */
  value: number | null;
  /** Second line of the tooltip, e.g. "Thu, 29 Oct · 24 timed". */
  sub: string;
}

/** Round, readable gridlines around the data: about three of them. */
function niceScale(values: number[]): { min: number; max: number; ticks: number[] } {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const raw = (hi - lo) / 2;
  const step = [0.5, 1, 2, 5, 10, 20, 50].find((s) => s >= raw) ?? 100;
  const min = Math.max(0, Math.floor(lo / step) * step);
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 10) / 10);
  return { min, max: max === min ? min + step : max, ticks };
}

const LINE_H = 200;
const PAD = { top: 14, right: 70, bottom: 30, left: 36 };

/** One line, its latest value labelled at the end. A crosshair snaps to the nearest point on hover. */
export function LineChart({
  points,
  startLabel,
  endLabel,
  format,
}: {
  points: LinePoint[];
  startLabel: string;
  endLabel: string;
  format(v: number): string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const known = points.flatMap((p, i) => (p.value == null ? [] : [{ i, v: p.value }]));
  if (!known.length) return null;

  const n = points.length;
  const { min, max, ticks } = niceScale(known.map((k) => k.v));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = LINE_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => PAD.top + plotH * (1 - (v - min) / (max - min));
  const d = known.map((k, j) => `${j ? "L" : "M"}${x(k.i).toFixed(1)},${y(k.v).toFixed(1)}`).join(" ");
  const last = known[known.length - 1];
  // Replays the draw when the numbers change, not when the card is resized.
  const dataKey = known.map((k) => `${k.i}:${k.v}`).join(",");

  function onMove(e: PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const at = ((e.clientX - r.left) / r.width) * (n - 1);
    let best = known[0];
    for (const k of known) if (Math.abs(k.i - at) < Math.abs(best.i - at)) best = k;
    setHover(best.i);
  }

  const hovered = hover != null ? points[hover] : null;

  return (
    <div ref={ref} className="relative" style={{ height: LINE_H }}>
      {width > 0 && (
        <svg width={width} height={LINE_H} aria-hidden="true" className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-divider)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[12px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
          <text x={x(0)} y={LINE_H - 8} className="fill-muted text-[12px]">
            {startLabel}
          </text>
          <text x={x(n - 1)} y={LINE_H - 8} textAnchor="end" className="fill-muted text-[12px]">
            {endLabel}
          </text>

          {known.length > 1 && (
            <path
              key={dataKey}
              d={d}
              pathLength={1}
              fill="none"
              stroke="var(--color-teal)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="insights-draw"
            />
          )}
          <circle cx={x(last.i)} cy={y(last.v)} r={4.5} fill="var(--color-teal)" stroke="var(--color-surface)" strokeWidth={2} />
          <text x={x(last.i) + 10} y={y(last.v) + 4.5} className="fill-ink text-[13px] font-semibold tabular-nums">
            {format(last.v)}
          </text>

          {hovered?.value != null && (
            <g pointerEvents="none">
              <line
                x1={x(hover!)}
                x2={x(hover!)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--color-ink)"
                strokeOpacity={0.25}
              />
              <circle
                cx={x(hover!)}
                cy={y(hovered.value)}
                r={4.5}
                fill="var(--color-teal)"
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
            </g>
          )}
          <rect
            x={PAD.left - 10}
            y={PAD.top}
            width={plotW + 20}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          />
        </svg>
      )}
      {hovered?.value != null && width > 0 && (
        <div className="pointer-events-none absolute" style={{ left: x(hover!), top: y(hovered.value) - 6 }}>
          <Tip title={format(hovered.value)} sub={hovered.sub} align={alignFor(hover! / Math.max(1, n - 1))} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ columns

export interface Column {
  key: string;
  value: number;
  tip: string;
  sub: string;
  /** Text under the column; leave empty to skip. */
  axis?: string;
}

/**
 * Vertical bars on one baseline with a 2px gap between them. `emphasis` picks
 * the one bar that carries the story: it's labelled with its value, and with
 * `tone="emphasis"` it's the only teal bar among gray ones.
 */
export function ColumnChart({
  columns,
  emphasis,
  tone,
  format,
  height = 150,
}: {
  columns: Column[];
  emphasis: number | null;
  tone: "single" | "emphasis";
  format(v: number): string;
  height?: number;
}) {
  const grown = useGrown();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1e-9, ...columns.map((c) => c.value));
  const n = columns.length;

  return (
    <div>
      <div
        className="relative grid gap-[2px] border-b border-line"
        style={{ height, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
      >
        {columns.map((c, i) => {
          const teal = tone === "single" || i === emphasis;
          return (
            <div
              key={c.key}
              className="relative flex h-full items-end justify-center"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            >
              <div
                className="relative w-full max-w-[22px] rounded-t-[4px] transition-[height,opacity] duration-700 ease-out motion-reduce:transition-none"
                style={{
                  height: grown ? `${(c.value / max) * 86}%` : "0%",
                  minHeight: c.value > 0 ? 2 : 0,
                  backgroundColor: teal ? "var(--color-teal)" : BAR_GRAY,
                  opacity: hover === null || hover === i ? 1 : 0.55,
                }}
              >
                {i === emphasis && c.value > 0 && (
                  <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[12px] font-semibold whitespace-nowrap text-ink tabular-nums">
                    {format(c.value)}
                  </span>
                )}
              </div>
              {hover === i && (
                <div className="pointer-events-none absolute top-0 left-1/2">
                  <Tip title={c.tip} sub={c.sub} align={alignFor(n === 1 ? 0.5 : i / (n - 1))} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid h-4 gap-[2px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {columns.map((c, i) => (
          <span key={c.key} className="relative">
            {c.axis && (
              <span
                className={cx(
                  "absolute top-0 text-[11px] whitespace-nowrap text-muted",
                  n > 1 && i === 0 ? "left-0" : n > 1 && i === n - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                )}
              >
                {c.axis}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
