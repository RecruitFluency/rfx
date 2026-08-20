import React, { useState } from 'react';
import { ChevronDown, Building2, CircleDollarSign, Sparkles } from 'lucide-react';
import { Eyebrow, PrimaryButton, StoreBadges } from './ui';
import { Reveal } from './motion';
import { PhoneFrame, AppShot } from './mockups';

/* -- app download banner ------------------------------------------------- */

export function AppBanner() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-page px-6">
        <Reveal className="relative overflow-hidden rounded-banner bg-gradient-to-br from-crimson-500 via-crimson-700 to-[#1A0407] px-8 py-14 shadow-drop-red md:px-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_85%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-white text-balance md:text-4xl">
                Take your game to new heights
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">
                Your profile, metrics, and coach conversations — in your pocket, on the bus, at the
                gym, wherever the game takes you.
              </p>
              <StoreBadges className="mt-7 [&_a]:border-white/20 [&_a]:bg-black/30 [&_a:hover]:border-white/50" />
            </div>
            <div className="mx-auto hidden -rotate-6 md:block">
              <AppShot
                src="/screens/commit-school.webp"
                alt="RFX app — committing to a school"
                width={240}
                className="!shadow-[0_40px_100px_-10px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -- white-label accordion + club value grid ----------------------------- */

const accordion = [
  {
    title: 'Centralized Recruitment Hub',
    copy: 'Run every athlete in your club through one branded pipeline — profiles, footage, and coach interest in a single view.',
  },
  {
    title: 'Revenue Generation',
    copy: 'Offer premium recruitment tools to your members under your own brand and open a new revenue stream for the club.',
  },
  {
    title: 'Custom Branded Platform',
    copy: 'Your colors, your crest, your domain. RFX powers the engine; your club owns the experience.',
  },
];

const clubCards = [
  {
    icon: Building2,
    title: 'Centralized Recruitment Hub',
    copy: 'Every athlete, every metric, every conversation — one operational view for your technical staff.',
    glow: 'red' as const,
  },
  {
    icon: CircleDollarSign,
    title: 'Revenue Generation',
    copy: 'White-labeled memberships turn your recruitment support into a sustainable club income line.',
    glow: 'blue' as const,
  },
  {
    icon: Sparkles,
    title: 'Competitive Differentiation',
    copy: 'Families choose clubs that deliver pathways. Make yours the club that gets athletes signed.',
    glow: 'red' as const,
  },
];

export default function Clubs() {
  const [open, setOpen] = useState(0);

  return (
    <section id="clubs" className="relative overflow-hidden py-28 md:py-32">
      {/* twin glow orbs — the only section where cobalt leads */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-cobalt-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-[420px] w-[420px] translate-x-1/2 rounded-full bg-crimson-500/12 blur-[140px]" />

      <div className="relative mx-auto max-w-page px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>For clubs &amp; academies</Eyebrow>
            <h2 className="mt-6 max-w-md font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
              Power up your club&apos;s value proposition with{' '}
              <span className="text-cobalt-400">white labelling</span>
            </h2>
            <div className="mt-9 divide-y divide-[rgba(245,245,243,0.08)] border-y border-line">
              {accordion.map(({ title, copy }, i) => {
                const active = open === i;
                return (
                  <div key={title} className={active ? 'border-l-2 border-cobalt-400 pl-4' : 'pl-4'}>
                    <button
                      type="button"
                      onClick={() => setOpen(active ? -1 : i)}
                      aria-expanded={active}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left"
                    >
                      <span className={`font-body text-base font-semibold ${active ? 'text-paper-0' : 'text-paper-1'}`}>
                        {title}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-paper-3 transition-transform duration-300 ${
                          active ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ${
                        active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <p className="overflow-hidden pb-5 pr-8 text-sm leading-relaxed text-paper-2">
                        {copy}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal order={1} className="flex justify-center">
            <PhoneFrame glow="blue">
              <div className="space-y-3.5 p-4 pb-6">
                <p className="font-display text-xs font-bold text-paper-0">
                  Your <span className="text-cobalt-400">Club</span>
                </p>
                <div className="rounded-xl border border-line bg-ink-2 p-3.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">
                    Brand theme
                  </p>
                  <div className="mt-3 flex gap-2.5">
                    {['bg-crimson-500', 'bg-cobalt-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500'].map(
                      (c, i) => (
                        <span
                          key={c}
                          className={`h-7 w-7 rounded-full ${c} ${
                            i === 1 ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-2' : ''
                          }`}
                        />
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-line-blue bg-gradient-to-br from-cobalt-500/20 to-transparent p-3.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">Preview</p>
                  <p className="mt-1.5 text-xs text-paper-1">
                    Your athletes, your crest, your colors — powered by RFX.
                  </p>
                  <span className="mt-3 block rounded-full bg-cobalt-500 py-2 text-center text-[11px] font-semibold text-white shadow-glow-blue">
                    Publish club app
                  </span>
                </div>
              </div>
            </PhoneFrame>
          </Reveal>
        </div>

        <Reveal className="mx-auto mt-28 max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Your club, your platform, <span className="text-outline">your success</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-1">
            Give your athletes a professional pathway and your club a platform worthy of its badge.
          </p>
          <PrimaryButton className="mt-8">Talk to our team</PrimaryButton>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {clubCards.map(({ icon: Icon, title, copy, glow }, i) => (
            <Reveal
              key={title}
              order={i}
              className={`rounded-card border bg-ink-2/80 p-7 backdrop-blur-sm transition-all duration-250 hover:-translate-y-1 ${
                glow === 'blue'
                  ? 'border-line-blue shadow-glow-blue'
                  : 'border-line hover:border-line-red'
              }`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink-3">
                <Icon
                  className={`h-5 w-5 ${glow === 'blue' ? 'text-cobalt-400' : 'text-crimson-400'}`}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-5 font-body text-lg font-semibold tracking-[-0.01em] text-paper-0">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-paper-2">{copy}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
