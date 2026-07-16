import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { CTAButton, RedAccent } from './ui';

const stats = [
  { value: '2,500+', label: 'college coaches connected' },
  { value: '10,000+', label: 'active athletes on the engine' },
  { value: '$50M+', label: 'in athletic scholarships' },
  { value: '85%', label: 'improved recruitment success' },
];

const ticker = [
  'Vector Search',
  'Program Fit',
  'Predictive Ranking',
  'Coach Outreach',
  'Roster Intelligence',
  'All Sports',
];

const Hero = () => (
  <section className="relative overflow-hidden bg-black">
    {/* Dark-on-red glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(120,0,0,0.45), transparent 70%)',
      }}
    />

    <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/rfx-logo.svg" alt="RFX logo" className="h-8 w-8" />
        <span className="text-white font-semibold tracking-widest">RFX</span>
      </div>
      <span className="hidden sm:block text-gray-400 text-xs tracking-[0.25em] uppercase">
        Match &middot; Predict &middot; Recruit
      </span>
    </header>

    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-16 text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-[#FF0000] text-xs md:text-sm font-bold tracking-[0.3em] uppercase mb-6"
      >
        All-sports recruiting intelligence
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6"
      >
        Watch RFX build your recruiting machine &mdash; then optimize itself so{' '}
        <RedAccent>coaches show up pre&#8209;sold</RedAccent>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
      >
        One profile. Every sport. RFX turns your film, stats, academics and intangibles into a
        living vector profile &mdash; matched against every college program in the nation and
        re-ranked every single week.
      </motion.p>

      {/* Video placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative mx-auto max-w-3xl rounded-xl border border-white/10 bg-[#121212] aspect-video mb-10 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(120,0,0,0.35), transparent 70%)',
          }}
        />
        <button
          aria-label="Play the RFX walkthrough"
          className="absolute inset-0 flex items-center justify-center group"
        >
          <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#FF0000] group-hover:bg-[#CC0000] transition-all shadow-[0_0_60px_rgba(255,0,0,0.4)]">
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </span>
        </button>
        <p className="absolute bottom-4 inset-x-0 text-center text-gray-500 text-sm">
          Watch the engine match, predict and recruit in real time
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
      >
        <CTAButton />
        <p className="text-gray-500 text-sm mt-4">
          No prices on this page on purpose &mdash; your situation gets evaluated first.
        </p>
      </motion.div>
    </div>

    {/* Stats bar */}
    <div className="relative z-10 border-t border-white/10 bg-[#0b0b0b]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-3xl md:text-4xl font-bold text-[#FF0000]">{s.value}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Capability ticker */}
    <div className="relative z-10 border-t border-b border-white/10 bg-black">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {ticker.map((t) => (
          <span key={t} className="text-gray-500 text-xs tracking-[0.2em] uppercase">
            {t}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default Hero;
