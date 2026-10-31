import { HeroScene } from "./HeroScene";
import { Container, PrimaryCta, SecondaryCta } from "./shared";

/** Above the fold: the promise to the doctor, the cost line, and the queue playing out live. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-[-30%] h-[760px] w-[960px] rounded-full bg-[radial-gradient(closest-side,rgb(14_124_123/0.14),transparent)] lg:right-[-12%]"
      />
      <Container className="relative grid items-center gap-12 pt-8 pb-16 md:pt-14 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-10 lg:pt-6 lg:pb-14">
        <div className="flex flex-col items-start">
          <p
            className="land-rise text-[13px] font-bold tracking-[0.12em] text-teal-dark uppercase"
            style={{ "--d": "0ms" } as React.CSSProperties}
          >
            Walk-in token system for clinics
          </p>
          <h1
            id="hero-title"
            className="land-rise mt-5 font-display text-[3.1rem] leading-[1.02] font-extrabold tracking-[-0.015em] text-balance text-ink sm:text-[4rem] xl:text-[4.6rem]"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            No crowd at <span className="text-teal">your door.</span>
          </h1>
          <p
            className="land-rise mt-6 max-w-[34ch] text-[18px] leading-relaxed text-pretty text-muted md:text-[19px]"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            Patients get a token on their phone and wait anywhere. Your TV calls them in. No token machine to buy.
          </p>
          <div
            className="land-rise mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            <PrimaryCta />
            <SecondaryCta href="#how">See how it works</SecondaryCta>
          </div>
        </div>
        <div className="xl:-mr-16">
          <HeroScene />
        </div>
      </Container>
    </section>
  );
}
