import React from 'react';
import { motion } from 'framer-motion';
import { Section, Kicker, SectionTitle, fadeUp } from './ui';

const Proof = () => (
  <>
    <Section dark>
      <div className="text-center mb-12">
        <Kicker>The receipts</Kicker>
        <SectionTitle>What this engine produced before it went all-sports</SectionTitle>
      </div>

      <motion.div
        {...fadeUp}
        className="max-w-3xl mx-auto rounded-2xl border border-[#FF0000]/30 bg-gradient-to-b from-[#1a0000] to-[#0b0b0b] p-10 md:p-14 text-center"
      >
        <p className="text-gray-400 uppercase tracking-[0.25em] text-xs mb-6">
          Built and proven in college soccer first
        </p>
        <p className="text-4xl md:text-6xl font-bold text-white mb-2">
          2,500+ coaches <span className="text-[#FF0000]">&rarr;</span> $50M+
        </p>
        <p className="text-gray-400 mb-8">in athletic scholarships connected through the platform</p>
        <div className="flex flex-col sm:flex-row justify-center gap-8 pt-8 border-t border-white/10">
          <div>
            <p className="text-2xl font-bold text-[#FF0000]">10,000+</p>
            <p className="text-gray-400 text-sm">active athletes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#FF0000]">85%</p>
            <p className="text-gray-400 text-sm">improved recruitment success</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#FF0000]">Every division</p>
            <p className="text-gray-400 text-sm">D1 through NAIA and JUCO</p>
          </div>
        </div>
      </motion.div>

      <motion.p {...fadeUp} className="text-center text-gray-400 max-w-2xl mx-auto mt-10">
        Soccer was the proving ground. The vector engine underneath it doesn&rsquo;t care what
        sport you play &mdash; and now we&rsquo;re hand-picking founding athletes in every sport to
        run it for.
      </motion.p>
    </Section>

    <Section>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Kicker>Why RFX exists</Kicker>
        </div>
        <motion.blockquote
          {...fadeUp}
          className="rounded-xl border border-white/10 bg-[#121212] p-10 md:p-12"
        >
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            &ldquo;We watched too many great athletes go unseen &mdash; not because they
            weren&rsquo;t good enough, but because visibility and ability are two different games.
            The families with insider networks and five-figure budgets won the visibility game
            every time.
          </p>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            So we built the thing we wished every athlete had: an engine that reads the entire
            college landscape every week and puts you in front of the rooms that actually need you.
            Not a service you rent. A machine that works for you.
          </p>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            Talent should decide recruitment. Now the math is on your side.&rdquo;
          </p>
          <footer className="text-[#FF0000] font-bold tracking-wide">
            &mdash; The RFX Founding Team
          </footer>
        </motion.blockquote>
      </div>
    </Section>
  </>
);

export default Proof;
