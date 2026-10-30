import type { SVGProps } from "react";

/**
 * Icon set traced from the design file. Every icon draws on a 24×24 grid with
 * currentColor, so set colour with text-* utilities and size with `size`.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function strokeIcon(paths: React.ReactNode, strokeWidth = 2, join = true) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin={join ? "round" : undefined}
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

function fillIcon(paths: React.ReactNode) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
        {paths}
      </svg>
    );
  };
}

export const PlusIcon = strokeIcon(<path d="M12 5v14M5 12h14" />, 2.2, false);
export const CloseIcon = strokeIcon(<path d="M6 6l12 12M18 6L6 18" />, 2.2, false);
export const CheckIcon = strokeIcon(<path d="M5 12l5 5 9-10" />, 2.4);
export const ArrowRightIcon = strokeIcon(<path d="M5 12h14M13 6l6 6-6 6" />, 2.6);
export const ArrowDownIcon = strokeIcon(<path d="M12 5v14M6 13l6 6 6-6" />);
export const PriorityIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </>,
  2,
  false,
);
export const SkipIcon = strokeIcon(
  <>
    <path d="M5 5l10 7-10 7z" />
    <path d="M19 5v14" />
  </>,
);
export const NoShowIcon = strokeIcon(
  <>
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21c0-4 3-6 7-6" />
    <path d="M16 15l5 5M21 15l-5 5" />
  </>,
  2,
  false,
);
export const BellIcon = strokeIcon(
  <>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 21h4" />
  </>,
);
export const ClockIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
  2.2,
  false,
);
export const TvIcon = strokeIcon(
  <>
    <rect x="2" y="5" width="20" height="13" rx="2" />
    <path d="M8 21h8" />
  </>,
);
export const SettingsIcon = strokeIcon(
  <>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </>,
);
export const QrIcon = strokeIcon(
  <>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <path d="M14 14h3v3M21 14v7h-4M14 21v-3" />
  </>,
);
export const PrinterIcon = strokeIcon(
  <>
    <path d="M6 9V3h12v6" />
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <path d="M6 14h12v7H6z" />
  </>,
);
export const SearchIcon = strokeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </>,
  2,
  false,
);
export const WifiOffIcon = strokeIcon(
  <>
    <path d="M2 2l20 20" />
    <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-2.5-1.8M12 20h.01" />
  </>,
);
export const BackspaceIcon = strokeIcon(
  <>
    <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
    <path d="M12 9l5 6M17 9l-5 6" />
  </>,
);
export const PauseIcon = fillIcon(
  <>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </>,
);
export const PlayIcon = fillIcon(<path d="M7 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 7 5.5z" />);
export const MoreIcon = fillIcon(
  <>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </>,
);
/** Not in the design: used for "Edit name" in overflow menus. */
export const EditIcon = strokeIcon(
  <>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </>,
);
/** Not in the design: used for "Not here" (called patient didn't come in). */
export const UndoIcon = strokeIcon(
  <>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </>,
);
