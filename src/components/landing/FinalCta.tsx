import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { Magnetic } from "./Magnetic";
import { Reveal } from "./Reveal";
import { Container, OPEN_APP_HREF, PrimaryCta, SectionTitle } from "./shared";
import { Spotlight } from "./Spotlight";
import { TurnDots } from "./TurnDots";

const FOOTER_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#insights", label: "Insights" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** The close: one ask, then the footer on the same deep-teal ground, signed with a giant wordmark. */
export function FinalCta() {
  return (
    <div className="relative isolate overflow-hidden bg-teal-ink text-white">
      <Spotlight tone="dark" />
      <div
        aria-hidden="true"
        className="land-drift pointer-events-none absolute -top-48 left-1/2 h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(14_124_123/0.45),transparent)]"
      />
      <Container className="relative">
        <section aria-labelledby="start-title">
          <Reveal className="flex flex-col items-center py-24 text-center md:py-32">
            <TurnDots className="h-10 w-auto text-teal-bright" />
            <SectionTitle id="start-title" size="closing" inverse className="mt-8 max-w-[16ch]">
              {"Start tomorrow's OPD on baari."}
            </SectionTitle>
            <p className="mt-5 max-w-[44ch] text-[18px] leading-relaxed text-white/75">
              Create your clinic, add your doctors and print the QR poster tonight.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <Magnetic>
                <PrimaryCta size="lg" />
              </Magnetic>
              <Link href={OPEN_APP_HREF} className="text-[16px] font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">
                Already on baari? Sign in
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className="flex flex-col gap-6 border-t border-white/10 py-10 text-[14px] text-white/60 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={28} variant="inverse" />
            <p>
              <span className="font-display text-[18px] font-bold text-white">baari</span>
              <span className="ml-3">
                <span lang="hi">बारी</span> means &ldquo;your turn&rdquo;.
              </span>
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-white/70 hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href={OPEN_APP_HREF} className="text-white/70 hover:text-white">
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>
          <p>&copy; {new Date().getFullYear()} baari</p>
        </footer>
      </Container>

      {/* The signature: the wordmark, huge and faint, rising into place at the very bottom. */}
      <div aria-hidden="true" className="pointer-events-none relative overflow-hidden select-none">
        <Reveal y={120} amount={0.05}>
          <p className="-mb-[0.22em] text-center font-display text-[30vw] leading-[0.9] font-extrabold tracking-[-0.03em] text-white/[0.05]">
            baari
          </p>
        </Reveal>
      </div>
    </div>
  );
}
