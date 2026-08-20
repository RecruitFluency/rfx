import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Eyebrow } from './ui';
import { Reveal } from './motion';

const tiers = [
  {
    name: 'Explore for free',
    price: { monthly: 0, yearly: 0 },
    blurb: 'Build your base profile and see who’s out there.',
    features: ['Athlete profile & one highlight clip', 'Browse programs & coaches', 'Basic profile analytics'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Premium Plan',
    price: { monthly: 9.99, yearly: 7.99 },
    blurb: 'The full recruitment engine, for athletes who mean it.',
    features: [
      'Unlimited highlight reels & clips',
      'Verified metrics & benchmarking',
      'Direct messaging with coaches',
      'Smart program matching',
      'Coach view & search insights',
    ],
    cta: 'Go Premium',
    featured: true,
  },
  {
    name: 'Basic Plan',
    price: { monthly: 4.99, yearly: 3.99 },
    blurb: 'More reach and more footage, at a starter price.',
    features: ['Five highlight clips', 'Extended profile analytics', 'Appear in coach searches'],
    cta: 'Choose Basic',
    featured: false,
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="relative py-28 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(229,25,44,0.08),transparent_70%)]" />
      <div className="relative mx-auto max-w-page px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Affordable options for every <span className="text-crimson-400">athlete</span>
          </h2>
          <div
            className="mt-8 inline-flex items-center gap-1 rounded-full border border-line-2 bg-ink-2 p-1"
            role="group"
            aria-label="Billing period"
          >
            {(['Monthly', 'Yearly'] as const).map((label) => {
              const active = (label === 'Yearly') === yearly;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setYearly(label === 'Yearly')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-crimson-500 text-white shadow-glow-red' : 'text-paper-2 hover:text-paper-0'
                  }`}
                >
                  {label}
                  {label === 'Yearly' && <span className="ml-1.5 text-[10px] opacity-80">−20%</span>}
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {tiers.map(({ name, price, blurb, features, cta, featured }, i) => {
            const amount = yearly ? price.yearly : price.monthly;
            return (
              <Reveal
                key={name}
                order={i}
                className={`relative flex flex-col rounded-card border p-8 transition-all duration-250 ${
                  featured
                    ? 'border-crimson-400/60 bg-gradient-to-b from-crimson-500/15 via-ink-2 to-ink-2 shadow-[0_0_0_1px_rgba(255,46,63,0.25),0_0_60px_rgba(255,46,63,0.25)] md:-translate-y-4'
                    : 'border-line bg-ink-2 hover:-translate-y-1 hover:border-line-2'
                }`}
              >
                {featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-crimson-500 px-4 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white shadow-glow-red">
                    Most popular
                  </span>
                )}
                <h3 className="font-body text-lg font-semibold text-paper-0">{name}</h3>
                <p className="mt-1.5 text-sm text-paper-2">{blurb}</p>
                <p className="mt-6 font-display text-5xl font-semibold tracking-[-0.02em] text-paper-0 tabular-nums">
                  ${amount.toFixed(2).replace('.00', '')}
                  <span className="ml-1.5 font-body text-sm font-normal text-paper-3">/ month</span>
                </p>
                <ul className="mt-7 flex-1 space-y-3.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-paper-1">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-crimson-400' : 'text-paper-3'}`}
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={`mt-8 rounded-full py-3 text-center text-sm font-semibold transition-all duration-150 ${
                    featured
                      ? 'bg-crimson-500 text-white shadow-glow-red hover:-translate-y-px hover:bg-crimson-400 hover:shadow-glow-red-lg'
                      : 'border border-line-2 text-paper-0 hover:border-line-red hover:bg-crimson-500/5'
                  }`}
                >
                  {cta}
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
