"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId, useState } from "react";
import { EASE_OUT, Reveal } from "./Reveal";
import { Container, PrimaryCta, SectionLead, SectionTitle } from "./shared";
import { Spotlight } from "./Spotlight";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const PER_PATIENT = 1;
const MONTHLY = 999;
/** Six OPD days a week. Shown next to the calculator so the maths is visible. */
const OPD_DAYS = 26;
/** The most patients a day at which paying per patient still costs less than the monthly plan. */
const SWITCH_AT = Math.floor(MONTHLY / (PER_PATIENT * OPD_DAYS));

const inr = new Intl.NumberFormat("en-IN");

type PlanId = "per-patient" | "monthly";

const PLANS: { id: PlanId; name: string; price: string; unit: string; blurb: string; fit: string }[] = [
  {
    id: "per-patient",
    name: "Pay per patient",
    price: "₹1",
    unit: "per patient",
    blurb: "Pay only for the patients you see. A quiet day costs you less.",
    fit: `Costs less up to ${SWITCH_AT} patients a day`,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "₹999",
    unit: "per month",
    blurb: "One fixed bill every month, however busy your OPD gets.",
    fit: `Costs less from ${SWITCH_AT + 1} patients a day`,
  },
];

const INCLUDED = [
  "Waiting-room TV display",
  "Doctor's Next button",
  "QR poster and phone tokens",
  "Printed token slips",
  "Consult-time insights",
  "Works offline at the desk",
];

/**
 * Two plans and a slider that shows which one is cheaper at your patient
 * count. Moving the slider glides the monthly figures and slides the
 * "Lower cost for you" badge to the winning plan.
 */
export function Pricing() {
  const [perDay, setPerDay] = useState(30);
  const sliderId = useId();
  const badgeId = useId();
  const monthPatients = perDay * OPD_DAYS;
  const costs: Record<PlanId, number> = { "per-patient": monthPatients * PER_PATIENT, monthly: MONTHLY };
  const pick: PlanId = costs["per-patient"] <= costs.monthly ? "per-patient" : "monthly";
  const saving = Math.abs(costs.monthly - costs["per-patient"]);
  const fill = ((perDay - 5) / (200 - 5)) * 100;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 bg-surface py-20 md:py-28">
      <Container>
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <Reveal className="flex flex-col gap-5">
            <SectionTitle id="pricing-title" className="max-w-[16ch]" accent={["per", "patient,"]}>
              Pay per patient, or one flat monthly fee.
            </SectionTitle>
            <SectionLead>Pick the plan that suits your OPD. No machines to buy, nothing to install.</SectionLead>
          </Reveal>

          <Reveal delay={0.1} className="relative isolate overflow-hidden rounded-[28px] bg-teal-ink p-6 text-white sm:p-8">
            <Spotlight tone="dark" />
            <div className="relative">
              <div className="flex items-end justify-between gap-4">
                <label htmlFor={sliderId} className="text-[15px] font-semibold text-white/80">
                  Patients a day
                </label>
                <span className="font-display text-[44px] leading-none font-extrabold text-teal-bright tabular-nums">{perDay}</span>
              </div>
              <input
                id={sliderId}
                type="range"
                min={5}
                max={200}
                step={1}
                value={perDay}
                onChange={(e) => setPerDay(Number(e.target.value))}
                aria-valuetext={`${perDay} patients a day`}
                className="land-range mt-5 w-full"
                style={{ "--fill": `${fill}%` } as React.CSSProperties}
              />
              <p className="mt-4 text-[14px] text-white/65">
                About {inr.format(monthPatients)} patients a month over {OPD_DAYS} OPD days.
              </p>
              <p className="mt-2 text-[17px] leading-snug font-semibold" aria-live="polite">
                {saving === 0 ? (
                  "Both plans cost the same at this count."
                ) : (
                  <>
                    {pick === "per-patient" ? "Pay per patient" : "The monthly plan"} saves you{" "}
                    <span className="text-teal-bright">₹{inr.format(saving)}</span> a month.
                  </>
                )}
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {PLANS.map((plan, i) => {
            const picked = plan.id === pick;
            return (
              <Reveal key={plan.id} delay={0.1 + i * 0.08} className="h-full">
                <motion.article
                  aria-labelledby={`${badgeId}-${plan.id}`}
                  animate={{
                    borderColor: picked ? "#0e7c7b" : "#dce3e2",
                    backgroundColor: picked ? "#f3f9f8" : "#f4f6f5",
                  }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                  className="relative isolate flex h-full flex-col overflow-hidden rounded-[28px] border-2 p-7 md:p-9"
                >
                  <Spotlight />
                  <div className="relative flex min-h-[32px] items-center justify-between gap-3">
                    <h3 id={`${badgeId}-${plan.id}`} className="text-[18px] font-semibold text-ink">
                      {plan.name}
                    </h3>
                    {picked && (
                      <motion.span
                        layoutId={`${badgeId}-badge`}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="rounded-full bg-teal px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-white"
                      >
                        Lower cost for you
                      </motion.span>
                    )}
                  </div>
                  <p className="relative mt-6 flex items-baseline gap-2">
                    <span className="font-display text-[64px] leading-none font-extrabold tracking-[-0.02em] text-ink">
                      {plan.price}
                    </span>
                    <span className="text-[17px] text-muted">{plan.unit}</span>
                  </p>
                  <p className="relative mt-4 max-w-[36ch] text-[16px] leading-relaxed text-muted">{plan.blurb}</p>
                  <p className="relative mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-teal-dark">
                    <CheckIcon size={16} weight="bold" />
                    {plan.fit}
                  </p>
                  <div className="relative mt-7 flex items-baseline justify-between gap-3 border-t border-line pt-5">
                    <span className="text-[14px] text-muted">At {perDay} patients a day</span>
                    <span className="text-[20px] font-semibold text-ink">
                      <Rupees value={costs[plan.id]} />
                      <span className="ml-1 text-[14px] font-normal text-muted">/ month</span>
                    </span>
                  </div>
                  <div className="relative mt-7 pt-1 md:mt-auto">
                    <PrimaryCta className="w-full" />
                  </div>
                </motion.article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1} className="mt-8">
          <p className="text-[14px] font-semibold text-ink">Both plans include</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {INCLUDED.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[14px] text-ink"
              >
                <CheckIcon size={14} weight="bold" className="text-teal" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}

/** A rupee amount that glides to its new value instead of jumping. */
function Rupees({ value }: { value: number }) {
  const reduce = usePrefersReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `₹${inr.format(Math.round(v))}`);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.5, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}
