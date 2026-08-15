import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, GitCompareArrows, Send } from 'lucide-react';
import { WordReveal, PillCTA, fadeUp } from './ui';

const steps = [
  {
    icon: Fingerprint,
    text: 'Your film, stats and academics become one living profile',
  },
  {
    icon: GitCompareArrows,
    text: 'Matched and ranked against every program in the nation',
  },
  {
    icon: Send,
    text: 'The right coaches reached at exactly the right moment',
  },
];

const Closing = () => (
  <section id="cta" className="relative overflow-hidden bg-black py-24 md:py-32">
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 55% 50% at 50% 100%, rgba(90,0,0,0.45), transparent 70%)',
      }}
    />

    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-14">
        <WordReveal text="The Recruiting Engine" />{' '}
        <span className="text-[#FF3B30]">
          <WordReveal text="Delivers" delay={0.4} />
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 mb-16">
        {steps.map((s, i) => (
          <motion.div
            key={s.text}
            {...fadeUp}
            transition={{ duration: 0.55, delay: i * 0.15 }}
            className="relative flex flex-col items-center"
          >
            {i > 0 && (
              <span className="hidden md:block absolute top-7 -left-1/2 w-full border-t border-dashed border-white/15" />
            )}
            <span className="relative flex items-center justify-center w-14 h-14 rounded-xl border border-[#FF0000]/40 bg-gradient-to-b from-[#2a0000] to-[#0b0b0b] mb-5 shadow-[0_0_30px_rgba(255,0,0,0.25)]">
              <s.icon className="w-6 h-6 text-[#FF0000]" />
            </span>
            <p className="text-gray-400 text-sm max-w-[220px]">{s.text}</p>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.5 }}>
        <PillCTA>Schedule Demo</PillCTA>
        <p className="text-gray-600 text-sm mt-5">
          Founding classes open 2026 &middot; limited seats per sport, per class year
        </p>
      </motion.div>
    </div>
  </section>
);

export default Closing;
