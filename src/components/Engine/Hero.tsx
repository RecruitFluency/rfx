import React from 'react';
import { motion } from 'framer-motion';
import { WordReveal, PillCTA, BOOKING_URL } from './ui';

const navLinks = [
  { label: 'Overview', href: '#top' },
  { label: 'The Problem', href: '#problem' },
  { label: 'The Engine', href: '#engine' },
  { label: 'Get Started', href: '#cta' },
];

const audienceCards = [
  { title: 'Athletes', sub: 'Every sport' },
  { title: 'Families', sub: 'One profile' },
  { title: 'Clubs & Teams', sub: 'Full rosters' },
];

// Crossing "lens" arcs behind the hero, drawn on load like the reference video.
const Arcs = () => (
  <svg
    viewBox="0 0 1440 640"
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-x-0 top-24 w-full h-[640px] pointer-events-none"
    aria-hidden
  >
    <defs>
      <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FF0000" stopOpacity="0" />
        <stop offset="35%" stopColor="#FF0000" stopOpacity="0.55" />
        <stop offset="65%" stopColor="#FF0000" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
      </linearGradient>
      <filter id="arcBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
    {[
      'M-60,470 C420,150 1020,150 1500,470',
      'M-60,170 C420,490 1020,490 1500,170',
    ].map((d, i) => (
      <g key={i}>
        <motion.path
          d={d}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="5"
          filter="url(#arcBlur)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 1.6, delay: 0.3 + i * 0.2, ease: 'easeInOut' }}
        />
        <motion.path
          d={d}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.3 + i * 0.2, ease: 'easeInOut' }}
        />
      </g>
    ))}
  </svg>
);

// Glowing RFX "chip" with circuit traces branching out.
const Chip = () => (
  <div className="relative flex items-center justify-center mb-10">
    {/* circuit traces */}
    <svg viewBox="0 0 560 120" className="absolute w-[560px] max-w-full h-[120px]" aria-hidden>
      {[
        'M230 60 H80 V30 H40',
        'M230 60 H100 V95 H60',
        'M330 60 H480 V30 H520',
        'M330 60 H460 V95 H500',
      ].map((d, i) => (
        <g key={i}>
          <motion.path
            d={d}
            fill="none"
            stroke="#FF0000"
            strokeOpacity="0.35"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.8 + i * 0.15 }}
          />
          <motion.circle
            cx={i % 2 === 0 ? (i < 2 ? 40 : 520) : i < 2 ? 60 : 500}
            cy={i % 2 === 0 ? 30 : 95}
            r="3"
            fill="#FF0000"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.4, delay: 1.6, repeat: Infinity }}
          />
        </g>
      ))}
    </svg>

    <motion.div
      className="relative w-24 h-24 rounded-2xl border border-[#FF0000]/40 bg-gradient-to-b from-[#2a0000] to-[#0b0b0b] flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow: [
            '0 0 30px rgba(255,0,0,0.25)',
            '0 0 70px rgba(255,0,0,0.55)',
            '0 0 30px rgba(255,0,0,0.25)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <img src="/rfx-logo.svg" alt="RFX" className="relative w-12 h-12" />
    </motion.div>
  </div>
);

const Hero = () => (
  <section id="top" className="relative overflow-hidden bg-black min-h-screen flex flex-col">
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 60% 45% at 50% 35%, rgba(90,0,0,0.4), transparent 70%)',
      }}
    />

    {/* Nav */}
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-20 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between"
    >
      <a href="#top" className="flex items-center gap-2.5">
        <img src="/rfx-logo.svg" alt="RFX logo" className="h-7 w-7" />
        <span className="text-white font-bold tracking-widest">RFX</span>
      </a>
      <div className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
        {navLinks.slice(0, 3).map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="text-gray-300 hover:text-white text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-all"
          >
            {l.label}
          </a>
        ))}
      </div>
      <a
        href={BOOKING_URL}
        className="rounded-full bg-white text-black text-sm font-semibold px-5 py-2 hover:bg-gray-100 transition-all"
      >
        Get Started
      </a>
    </motion.nav>

    <Arcs />

    {/* Hero content */}
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-16 pb-20">
      <Chip />

      <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-5">
        <WordReveal text="Match. Predict. Recruit." delay={0.5} />
      </h1>

      <p className="text-gray-400 md:text-lg max-w-md mx-auto mb-8">
        <WordReveal
          text="Introducing the RFX Recruiting Engine. Ready for the AI era of college recruiting."
          delay={1}
        />
      </p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.9 }}
      >
        <PillCTA>Schedule Demo</PillCTA>
      </motion.div>

      {/* Audience cards */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 2.3 }}
        className="text-gray-500 text-xs tracking-[0.25em] uppercase mt-14 mb-4"
      >
        Founding classes open 2026
      </motion.p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {audienceCards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.4 + i * 0.12 }}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 min-w-[130px]"
          >
            <p className="text-white text-sm font-semibold">{c.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Hero;
