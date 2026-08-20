import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Eyebrow, GhostButton } from './ui';
import { Reveal } from './motion';

const faqs = [
  {
    q: 'What is RFX?',
    a: 'RFX is a college athletic recruitment platform. Athletes build verified profiles with metrics and highlight footage; coaches and programs discover, evaluate, and contact them directly — all in one place.',
  },
  {
    q: 'How do coaches verify my metrics?',
    a: 'Combine-style metrics are captured at partner events or submitted with video evidence, then reviewed before they earn the verified badge on your profile.',
  },
  {
    q: 'Is RFX only for basketball?',
    a: 'No. RFX supports every major college sport. Your profile adapts its metrics and positions to the sport you play.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Plans are month-to-month (or yearly, if you choose the discount) and you can cancel from your dashboard in two clicks. Your profile stays live on the free tier.',
  },
  {
    q: 'How does white labelling work for clubs?',
    a: 'Clubs get the full RFX engine under their own brand — colors, crest, and domain — plus an admin view across all their athletes. Talk to our team for club pricing.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section className="py-28 md:py-32">
      <div className="mx-auto grid max-w-page gap-14 px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-6 max-w-sm font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Find the answers to common <span className="text-outline">questions.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-paper-1">
            Can&apos;t find what you&apos;re looking for? Our team answers every message within a
            day.
          </p>
          <GhostButton className="mt-8">Contact support</GhostButton>
        </Reveal>

        <Reveal order={1} className="divide-y divide-[rgba(245,245,243,0.08)] border-y border-line">
          {faqs.map(({ q, a }, i) => {
            const active = open === i;
            return (
              <div key={q} className={active ? 'border-l-2 border-crimson-400 pl-5' : 'pl-5'}>
                <button
                  type="button"
                  onClick={() => setOpen(active ? -1 : i)}
                  aria-expanded={active}
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                >
                  <span className={`font-body text-base font-semibold ${active ? 'text-paper-0' : 'text-paper-1'}`}>
                    {q}
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
                  <p className="overflow-hidden pb-6 pr-8 text-sm leading-relaxed text-paper-2">{a}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
