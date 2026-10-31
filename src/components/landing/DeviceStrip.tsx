import { DeviceMobileIcon, DeviceTabletIcon, LaptopIcon, PrinterIcon, TelevisionIcon } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "./Reveal";
import { Container } from "./shared";

const DEVICES: { icon: Icon; name: string; role: string }[] = [
  { icon: DeviceMobileIcon, name: "Phone", role: "Desk or doctor's room" },
  { icon: DeviceTabletIcon, name: "Tablet", role: "Reception desk" },
  { icon: LaptopIcon, name: "Laptop", role: "Desk, or the TV over HDMI" },
  { icon: TelevisionIcon, name: "Any TV with a browser", role: "Waiting-room display" },
  { icon: PrinterIcon, name: "Thermal printer", role: "Optional, for paper tokens" },
];

/** Directly under the hero: the cost story starts with "you already own the hardware". */
export function DeviceStrip() {
  return (
    <section aria-labelledby="devices-title" className="border-y border-line bg-surface">
      <Container className="flex flex-col gap-8 py-10 lg:flex-row lg:items-center lg:gap-12">
        <h2 id="devices-title" className="max-w-[17ch] font-display text-[22px] leading-tight font-bold text-ink">
          Runs on what your clinic already has
        </h2>
        <ul className="grid flex-1 grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {DEVICES.map((d, i) => (
            <li key={d.name}>
              <Reveal delay={i * 0.07} y={16} className="flex flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-teal-tint text-teal-dark">
                  <d.icon size={22} weight="bold" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] leading-snug font-semibold text-ink">{d.name}</span>
                  <span className="text-[14px] leading-snug text-muted">{d.role}</span>
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
