/**
 * The baari mark: a token-slip silhouette with three dots that grow toward
 * "your turn". Variants match the three uses in the design file.
 */
const SLIP =
  "M30,16 H98 A22,22 0 0 1 120,38 V52 A12,12 0 0 0 120,76 V90 A22,22 0 0 1 98,112 H30 A22,22 0 0 1 8,90 V76 A12,12 0 0 0 8,52 V38 A22,22 0 0 1 30,16 Z";

type Variant = "brand" | "inverse" | "empty";

const COLORS: Record<Variant, { slip: string; dots: [string, string, string]; opacity: [number, number, number] }> = {
  // Teal slip on light surfaces (headers).
  brand: { slip: "#0E7C7B", dots: ["#FFFFFF", "#FFFFFF", "#FFFFFF"], opacity: [0.45, 0.72, 1] },
  // White slip on teal (PIN lock panel).
  inverse: { slip: "#FFFFFF", dots: ["#0E7C7B", "#0E7C7B", "#0E7C7B"], opacity: [0.45, 0.72, 1] },
  // Pale illustration for empty states.
  empty: { slip: "#E6F2F1", dots: ["#B9D9D7", "#B9D9D7", "#B9D9D7"], opacity: [1, 1, 1] },
};

export function LogoMark({ size = 32, variant = "brand" }: { size?: number; variant?: Variant }) {
  const c = COLORS[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <path d={SLIP} fill={c.slip} />
      <circle cx="38" cy="64" r="6" fill={c.dots[0]} fillOpacity={c.opacity[0]} />
      <circle cx="60" cy="64" r="6" fill={c.dots[1]} fillOpacity={c.opacity[1]} />
      <circle cx="88" cy="64" r="13" fill={c.dots[2]} fillOpacity={c.opacity[2]} />
    </svg>
  );
}
