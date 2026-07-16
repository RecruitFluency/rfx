import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// Single place to point every CTA once a real booking link exists.
export const BOOKING_URL = '#book';

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55 },
};

export const Kicker = ({ children }: { children: React.ReactNode }) => (
  <motion.p
    {...fadeUp}
    className="text-[#FF0000] text-xs md:text-sm font-bold tracking-[0.3em] uppercase mb-4"
  >
    {children}
  </motion.p>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <motion.h2
    {...fadeUp}
    className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6"
  >
    {children}
  </motion.h2>
);

export const Section = ({
  id,
  dark = false,
  children,
}: {
  id?: string;
  dark?: boolean;
  children: React.ReactNode;
}) => (
  <section id={id} className={`${dark ? 'bg-black' : 'bg-[#0b0b0b]'} py-20 md:py-28`}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

export const CTAButton = ({
  children = 'Book your evaluation call',
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <a
    href={BOOKING_URL}
    className={`group inline-flex items-center gap-3 bg-[#FF0000] hover:bg-[#CC0000] text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-[0_0_40px_rgba(255,0,0,0.25)] ${className}`}
  >
    {children}
    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
  </a>
);

export const RedAccent = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gradient-to-r from-[#FF0000] to-[#990000] bg-clip-text text-transparent">
    {children}
  </span>
);
