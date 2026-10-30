import { LogoMark } from "@/components/brand/Logo";

export interface ClinicIdentityProps {
  clinicName: string;
  /** "Thu, 29 Oct · Morning session" */
  subtitle: string;
  /** Extra classes for the logo, e.g. to hide it where the header is tight. */
  logoClassName?: string;
}

/** Logo, clinic name and date/session line at the left of the reception header. */
export function ClinicIdentity({ clinicName, subtitle, logoClassName }: ClinicIdentityProps) {
  return (
    <div className="flex min-w-0 items-center gap-[10px]">
      <span className={logoClassName ? `flex-none ${logoClassName}` : "flex-none"}>
        <LogoMark size={32} />
      </span>
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate font-display text-[17px] leading-[1.1] font-bold">{clinicName}</h1>
        <p className="truncate text-[12px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
