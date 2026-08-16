import React from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Section, Kicker, SectionTitle, fadeUp } from './ui';

const notFor = [
  'Athletes looking for a magic wand — no film, no grades, no work',
  'Families who want comfortable promises instead of honest data',
  'Anyone who thinks recruiting is one email blast in junior year',
  'People who need to “own” every conversation instead of trusting the process',
];

const builtFor = [
  'Athletes with real film and real grades who are invisible to the right rooms',
  'Families done paying thousands for guesswork and generic blasts',
  'Late bloomers and position changers the traditional pipeline overlooks',
  'Club directors who want every roster spot working, not just the top two names',
];

const Fit = () => (
  <Section dark>
    <div className="text-center mb-14">
      <Kicker>Straight talk</Kicker>
      <SectionTitle>
        This isn&rsquo;t for everyone &mdash; and that&rsquo;s the point
      </SectionTitle>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <motion.div
        {...fadeUp}
        className="rounded-xl border border-white/10 bg-[#121212] p-8"
      >
        <h3 className="text-gray-400 font-bold uppercase tracking-[0.2em] text-sm mb-6">
          Not for you if&hellip;
        </h3>
        <ul className="space-y-4">
          {notFor.map((item) => (
            <li key={item} className="flex gap-3 text-gray-400">
              <X className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="rounded-xl border border-[#FF0000]/30 bg-gradient-to-b from-[#1a0000] to-[#121212] p-8"
      >
        <h3 className="text-white font-bold uppercase tracking-[0.2em] text-sm mb-6">
          Built for you if&hellip;
        </h3>
        <ul className="space-y-4">
          {builtFor.map((item) => (
            <li key={item} className="flex gap-3 text-gray-300">
              <Check className="w-5 h-5 text-[#FF0000] shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  </Section>
);

export default Fit;
