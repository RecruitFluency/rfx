import React from 'react';
import { motion } from 'framer-motion';
import { Infinity as InfinityIcon } from 'lucide-react';
import { Section, Kicker, SectionTitle, fadeUp } from './ui';

const steps = [
  {
    n: '01',
    title: 'Re-vectorize your profile',
    body: 'New film, fresh stats, updated grades — every data point embeds into your living athlete vector the moment it lands.',
  },
  {
    n: '02',
    title: 'Match against every program',
    body: 'Vector search sweeps every roster, need, coaching change and portal gap in the nation — not a rep’s contact list.',
  },
  {
    n: '03',
    title: 'Predict where you’ll land',
    body: 'Fit scores rank the programs where you’ll actually play, weighted by need, level, academics and culture.',
  },
  {
    n: '04',
    title: 'Recruit with precision',
    body: 'The right coaches see the right version of you at the exact moment their need matches your vector.',
  },
];

const outcomes = [
  {
    n: '01 · More fit',
    title: 'Right rooms, not more rooms',
    body: 'You’re matched to programs that actually need your position, class year and profile — not blasted to a thousand inboxes.',
  },
  {
    n: '02 · Less waste',
    title: 'Off your plate, not on it',
    body: 'No more Friday nights researching rosters. The engine does the sweep while you train.',
  },
  {
    n: '03 · Leverage',
    title: 'Every data point is an asset',
    body: 'Every new clip and result sharpens your vector and re-ranks your matches. Effort compounds instead of evaporating.',
  },
  {
    n: '04 · Velocity',
    title: 'First-mover on every opening',
    body: 'A coaching change or portal gap opens — and you’re in the inbox before the athletes still waiting on a camp invite.',
  },
];

const Loop = () => (
  <Section>
    <div className="text-center mb-14">
      <Kicker>The engine</Kicker>
      <SectionTitle>The Match&ndash;Predict&ndash;Recruit Loop</SectionTitle>
      <motion.p {...fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
        A machine built to run one thing: get your recruitment pre-sold before they ever take the
        call &mdash; and get smarter at it every single week.
      </motion.p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
      <div className="space-y-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            {...fadeUp}
            transition={{ duration: 0.55, delay: i * 0.08 }}
            className="flex gap-5 rounded-xl border border-white/10 bg-[#121212] p-6"
          >
            <span className="text-[#FF0000] font-bold text-lg">{s.n}</span>
            <div>
              <h3 className="text-white font-bold mb-1">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} className="text-center">
        <div className="relative inline-flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: 'rgba(120,0,0,0.35)' }}
          />
          <InfinityIcon className="relative w-48 h-48 text-[#FF0000]" strokeWidth={1} />
        </div>
        <p className="text-gray-400 mt-6">
          One loop. Every week. <span className="text-white font-semibold">Compounding.</span>
        </p>
        <p className="text-gray-600 text-sm mt-2">
          The engine doesn&rsquo;t sleep between showcases. That&rsquo;s the point.
        </p>
      </motion.div>
    </div>

    <motion.p {...fadeUp} className="text-center text-gray-300 text-lg max-w-3xl mx-auto mb-14">
      As RFX runs: <span className="text-white font-semibold">1 objective</span> &mdash; more
      offers, lower cost, faster velocity. It runs in real time, on every roster, so it compounds
      in ways that a once-a-season recruiting push never can.
    </motion.p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {outcomes.map((o, i) => (
        <motion.div
          key={o.n}
          {...fadeUp}
          transition={{ duration: 0.55, delay: i * 0.08 }}
          className="rounded-xl border border-white/10 bg-gradient-to-b from-[#1a0000] to-[#121212] p-8"
        >
          <p className="text-[#FF0000] text-xs font-bold tracking-[0.25em] uppercase mb-3">{o.n}</p>
          <h3 className="text-white text-xl font-bold mb-3">{o.title}</h3>
          <p className="text-gray-400">{o.body}</p>
        </motion.div>
      ))}
    </div>
  </Section>
);

export default Loop;
