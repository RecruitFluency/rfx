import React from 'react';
import { motion } from 'framer-motion';
import { Badge, WordReveal, FloatingDots, fadeUp } from './ui';

const pillars = [
  {
    title: 'Match',
    body: 'Your film, stats and academics become a living vector profile — matched against every college program in the nation.',
  },
  {
    title: 'Predict',
    body: 'Fit scores rank where you’ll actually play — re-ranked every week as rosters, needs and your profile move.',
  },
  {
    title: 'Recruit',
    body: 'The right coaches see you at the exact moment their need matches your profile. No blasts. No noise.',
  },
];

const Solution = () => (
  <section id="engine" className="bg-[#f2f2f0] pb-20 md:pb-28">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        {...fadeUp}
        className="relative rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 md:p-12 overflow-hidden"
      >
        <FloatingDots opacity={0.35} />

        <div className="relative text-center mb-12">
          <Badge light>Solutions</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-[#121212] leading-tight mt-5">
            <WordReveal text="Evolving recruiting for" />
            <br />
            <span className="text-[#FF5252]">
              <WordReveal text="athletes with" delay={0.3} />
            </span>
          </h2>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Dark red brand panel sliding in, like the video's "Verifiable" panel */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="rounded-2xl bg-gradient-to-br from-[#3a0505] to-[#1c0202] min-h-[320px] flex items-center justify-center gap-4"
          >
            <span className="text-white text-3xl md:text-4xl font-bold tracking-wide">RFX</span>
            <motion.span
              className="w-4 h-4 rounded-full bg-[#FF0000]"
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          <div className="relative">
            {/* connector spine */}
            <div className="absolute left-[7px] top-4 bottom-4 w-px bg-[#FF0000]/25 hidden sm:block" />
            <ul className="space-y-8">
              {pillars.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                  className="flex gap-4"
                >
                  <motion.span
                    className="w-[15px] h-[15px] rounded-full bg-[#FF0000] shrink-0 mt-1"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.4, delay: i * 0.4, repeat: Infinity }}
                  />
                  <div>
                    <h3 className="text-[#121212] font-bold text-lg">{p.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 max-w-sm">{p.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default Solution;
