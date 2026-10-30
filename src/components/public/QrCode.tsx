import { create } from "qrcode";

/** Run-length SVG path of the dark modules, one rect-run per row segment. */
function modulesPath(value: string): { d: string; size: number } {
  const { modules } = create(value, { errorCorrectionLevel: "M" });
  const size = modules.size;
  let d = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && modules.get(y, x)) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return { d, size };
}

export interface QrCodeProps {
  /** Text to encode, usually the absolute join URL. */
  value: string;
  /** Rendered width/height; any CSS length. */
  size: number | string;
  /** Accessible name, e.g. "QR code to join the queue". */
  label: string;
  /** Quiet zone in modules. Scanners want light space around the code. */
  margin?: number;
  className?: string;
}

/**
 * Crisp, print-safe QR code as inline SVG (black on white, so it scans off a
 * TV across the room and prints on any printer).
 */
export function QrCode({ value, size, label, margin = 2, className }: QrCodeProps) {
  const { d, size: n } = modulesPath(value);
  const box = n + margin * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-margin} ${-margin} ${box} ${box}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={-margin} y={-margin} width={box} height={box} className="fill-surface" />
      <path d={d} className="fill-ink" />
    </svg>
  );
}
