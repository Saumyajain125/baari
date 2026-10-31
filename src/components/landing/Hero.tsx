import { HeroScene } from "./HeroScene";
import { HeroStage } from "./HeroStage";
import { Magnetic } from "./Magnetic";
import { Container, PrimaryCta, SecondaryCta } from "./shared";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/** Above the fold: the promise to the doctor, the price, and the queue playing out live. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Ambient light: a fine dot grid fading out from the scene, and two soft glows drifting slowly. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgb(14_124_123/0.16)_1px,transparent_1.5px)] [mask-image:radial-gradient(ellipse_60%_55%_at_72%_42%,black,transparent)] bg-[size:24px_24px]" />
        <div
          className="land-drift absolute top-[-10%] right-[-25%] h-[720px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgb(14_124_123/0.16),transparent)] lg:right-[-10%]"
          style={{ "--t": "24s" } as React.CSSProperties}
        />
        <div
          className="land-drift absolute top-[35%] right-[18%] h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(63_184_182/0.14),transparent)]"
          style={{ "--t": "17s" } as React.CSSProperties}
        />
      </div>

      <Container className="relative grid items-center gap-12 pt-8 pb-16 md:pt-14 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-10 lg:pt-6 lg:pb-14">
        <div className="flex flex-col items-start">
          <p className="land-rise text-[13px] font-bold tracking-[0.12em] text-teal-dark uppercase" style={delay(0)}>
            Walk-in token system for clinics
          </p>
          <h1
            id="hero-title"
            className="mt-5 font-display text-[3.1rem] leading-[1.02] font-extrabold tracking-[-0.015em] text-ink sm:text-[4rem] xl:text-[4.6rem]"
          >
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="land-line block" style={delay(60)}>
                No crowd at
              </span>
            </span>
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="land-line block text-teal" style={delay(170)}>
                your door.
              </span>
            </span>
          </h1>
          <p
            className="land-rise mt-6 max-w-[34ch] text-[18px] leading-relaxed text-pretty text-muted md:text-[19px]"
            style={delay(320)}
          >
            Patients get a token on their phone and wait anywhere. Your TV calls them in. No token machine to buy.
          </p>
          <div className="land-rise mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={delay(420)}>
            <Magnetic>
              <PrimaryCta className="w-full sm:w-auto" />
            </Magnetic>
            <SecondaryCta href="#how">See how it works</SecondaryCta>
          </div>
          <p className="land-rise mt-5 text-[15px] text-muted" style={delay(500)}>
            From <span className="font-semibold text-ink">₹1 per patient</span>, or{" "}
            <span className="font-semibold text-ink">₹999 a month</span>.{" "}
            <a href="#pricing" className="font-semibold text-teal-dark underline-offset-4 hover:underline">
              See pricing
            </a>
          </p>
        </div>
        <div className="xl:-mr-16">
          <HeroStage>
            <HeroScene />
          </HeroStage>
        </div>
      </Container>
    </section>
  );
}
