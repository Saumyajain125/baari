import { ClinicIdentity } from "@/components/reception/ClinicIdentity";
import { PlusIcon, TvIcon } from "@/components/icons";
import type { ClinicHeaderView, HeaderStatsView } from "@/lib/view";
import { SettingsMenu } from "./SettingsMenu";

export interface TabletHeaderProps {
  header: ClinicHeaderView;
  onAddWalkIn(): void;
  onOpenTv(): void;
  onLock(): void;
  onPrintPoster(): void;
  onOpenSettings(): void;
  onOpenInsights(): void;
}

/** Top bar (72px plus its rule): clinic identity, day stats, Add walk-in, TV and Settings. */
export function TabletHeader({
  header,
  onAddWalkIn,
  onOpenTv,
  onLock,
  onPrintPoster,
  onOpenSettings,
  onOpenInsights,
}: TabletHeaderProps) {
  return (
    <header className="flex h-[73px] flex-none items-center gap-5 border-b border-line bg-surface px-5">
      <ClinicIdentity clinicName={header.clinicName} subtitle={`${header.dateLabel} · ${header.session} session`} />
      <StatTiles stats={header.stats} />
      <button
        type="button"
        onClick={onAddWalkIn}
        className="flex h-12 flex-none items-center gap-2 rounded-[14px] bg-teal px-[18px] text-[15px] font-semibold whitespace-nowrap text-white hover:bg-teal-dark"
      >
        <PlusIcon size={20} />
        Add walk-in
      </button>
      <button
        type="button"
        aria-label="Open TV display"
        onClick={onOpenTv}
        className="flex size-12 flex-none items-center justify-center rounded-[14px] border border-line bg-surface text-ink hover:bg-hover"
      >
        <TvIcon size={22} />
      </button>
      <SettingsMenu
        onLock={onLock}
        onPrintPoster={onPrintPoster}
        onOpenSettings={onOpenSettings}
        onOpenInsights={onOpenInsights}
      />
    </header>
  );
}

/** Below 1024px only the two counts fit next to the buttons; the averages drop out. */
function StatTiles({ stats }: { stats: HeaderStatsView }) {
  return (
    <dl className="flex min-w-0 flex-1 justify-center gap-2 overflow-hidden">
      <StatTile label="In queue">{stats.inQueue}</StatTile>
      <StatTile label="Served today">{stats.served}</StatTile>
      <StatTile label="Avg consult" muted={stats.avgConsultIsDefault} wide>
        {stats.avgConsult}
        {stats.avgConsultIsDefault && <span className="text-[11px] font-medium"> default</span>}
      </StatTile>
      {stats.avgWait != null && (
        <StatTile label="Avg wait" wide>
          {stats.avgWait}
        </StatTile>
      )}
    </dl>
  );
}

function StatTile({
  label,
  muted = false,
  wide = false,
  children,
}: {
  label: string;
  muted?: boolean;
  /** Only shown on screens 1024px and up. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${wide ? "hidden lg:flex" : "flex"} flex-none flex-col rounded-[12px] bg-canvas px-[14px] py-[6px]`}>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={`text-[18px] font-bold whitespace-nowrap ${muted ? "text-muted" : ""}`}>{children}</dd>
    </div>
  );
}
