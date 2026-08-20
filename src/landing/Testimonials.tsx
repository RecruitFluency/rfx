import React from 'react';
import { Star } from 'lucide-react';
import { Eyebrow } from './ui';
import { Reveal, ParallaxPlane } from './motion';
import { IPhoneFrame } from './devices';
import { BigSundayThread, TwelveCoachesThread, FloodedInboxThread } from './screens/threads';

/*
 * Quotes are drawn from real customer messages, anonymised: first name plus
 * last initial, and no school, GPA, or contact details for any recruit.
 */
const quotes: Array<{ quote: string; name: string; role: string }> = [
  {
    quote:
      'Those coaches reached out in my first month. The verified metrics did the talking — I just kept playing.',
    name: 'Maya J.',
    role: 'Guard · Class of 2026',
  },
  {
    quote:
      'I uploaded one highlight reel and my profile started showing up in programs’ searches. The feedback loop told me exactly what to fix.',
    name: 'Darius C.',
    role: 'Wing · Class of 2027',
  },
  {
    quote:
      'RFX replaced a spreadsheet, two inboxes, and a lot of guessing. Everything about my recruitment lives in one place now.',
    name: 'Sofia R.',
    role: 'Guard · Class of 2026',
  },
  {
    quote:
      'The response from the app has been great so far. I’m having a little trouble keeping up with all of it — a good problem.',
    name: 'Franco P.',
    role: 'Club director',
  },
];

function QuoteCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <figure className="rounded-card border border-line bg-ink-2/80 p-6 backdrop-blur-sm transition-colors duration-200 hover:border-line-2">
      <div className="flex gap-0.5" aria-label="Five out of five">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-crimson-400 text-crimson-400" aria-hidden="true" />
        ))}
      </div>
      <blockquote className="mt-4 text-sm leading-relaxed text-paper-1">“{quote}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-crimson-500 to-crimson-900 font-display text-xs font-bold text-white">
          {name.charAt(0)}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-paper-0">{name}</span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-paper-3">{role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden py-28 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(229,25,44,0.10),transparent_70%)]" />
      <div className="relative mx-auto max-w-page px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Real athletes, real outcomes</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Real results from real <span className="text-crimson-400">athletes.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-1">
            The messages we wake up to — from the parents, athletes, and clubs living it.
          </p>
        </Reveal>

        {/* the proof: actual conversations, in hand */}
        <div className="mt-16 flex flex-wrap items-end justify-center gap-8 lg:gap-12">
          <ParallaxPlane speed={1.14} range={110} className="hidden md:block">
            <Reveal>
              <IPhoneFrame glow="none" width={244} className="rotate-[-4deg]">
                <TwelveCoachesThread />
              </IPhoneFrame>
            </Reveal>
          </ParallaxPlane>
          <Reveal order={1}>
            <IPhoneFrame glow="red" width={278} className="z-10">
              <BigSundayThread />
            </IPhoneFrame>
          </Reveal>
          <ParallaxPlane speed={1.22} range={110} className="hidden md:block">
            <Reveal order={2}>
              <IPhoneFrame glow="none" width={244} className="rotate-[4deg]">
                <FloodedInboxThread />
              </IPhoneFrame>
            </Reveal>
          </ParallaxPlane>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quotes.map((q, i) => (
            <Reveal key={q.name} order={i}>
              <QuoteCard {...q} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
