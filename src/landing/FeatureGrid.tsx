import React from 'react';
import {
  Award,
  BarChart3,
  Globe2,
  LayoutDashboard,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { Eyebrow, PrimaryButton } from './ui';
import { Reveal } from './motion';

const cards = [
  {
    icon: Zap,
    title: 'Athlete Ability Hub',
    copy: 'Every metric that matters — speed, strength, game stats — verified and benchmarked against your division.',
    featured: true,
  },
  {
    icon: Award,
    title: 'Athletic Scholarships',
    copy: 'Track scholarship openings across programs and see exactly what each one requires.',
  },
  {
    icon: BarChart3,
    title: 'Recruiting Insights',
    copy: 'Know which coaches viewed your profile and what they searched to find you.',
  },
  {
    icon: Globe2,
    title: 'Global Network',
    copy: 'Thousands of verified coaches and programs across every division and conference.',
  },
  {
    icon: LayoutDashboard,
    title: 'Personalized Dashboard',
    copy: 'One command center for your profile, matches, messages, and milestones.',
  },
  {
    icon: MessageCircle,
    title: 'Feedback Loop',
    copy: 'Structured feedback from coaches after every interaction, so you always know your next step.',
  },
];

export default function FeatureGrid() {
  return (
    <section className="relative py-28 md:py-32">
      {/* section vignette + faint flat grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent_80%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(229,25,44,0.10),transparent_70%)]" />

      <div className="relative mx-auto max-w-page px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Explore your possibilities</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Unlock your full <span className="text-crimson-400">potential!</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-1">
            One platform to prove your ability, get discovered, and manage every step of your
            recruitment.
          </p>
          <PrimaryButton className="mt-8">Create your profile</PrimaryButton>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, copy, featured }, i) => (
            <Reveal
              key={title}
              order={i}
              className={`group rounded-card border p-7 transition-all duration-250 hover:-translate-y-1 ${
                featured
                  ? 'border-line-red bg-gradient-to-br from-crimson-500 via-crimson-700 to-[#1A0407] shadow-glow-red-lg'
                  : 'border-line bg-ink-2 hover:border-line-2'
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl border ${
                  featured ? 'border-white/25 bg-white/10' : 'border-line bg-ink-3'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    featured ? 'text-white' : 'text-paper-2 transition-colors group-hover:text-crimson-400'
                  }`}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3
                className={`mt-5 font-body text-lg font-semibold tracking-[-0.01em] ${
                  featured ? 'text-white' : 'text-paper-0'
                }`}
              >
                {title}
              </h3>
              <p
                className={`mt-2.5 text-sm leading-relaxed ${
                  featured ? 'text-white/80' : 'text-paper-2'
                }`}
              >
                {copy}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
