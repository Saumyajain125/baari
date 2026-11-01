"use client";

import type { RefObject } from "react";
import { PlusIcon, SearchIcon, TvIcon } from "@/components/icons";
import { LogoMark } from "@/components/brand/Logo";
import { SettingsMenu } from "@/components/reception/tablet/SettingsMenu";
import type { ClinicHeaderView } from "@/lib/view";
import { Kbd } from "./Kbd";
import { WALK_IN_KEY } from "./useLaptopShortcuts";

export interface LaptopHeaderProps {
  header: ClinicHeaderView;
  query: string;
  onQueryChange(query: string): void;
  searchRef: RefObject<HTMLInputElement | null>;
  onAddWalkIn(): void;
  onOpenTv(): void;
  onLock(): void;
  onPrintPoster(): void;
  onOpenSettings(): void;
  onOpenInsights(): void;
}

/**
 * 68px bar: identity, inline day stats, the find box, "Add walk-in [W]", then
 * the TV and settings buttons. Artboard 05 omits the last two, but without
 * them a laptop desk can't open the TV display, print the poster or lock.
 */
export function LaptopHeader({
  header,
  query,
  onQueryChange,
  searchRef,
  onAddWalkIn,
  onOpenTv,
  onLock,
  onPrintPoster,
  onOpenSettings,
  onOpenInsights,
}: LaptopHeaderProps) {
  const { stats } = header;

  return (
    <header className="flex h-[69px] flex-none items-center gap-5 border-b border-line bg-surface px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <LogoMark size={30} />
        {/* Below 1366px the day tucks under the name. From 1366px up the wrapper
            dissolves so name and day sit in the identity row itself, as drawn. */}
        <div className="flex min-w-0 flex-col items-start min-[1366px]:contents">
          <h1 className="m-0 max-w-full truncate font-display text-[18px] font-bold leading-[1.2] min-[1366px]:leading-[normal]">
            {header.clinicName}
          </h1>
          <span className="flex-none text-[13px] text-muted">
            {`${header.dateLabel} · ${header.session}`}
          </span>
        </div>
      </div>

      <dl className="m-0 flex min-w-0 flex-1 justify-center gap-6 text-[14px] whitespace-nowrap max-[1365px]:gap-4">
        <Stat label="In queue" value={String(stats.inQueue)} />
        <Stat label="Served" value={String(stats.served)} />
        <Stat
          label="Avg consult"
          value={stats.avgConsult}
          suffix={stats.avgConsultIsDefault ? "default" : undefined}
        />
        {stats.avgWait != null && <Stat label="Avg wait" value={stats.avgWait} />}
      </dl>

      <label className="flex h-11 w-[240px] flex-none items-center gap-2 rounded-[12px] border border-line px-3 focus-within:border-2 focus-within:border-teal focus-within:px-[11px]">
        <SearchIcon size={18} className="flex-none text-muted" />
        <input
          ref={searchRef}
          type="search"
          aria-label="Find patient"
          aria-keyshortcuts="/"
          placeholder="Find token, name or phone"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            if (query) onQueryChange("");
            else e.currentTarget.blur();
          }}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-0.5 text-[14px] text-ink placeholder:text-[#757575] focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
      </label>

      <button
        type="button"
        onClick={onAddWalkIn}
        aria-keyshortcuts={WALK_IN_KEY}
        className="flex h-11 flex-none items-center gap-2 rounded-[12px] bg-teal px-4 text-[14px] font-semibold text-white hover:bg-teal-dark"
      >
        <PlusIcon size={18} />
        Add walk-in
        <Kbd>{WALK_IN_KEY}</Kbd>
      </button>

      <div className="-ml-2 flex flex-none items-center gap-2">
        <button
          type="button"
          aria-label="Open TV display"
          onClick={onOpenTv}
          className="flex size-11 items-center justify-center rounded-[12px] border border-line bg-surface text-ink hover:bg-hover"
        >
          <TvIcon size={20} />
        </button>
        <SettingsMenu
          compact
          onLock={onLock}
          onPrintPoster={onPrintPoster}
          onOpenSettings={onOpenSettings}
          onOpenInsights={onOpenInsights}
        />
      </div>
    </header>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <dt className="inline text-muted">{label}</dt>{" "}
      <dd className="m-0 inline font-bold">
        {value}
        {suffix && <span className="ml-1 text-[12px] font-normal text-muted">{suffix}</span>}
      </dd>
    </div>
  );
}
