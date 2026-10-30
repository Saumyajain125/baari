/**
 * The baari mark: a token-slip silhouette with three dots that grow toward
 * "your turn". Variants match the three uses in the design file, plus a
 * black one for the thermal-printed token slip.
 */
export const SLIP =
  "M30,16 H98 A22,22 0 0 1 120,38 V52 A12,12 0 0 0 120,76 V90 A22,22 0 0 1 98,112 H30 A22,22 0 0 1 8,90 V76 A12,12 0 0 0 8,52 V38 A22,22 0 0 1 30,16 Z";

/** The three dots on the slip: [cx, cy, r] in the 128 × 128 viewBox. */
export const DOTS: readonly [number, number, number][] = [
  [38, 64, 6],
  [60, 64, 6],
  [88, 64, 13],
];

/** Brand teal; the same value as --color-teal. */
export const BRAND_TEAL = "#0E7C7B";

type Variant = "brand" | "inverse" | "empty" | "print";

const COLORS: Record<Variant, { slip: string; dots: [string, string, string]; opacity: [number, number, number] }> = {
  // Teal slip on light surfaces (headers).
  brand: { slip: BRAND_TEAL, dots: ["#FFFFFF", "#FFFFFF", "#FFFFFF"], opacity: [0.45, 0.72, 1] },
  // White slip on teal (PIN lock panel).
  inverse: { slip: "#FFFFFF", dots: [BRAND_TEAL, BRAND_TEAL, BRAND_TEAL], opacity: [0.45, 0.72, 1] },
  // Pale illustration for empty states.
  empty: { slip: "#E6F2F1", dots: ["#B9D9D7", "#B9D9D7", "#B9D9D7"], opacity: [1, 1, 1] },
  // Solid black with knocked-out dots: thermal printers have no grey.
  print: { slip: "#000000", dots: ["#FFFFFF", "#FFFFFF", "#FFFFFF"], opacity: [1, 1, 1] },
};

export function LogoMark({ size = 32, variant = "brand" }: { size?: number; variant?: Variant }) {
  const c = COLORS[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <path d={SLIP} fill={c.slip} />
      {DOTS.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={c.dots[i]} fillOpacity={c.opacity[i]} />
      ))}
    </svg>
  );
}
