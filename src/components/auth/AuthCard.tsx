import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { cx } from "./ui";

export interface AuthCardProps {
  /** Middle of the teal panel on wide screens: headline, subtitle, pill or steps. */
  panel: ReactNode;
  /** Bottom line of the teal panel on wide screens. */
  footnote?: ReactNode;
  /** Right side width on wide screens: 520px as the PIN lock, or 600px for longer forms. */
  width?: "default" | "wide";
  children: ReactNode;
}

/**
 * Account screens share the PIN lock's frame (artboard 06): a teal brand
 * panel on the left and the form on the canvas-grey right side, where the
 * white inputs and toggles sit like the lock's staff cards. Below 1024px the
 * panel collapses to a header strip and the form takes the full width.
 */
export function AuthCard({ panel, footnote, width = "default", children }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink lg:h-dvh lg:flex-row">
      <section className="flex shrink-0 items-center bg-teal px-4 py-4 text-white sm:px-6 lg:min-w-0 lg:flex-1 lg:flex-col lg:items-stretch lg:justify-between lg:overflow-y-auto lg:p-14">
        <div className="flex items-center gap-3">
          <span className="[&>svg]:size-10 lg:[&>svg]:size-11">
            <LogoMark variant="inverse" size={44} />
          </span>
          <span className="font-display text-[26px] leading-none font-extrabold lg:text-[32px]">baari</span>
        </div>
        <div className="hidden flex-col gap-[10px] lg:flex">{panel}</div>
        <div className="hidden text-[14px] opacity-85 lg:block">{footnote}</div>
      </section>

      <main
        className={cx(
          "flex flex-1 flex-col lg:flex-none lg:overflow-y-auto",
          width === "wide" ? "lg:w-[600px]" : "lg:w-[520px]",
        )}
      >
        <div
          className={cx(
            "mx-auto flex w-full flex-col gap-[22px] px-4 pt-6 pb-10 sm:px-14 sm:pt-12 lg:pb-12",
            width === "wide" ? "max-w-[600px]" : "max-w-[520px]",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/** Headline block for the teal panel: 40px Baloo title, 18px subtitle, optional pill. */
export function PanelIntro({ title, subtitle, pill }: { title: ReactNode; subtitle?: ReactNode; pill?: ReactNode }) {
  return (
    <>
      <p className="font-display text-[40px] leading-[1.1] font-bold text-balance">{title}</p>
      {subtitle && <p className="text-[18px] leading-snug text-pretty opacity-90">{subtitle}</p>}
      {pill && (
        <p className="mt-3 self-start rounded-full bg-white/16 px-[14px] py-2 text-[15px] font-semibold">{pill}</p>
      )}
    </>
  );
}

/** The form side's page title, Baloo 700 30px as "Who's at the desk?". */
export function AuthTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h1 id={id} className="font-display text-[26px] leading-[1.15] font-bold sm:text-[30px]">
      {children}
    </h1>
  );
}
