import React from 'react';
import { motion } from 'framer-motion';
import {
  UserSquare2,
  Database,
  Target,
  Send,
  Film,
  FileBarChart2,
} from 'lucide-react';
import { Section, Kicker, SectionTitle, fadeUp } from './ui';

const items = [
  {
    icon: UserSquare2,
    title: 'Athlete Vector Profile',
    body: 'Film, stats, academics and intangibles embedded into one living profile — the version of you the engine works with every week.',
  },
  {
    icon: Database,
    title: 'Full-Nation Program Index',
    body: 'Every college program, roster, need and staff — vectorized, indexed and refreshed so nothing in the country is invisible to you.',
  },
  {
    icon: Target,
    title: 'Fit & Prediction Scores',
    body: 'A ranked list of the programs where you’ll actually play, re-scored weekly as rosters, needs and your own profile move.',
  },
  {
    icon: Send,
    title: 'Precision Outreach Engine',
    body: 'The right coaches get the right version of your profile at the exact moment their need matches your vector.',
  },
  {
    icon: Film,
    title: 'Film & Data Pipeline',
    body: 'Every new clip, result and grade feeds straight back into your vector automatically — no re-uploading, no re-explaining.',
  },
  {
    icon: FileBarChart2,
    title: 'Weekly Intelligence Report',
    body: 'What moved, who looked, where you rank, and exactly what to do next — in plain language, every week.',
  },
];

const Installed = () => (
  <Section>
    <div className="text-center mb-14">
      <Kicker>What gets installed</Kicker>
      <SectionTitle>Your AI recruiting department</SectionTitle>
      <motion.p {...fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
        One integrated engine &mdash; installed in your recruitment in days, not seasons.
      </motion.p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          {...fadeUp}
          transition={{ duration: 0.55, delay: i * 0.06 }}
          className="flex gap-5 rounded-xl border border-white/10 bg-[#121212] p-7"
        >
          <item.icon className="w-7 h-7 text-[#FF0000] shrink-0 mt-1" />
          <div>
            <h3 className="text-white font-bold mb-2">{item.title}</h3>
            <p className="text-gray-400 text-sm">{item.body}</p>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.p {...fadeUp} className="text-center text-gray-300">
      You own <span className="text-[#FF0000] font-bold">100%</span> of it &mdash; your data, your
      relationships, your recruitment.
    </motion.p>
  </Section>
);

export default Installed;
