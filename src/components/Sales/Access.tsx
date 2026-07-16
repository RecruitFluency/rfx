import React from 'react';
import { motion } from 'framer-motion';
import { Check, PhoneCall } from 'lucide-react';
import { Section, Kicker, SectionTitle, CTAButton, fadeUp } from './ui';

const tiers = [
  {
    name: 'Match',
    tagline: 'See yourself the way the engine does',
    features: [
      'Athlete Vector Profile',
      'Full-nation match list, ranked by fit',
      'Weekly re-ranking as rosters move',
    ],
    highlight: false,
  },
  {
    name: 'Predict',
    tagline: 'Know where you’ll land before coaches do',
    features: [
      'Everything in Match',
      'Prediction scores by division and program',
      'Weekly Intelligence Report',
      'Film & data pipeline',
    ],
    highlight: true,
  },
  {
    name: 'Recruit',
    tagline: 'The full engine, run for you',
    features: [
      'Everything in Predict',
      'Precision outreach to matched coaches',
      'Opening alerts: portal gaps & staff changes',
      'Direct guidance through offers & commits',
    ],
    highlight: false,
  },
];

const callExpectations = [
  'We evaluate your film, grades and level honestly — before anything else',
  'You see your first vector matches live on the call',
  'Pricing is shared openly once we know the engine can work for you',
  'If it’s not a fit, we tell you — and point you somewhere better',
];

const Access = () => (
  <Section id="access">
    <div className="text-center mb-14">
      <Kicker>Access</Kicker>
      <SectionTitle>Transparent access. Real scarcity. No games.</SectionTitle>
      <motion.p {...fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
        Founding seats are limited per sport, per class year, per position &mdash; because the
        engine only wins for you if it isn&rsquo;t working for everyone you&rsquo;re competing
        against.
      </motion.p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
      {tiers.map((tier, i) => (
        <motion.div
          key={tier.name}
          {...fadeUp}
          transition={{ duration: 0.55, delay: i * 0.1 }}
          className={`rounded-xl p-8 flex flex-col ${
            tier.highlight
              ? 'border border-[#FF0000]/40 bg-gradient-to-b from-[#2a0000] to-[#121212] shadow-[0_0_60px_rgba(255,0,0,0.15)]'
              : 'border border-white/10 bg-[#121212]'
          }`}
        >
          {tier.highlight && (
            <p className="text-[#FF0000] text-xs font-bold tracking-[0.25em] uppercase mb-4">
              Most chosen
            </p>
          )}
          <h3 className="text-white text-2xl font-bold uppercase tracking-wide mb-2">
            {tier.name}
          </h3>
          <p className="text-gray-400 text-sm mb-6">{tier.tagline}</p>
          <ul className="space-y-3 flex-1">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-3 text-gray-300 text-sm">
                <Check className="w-4 h-4 text-[#FF0000] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-500 text-xs mt-8 pt-6 border-t border-white/10">
            Pricing shared on your call &mdash; no surprises, no pressure.
          </p>
        </motion.div>
      ))}
    </div>

    <motion.div
      {...fadeUp}
      className="max-w-3xl mx-auto rounded-xl border border-white/10 bg-[#0b0b0b] p-10 text-center"
    >
      <PhoneCall className="w-8 h-8 text-[#FF0000] mx-auto mb-5" />
      <h3 className="text-white text-2xl font-bold mb-6">What to expect on the call</h3>
      <ul className="text-left max-w-xl mx-auto space-y-4 mb-10">
        {callExpectations.map((item) => (
          <li key={item} className="flex gap-3 text-gray-300">
            <Check className="w-5 h-5 text-[#FF0000] shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <CTAButton />
    </motion.div>
  </Section>
);

export default Access;
