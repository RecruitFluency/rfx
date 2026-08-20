import React from 'react';
import { Star } from 'lucide-react';
import { Eyebrow } from './ui';
import { Reveal } from './motion';

const quotes = [
  {
    name: 'Maya Johnson',
    role: 'Point Guard · Signed D1, 2025',
    initials: 'MJ',
    hue: 'from-crimson-500 to-crimson-900',
    quote:
      'Three coaches reached out in my first month. The verified metrics did the talking — I just kept playing.',
  },
  {
    name: 'Darius Cole',
    role: 'Wing · Scholarship, Westlake U',
    initials: 'DC',
    hue: 'from-cobalt-500 to-cobalt-700',
    quote:
      'I uploaded one highlight reel and my profile started showing up in program searches. The feedback loop told me exactly what to fix.',
  },
  {
    name: 'Sofia Reyes',
    role: 'Guard · Class of 2026',
    initials: 'SR',
    hue: 'from-crimson-500 to-crimson-900',
    quote:
      'RFX replaced a spreadsheet, two inboxes, and a lot of guessing. Everything about my recruitment lives in one place now.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-28 md:py-32">
      <div className="mx-auto max-w-page px-6">
        <Reveal className="max-w-xl">
          <Eyebrow>Proof over promises</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Real results from real <span className="text-crimson-400">athletes.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {quotes.map(({ name, role, initials, hue, quote }, i) => (
            <Reveal
              key={name}
              order={i}
              className="flex flex-col rounded-card border border-line bg-ink-2 p-7 transition-all duration-250 hover:-translate-y-1 hover:border-line-2"
            >
              <div className="flex gap-1" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-crimson-400 text-crimson-400" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-paper-1">“{quote}”</p>
              <div className="mt-6 flex items-center gap-3.5">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${hue} font-display text-xs font-bold text-white`}
                >
                  {initials}
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-paper-0">{name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-paper-3">{role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
