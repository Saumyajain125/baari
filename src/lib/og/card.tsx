import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_TEAL, DOTS, SLIP } from "@/components/brand/Logo";

/**
 * Link-preview images (Open Graph, 1200 × 630), drawn with next/og. Styles
 * are inline objects because Satori renders them, not the browser; colours
 * repeat the design tokens in globals.css.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#142121";
const MUTED = "#5B6B6A";
const CANVAS = "#F4F6F5";
const DOT_OPACITY = [0.45, 0.72, 1];

type Weight = 500 | 600 | 700 | 800;

let fonts: Promise<{ name: string; data: Buffer; weight: Weight; style: "normal" }[]> | null = null;

/** Baloo 2 also covers Devanagari, so Hindi clinic names render too. */
function loadFonts() {
  if (fonts) return fonts;
  // next.config.ts (outputFileTracingIncludes) ships these files with the deployment.
  const files: [() => Promise<Buffer>, string, Weight][] = [
    [() => readFile(join(process.cwd(), "src/lib/og/fonts/Baloo2-ExtraBold.ttf")), "Baloo 2", 800],
    [() => readFile(join(process.cwd(), "src/lib/og/fonts/Baloo2-Bold.ttf")), "Baloo 2", 700],
    [() => readFile(join(process.cwd(), "src/lib/og/fonts/Inter-SemiBold.ttf")), "Inter", 600],
    [() => readFile(join(process.cwd(), "src/lib/og/fonts/Inter-Medium.ttf")), "Inter", 500],
  ];
  fonts = Promise.all(
    files.map(async ([read, name, weight]) => ({ name, data: await read(), weight, style: "normal" as const })),
  ).catch((err: unknown) => {
    fonts = null;
    throw err;
  });
  return fonts;
}

function Lockup() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <svg width={56} height={56} viewBox="0 0 128 128">
        <path d={SLIP} fill={BRAND_TEAL} />
        {DOTS.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#FFFFFF" fillOpacity={DOT_OPACITY[i]} />
        ))}
      </svg>
      <div style={{ fontFamily: "Baloo 2", fontWeight: 800, fontSize: 46, lineHeight: 1, color: BRAND_TEAL }}>baari</div>
    </div>
  );
}

/** The white slip from the logo, large; shows a token label in place of the dots when given one. */
function SlipArt({ label }: { label?: string }) {
  const width = 400;
  const height = Math.round((width * 96) / 112);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width, height }}>
      <svg width={width} height={height} viewBox="8 16 112 96" style={{ position: "absolute", top: 0, left: 0 }}>
        <path d={SLIP} fill="#FFFFFF" />
        {!label &&
          DOTS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={BRAND_TEAL} fillOpacity={DOT_OPACITY[i]} />
          ))}
      </svg>
      {label && (
        <div
          style={{
            display: "flex",
            fontFamily: "Baloo 2",
            fontWeight: 800,
            fontSize: label.length > 4 ? 100 : 120,
            lineHeight: 1,
            color: BRAND_TEAL,
            paddingTop: 12,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export interface OgCardProps {
  /** Small uppercase line above the title. */
  eyebrow?: string;
  title: string;
  /** Teal line under the title, e.g. the doctor's name. */
  accent?: string | null;
  body: string;
  /** Token label drawn on the slip, e.g. "A-25". */
  label?: string;
}

function OgCard({ eyebrow, title, accent, body, label }: OgCardProps) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: CANVAS, color: INK, fontFamily: "Inter" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 680,
          padding: "56px 48px 60px 72px",
        }}
      >
        <Lockup />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow && (
            <div
              style={{ fontSize: 24, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              display: "block",
              fontFamily: "Baloo 2",
              fontWeight: 800,
              // Clinic names run up to 60 characters; keep them to three lines.
              fontSize: title.length > 40 ? 48 : title.length > 22 ? 58 : 68,
              lineHeight: 1.08,
              lineClamp: 3,
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
          {accent && (
            <div
              style={{
                display: "block",
                fontFamily: "Baloo 2",
                fontWeight: 700,
                fontSize: accent.length > 32 ? 34 : 40,
                lineHeight: 1.15,
                color: BRAND_TEAL,
                marginTop: 8,
                lineClamp: 2,
                wordBreak: "break-word",
              }}
            >
              {accent}
            </div>
          )}
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.4, color: MUTED }}>{body}</div>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", background: BRAND_TEAL }}>
        <SlipArt label={label} />
      </div>
    </div>
  );
}

/*
 * next/og marks every image immutable for a year, and an og:image URL only
 * changes when its opengraph-image file does. Cards drawn from clinic data
 * use these instead, so a rename shows up and a failed read isn't kept.
 */

/** A card drawn from clinic data: as fresh as the reads in publicDocs.ts. */
export const OG_CACHE_LIVE = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

/** The generic card shown when the data couldn't be read: never stored. */
export const OG_CACHE_FALLBACK = "no-store";

/** Renders a card; `cacheControl` replaces next/og's year-long immutable default. */
export async function renderOgCard(props: OgCardProps, cacheControl?: string): Promise<ImageResponse> {
  return new ImageResponse(<OgCard {...props} />, {
    ...OG_SIZE,
    fonts: await loadFonts(),
    headers: cacheControl ? { "cache-control": cacheControl } : undefined,
  });
}
