import { CostCompare } from "./CostCompare";
import { DeskShowcase } from "./DeskShowcase";
import { DeviceStrip } from "./DeviceStrip";
import { DoctorBento } from "./DoctorBento";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingMotion } from "./LandingMotion";
import { Nav } from "./Nav";

/**
 * Before this page existed, "/" was the installed staff app's start_url.
 * Home-screen installs made then still open "/", so in standalone mode this
 * sends them straight on to /app before anything paints.
 */
const STANDALONE_REDIRECT = `if(window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true){location.replace("/app")}`;

/** The public landing page at "/", for doctors and clinic owners deciding whether to use baari. */
export function LandingPage() {
  return (
    <LandingMotion>
      <script dangerouslySetInnerHTML={{ __html: STANDALONE_REDIRECT }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[14px] focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <DeviceStrip />
        <DoctorBento />
        <HowItWorks />
        <CostCompare />
        <DeskShowcase />
        <Faq />
      </main>
      <FinalCta />
    </LandingMotion>
  );
}
