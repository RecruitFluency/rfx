import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Section, Kicker, SectionTitle, CTAButton, fadeUp } from './ui';

const faqs = [
  {
    q: 'Why aren’t there prices on this page?',
    a: 'Because the honest answer is “it depends on your situation.” Sport, class year, level and how much of the engine you need all change the picture. We evaluate first, then share pricing openly on the call — no games, no pressure, no surprise upsells.',
  },
  {
    q: 'Is this just a recruiting service with an AI wrapper?',
    a: 'No. A service rents you a rep’s time and contact list. RFX is a vector database engine: your profile and every program in the nation are embedded as vectors, matched mathematically, and re-ranked every week. Humans guide it — the machine does the sweep no human can.',
  },
  {
    q: 'What sports do you cover?',
    a: 'RFX was built and proven in college soccer and is now expanding to all sports. Founding seats are opened sport by sport — book a call to see whether your sport and class year are open.',
  },
  {
    q: 'What exactly is a “vector profile”?',
    a: 'Your film, stats, academics, measurables and intangibles get converted into a mathematical representation — a vector. Every college program gets the same treatment. Matching becomes measurable similarity instead of guesswork, and it improves with every new data point you add.',
  },
  {
    q: 'My athlete already gets some interest. Why would we need this?',
    a: 'Interest from the rooms that found you isn’t the same as fit with the rooms that need you. Most athletes commit inside the small slice of programs that happened to see them. The engine shows you the whole board — including better fits you’d never have known existed.',
  },
  {
    q: 'What do you need from us to start?',
    a: 'Film, transcript, basic athletic data and about an hour of onboarding. The pipeline handles the rest — every new clip and result after that feeds your vector automatically.',
  },
  {
    q: 'How fast do matches show up?',
    a: 'Your first ranked match list is generated within days of onboarding — and you’ll see a live preview of your matches on the evaluation call before you decide anything.',
  },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl bg-[#121212] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-6 text-left"
        aria-expanded={open}
      >
        <span className="text-white font-semibold">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#FF0000] shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <p className="px-6 pb-6 text-gray-400">{a}</p>}
    </div>
  );
};

const FAQ = () => (
  <Section dark>
    <div className="text-center mb-14">
      <Kicker>Before you ask</Kicker>
      <SectionTitle>The questions everyone asks</SectionTitle>
    </div>

    <motion.div {...fadeUp} className="max-w-3xl mx-auto space-y-4 mb-16">
      {faqs.map((faq) => (
        <FAQItem key={faq.q} q={faq.q} a={faq.a} />
      ))}
    </motion.div>

    <motion.div {...fadeUp} className="text-center">
      <CTAButton />
      <p className="text-gray-600 text-xs mt-6 max-w-xl mx-auto">
        Results referenced on this page reflect outcomes across the RFX platform to date.
        Recruitment outcomes depend on athletic and academic performance &mdash; no specific offer
        or scholarship is guaranteed.
      </p>
    </motion.div>
  </Section>
);

export default FAQ;
