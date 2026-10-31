"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { LogoMark } from "@/components/brand/Logo";
import { OPEN_APP_HREF, PrimaryCta } from "./shared";

const LINKS = [
  { href: "#doctors", label: "For doctors" },
  { href: "#how", label: "How it works" },
  { href: "#cost", label: "Cost" },
  { href: "#faq", label: "FAQ" },
];

/** Sticky top bar; its hairline and frosted backdrop fade in once the page scrolls. */
export function Nav() {
  const { scrollY } = useScroll();
  const chrome = useTransform(scrollY, [0, 48], [0, 1]);

  return (
    <header className="sticky top-0 z-40">
      <motion.div
        aria-hidden="true"
        style={{ opacity: chrome }}
        className="absolute inset-0 border-b border-line bg-canvas/85 backdrop-blur-md"
      />
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex items-center gap-2 text-ink hover:text-ink" aria-label="baari home">
          <LogoMark size={30} />
          <span className="font-display text-[24px] leading-none font-bold text-teal">baari</span>
        </Link>
        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3 py-2 text-[15px] font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href={OPEN_APP_HREF}
            className="rounded-full px-3 py-2 text-[15px] font-semibold text-ink transition-colors hover:bg-hover hover:text-ink"
          >
            Sign in
          </Link>
          <span className="hidden sm:block">
            <PrimaryCta size="sm" />
          </span>
        </div>
      </nav>
    </header>
  );
}
