import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { cx, primaryButtonClass } from "@/components/public/ui";

/*
 * Landing page building blocks. Shape system for the whole page:
 * buttons 14px (as in the app), cards 28px, chips and tags full pill.
 */

/** Where a new clinic starts: the sign-in screen has "Create account". */
export const SIGN_UP_HREF = "/login";
/** Staff who already have an account: the account router picks login, setup or the desk. */
export const OPEN_APP_HREF = "/app";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

const CTA_SIZES = {
  sm: "h-10 px-4 text-[15px]",
  md: "h-12 px-5 text-[16px]",
  lg: "h-14 px-7 text-[17px]",
};

/** The one "sign up" call to action, used with the same label everywhere on the page. */
export function PrimaryCta({ className, size = "md" }: { className?: string; size?: keyof typeof CTA_SIZES }) {
  return (
    <Link
      href={SIGN_UP_HREF}
      className={cx(
        primaryButtonClass,
        "group gap-2 rounded-[14px] font-semibold whitespace-nowrap text-white hover:bg-[#0c6e6d] hover:text-white",
        CTA_SIZES[size],
        className,
      )}
    >
      Set up your clinic
      <ArrowRightIcon
        size={size === "lg" ? 20 : 18}
        weight="bold"
        className="transition-transform duration-300 ease-out group-hover:translate-x-1"
      />
    </Link>
  );
}

export function SecondaryCta({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cx(
        "flex h-12 items-center justify-center rounded-[14px] border border-line-strong bg-surface px-5 text-[16px] font-semibold whitespace-nowrap text-ink transition-colors hover:border-teal hover:bg-teal-tint hover:text-teal-dark active:translate-y-px",
        className,
      )}
    >
      {children}
    </a>
  );
}

export { SectionTitle } from "./SectionTitle";

export function SectionLead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("max-w-[60ch] text-[17px] leading-relaxed text-pretty text-muted md:text-[18px]", className)}>{children}</p>;
}
