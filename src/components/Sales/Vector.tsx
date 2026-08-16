import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Building2, GitCompareArrows, TrendingUp } from 'lucide-react';
import { Section, Kicker, SectionTitle, CTAButton, fadeUp } from './ui';

const cards = [
  {
    icon: Fingerprint,
    title: 'The Athlete Vector',
    body: 'Your film, stats, academics, measurables and intangibles — embedded into one living mathematical profile that updates as you do.',
  },
  {
    icon: Building2,
    title: 'The Program Vector',
    body: 'Every college program in the nation — roster, needs, style, coaching staff, scholarship posture — vectorized and refreshed continuously.',
  },
  {
    icon: GitCompareArrows,
    title: 'The Match Score',
    body: 'Vector similarity between you and every program, ranked. Not opinion, not a rep’s hunch — measurable fit.',
  },
  {
    icon: TrendingUp,
    title: 'The Prediction',
    body: 'Where you’ll actually play, and where you’ll actually get paid to — projected from thousands of recruitments that came before yours.',
  },
];

const Vector = () => (
  <Section dark id="engine">
    <div className="text-center mb-14">
      <Kicker>Under the hood</Kicker>
      <SectionTitle>Your entire game? The engine reads it as math.</SectionTitle>
      <motion.p {...fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
        RFX is built on a vector database &mdash; the same retrieval technology powering modern AI
        search &mdash; pointed at one problem: your recruitment.
      </motion.p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
      {cards.map((c, i) => (
        <motion.div
          key={c.title}
          {...fadeUp}
          transition={{ duration: 0.55, delay: i * 0.08 }}
          className="rounded-xl border border-white/10 bg-[#121212] p-7"
        >
          <c.icon className="w-8 h-8 text-[#FF0000] mb-5" />
          <h3 className="text-white font-bold mb-3">{c.title}</h3>
          <p className="text-gray-400 text-sm">{c.body}</p>
        </motion.div>
      ))}
    </div>

    <motion.div {...fadeUp} className="text-center">
      <CTAButton />
    </motion.div>
  </Section>
);

export default Vector;
