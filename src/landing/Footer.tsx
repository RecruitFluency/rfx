import React from 'react';
import { Eyebrow, PrimaryButton, RFXLogo } from './ui';
import { Reveal } from './motion';
import { MacBookFrame, ClubDashboardScreen } from './mockups';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="mx-auto max-w-page px-6">
        <Reveal className="relative overflow-hidden rounded-banner border border-line bg-ink-1 shadow-card">
          <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-crimson-500/20 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cobalt-500/20 blur-[120px]" />
          <div className="relative grid items-center gap-10 p-10 md:grid-cols-[0.9fr_1.1fr] md:p-14">
            <div>
              <Eyebrow>For clubs</Eyebrow>
              <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
                Take your club to new heights
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-paper-1">
                Put every one of your athletes on a professional recruitment pathway — under your
                own badge.
              </p>
              <PrimaryButton className="mt-8">Book a demo</PrimaryButton>
            </div>
            <div className="relative hidden md:block">
              <div className="translate-x-10">
                <MacBookFrame glow="blue" className="origin-left scale-[0.92]">
                  <ClubDashboardScreen />
                </MacBookFrame>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const columns: Array<[string, string[]]> = [
  ['Platform', ['For athletes', 'For coaches', 'For clubs', 'Pricing']],
  ['Company', ['About', 'Careers', 'Press', 'Contact']],
  ['Resources', ['Recruitment guide', 'Help center', 'Blog', 'Community']],
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink-0">
      <div className="mx-auto grid max-w-page gap-12 px-6 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <RFXLogo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper-2">
            The recruitment platform that turns athletic ability into college opportunity.
          </p>
          <p className="mt-6 font-mono text-xs text-paper-3">hello@rfx.team</p>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-paper-3">
              {title}
            </p>
            <ul className="mt-4 space-y-3">
              {links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-paper-2 transition-colors hover:text-paper-0">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-6 py-6">
          <p className="font-mono text-xs text-paper-3">
            © {new Date().getFullYear()} RFX. All rights reserved.
          </p>
          <div className="flex gap-6 font-mono text-xs text-paper-3">
            <a href="#" className="transition-colors hover:text-paper-1">Privacy</a>
            <a href="#" className="transition-colors hover:text-paper-1">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
