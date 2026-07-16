import React from 'react';
import { motion } from 'framer-motion';
import { Section, Kicker, SectionTitle, fadeUp } from './ui';

const tried = [
  {
    option: 'Option 1',
    title: 'Hire a recruiting service',
    body: 'You pay thousands for a rep who blasts a generic profile to their list and hopes something sticks. They can’t see roster needs, and they’re juggling hundreds of athletes at once.',
    result: 'You’re one of 400 names on one rep’s list.',
  },
  {
    option: 'Option 2',
    title: 'DIY with spreadsheets and email',
    body: 'You spend nights building school lists, guessing which programs actually need your position and class year, and firing cold emails into inboxes that get hundreds a week.',
    result: 'Hours every week, cold emails into the void.',
  },
  {
    option: 'Option 3',
    title: 'Leave it to your club coach',
    body: 'They mean well and they know people — but their network is finite, their time isn’t yours, and they’re advocating for a whole roster, not just you.',
    result: 'Your future depends on someone else’s contact list.',
  },
];

const Problem = () => (
  <>
    <Section dark>
      <div className="max-w-3xl mx-auto text-center">
        <Kicker>The truth first</Kicker>
        <SectionTitle>Let&rsquo;s be honest about why you&rsquo;re stuck.</SectionTitle>
        <motion.div {...fadeUp} className="text-gray-300 text-lg space-y-6 text-left md:text-center">
          <p>
            <span className="text-white font-semibold">It isn&rsquo;t effort.</span> You&rsquo;ve
            made the film. You&rsquo;ve kept the grades. You&rsquo;ve paid for the showcases and
            the ID camps and sent the emails &mdash; and your highlight tape still sits at 43
            views.
          </p>
          <p>
            The problem is scale. There are thousands of college programs, each with roster needs,
            coaching changes, transfer-portal gaps and scholarship windows shifting every week. No
            family, no rep, no club coach can hold all of that in their head &mdash; let alone act
            on it every single week.
          </p>
          <p>
            So the athletes who get recruited aren&rsquo;t always the best ones.{' '}
            <span className="text-[#FF0000] font-semibold">
              They&rsquo;re the ones who happened to be visible to the right room at the right
              moment.
            </span>{' '}
            Until now, that was luck. RFX makes it math.
          </p>
        </motion.div>
      </div>
    </Section>

    <Section>
      <div className="text-center mb-14">
        <Kicker>The path most take</Kicker>
        <SectionTitle>What you&rsquo;ve probably already tried</SectionTitle>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tried.map((t, i) => (
          <motion.div
            key={t.title}
            {...fadeUp}
            transition={{ duration: 0.55, delay: i * 0.1 }}
            className="rounded-xl border border-white/10 bg-[#121212] p-8 flex flex-col"
          >
            <p className="text-[#FF0000] text-xs font-bold tracking-[0.25em] uppercase mb-3">
              {t.option}
            </p>
            <h3 className="text-white text-xl font-bold mb-4">{t.title}</h3>
            <p className="text-gray-400 flex-1">{t.body}</p>
            <p className="text-gray-300 text-sm mt-6 pt-6 border-t border-white/10">
              <span className="text-[#FF0000] font-semibold">The result:</span> {t.result}
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  </>
);

export default Problem;
