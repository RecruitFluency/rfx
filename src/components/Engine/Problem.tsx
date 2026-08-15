import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Badge, WordReveal, fadeUp } from './ui';

const problems = [
  'Mass email blasts coaches ignore',
  'Pay-to-play showcases and camps',
  'Finite personal networks',
  'Guesswork on program fit',
  'Roster needs you can’t see',
  'Late-cycle visibility',
  'One rep, hundreds of athletes',
  'Commitments that don’t stick',
];

// Dark "lens" visual with glowing red arcs, echoing the hero.
const NoiseVisual = () => (
  <div className="relative rounded-2xl bg-black overflow-hidden min-h-[280px] flex items-center justify-center">
    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="noiseGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF0000" stopOpacity="0" />
          <stop offset="50%" stopColor="#FF0000" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
        </linearGradient>
        <filter id="noiseBlur">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {['M-20,240 C130,60 270,60 420,240', 'M-20,60 C130,240 270,240 420,60'].map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="url(#noiseGrad)" strokeWidth="6" filter="url(#noiseBlur)" />
          <path d={d} fill="none" stroke="url(#noiseGrad)" strokeWidth="1.5" />
        </g>
      ))}
      {[
        { cx: 130, cy: 120, r: 9 },
        { cx: 170, cy: 165, r: 6 },
        { cx: 145, cy: 205, r: 11 },
      ].map((c, i) => (
        <motion.circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="#FF0000"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 2.6, delay: i * 0.5, repeat: Infinity }}
        />
      ))}
    </svg>
    <p className="relative text-white font-semibold underline underline-offset-8 decoration-[#FF0000]/60">
      The Noise
    </p>
  </div>
);

const Problem = () => (
  <section id="problem" className="bg-[#f2f2f0] py-20 md:py-28">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        {...fadeUp}
        className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 md:p-12"
      >
        <div className="text-center mb-10">
          <Badge light>The Problem</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-[#121212] leading-tight mt-5">
            <WordReveal text="New recruiting era" />
            <br />
            <span className="text-[#FF5252]">
              <WordReveal text="equals New noise" delay={0.3} />
            </span>
          </h2>
          <motion.p {...fadeUp} className="text-gray-500 max-w-xl mx-auto mt-4 text-sm md:text-base">
            Every athlete now has film, a profile and a highlight link. Coaches are buried.
            The old playbook — blast, pay, hope — adds to the noise instead of cutting through it.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <NoiseVisual />

          <div className="rounded-2xl bg-[#fff5f5] p-8">
            <h3 className="text-[#121212] font-bold mb-6">The Problem</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {problems.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="flex items-start gap-2 text-gray-700 text-sm"
                >
                  <ChevronRight className="w-4 h-4 text-[#FF0000] shrink-0 mt-0.5" />
                  {p}
                </motion.li>
              ))}
            </ul>
            <motion.a
              {...fadeUp}
              href="#engine"
              className="inline-flex items-center gap-2 mt-8 rounded-full bg-[#121212] text-white text-sm font-semibold px-5 py-2.5 hover:bg-black transition-all"
            >
              View Solutions
              <ChevronDown className="w-4 h-4" />
            </motion.a>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default Problem;
