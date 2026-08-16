import React from 'react';
import { motion } from 'framer-motion';

// Single place to point every CTA once a real booking link exists.
export const BOOKING_URL = '#cta';

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

// Word-by-word headline reveal, like the reference video's hero text.
export const WordReveal = ({
  text,
  className = '',
  delay = 0,
  as: Tag = 'span',
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: 'span' | 'h1' | 'h2' | 'p';
}) => {
  const words = text.split(' ');
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: delay + i * 0.09, ease: 'easeOut' }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  );
};

export const Badge = ({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) => (
  <motion.span
    {...fadeUp}
    className={`inline-block text-xs font-semibold tracking-wide rounded-full px-4 py-1.5 border ${
      light
        ? 'text-gray-600 border-gray-300 bg-white'
        : 'text-gray-300 border-white/15 bg-white/5'
    }`}
  >
    {children}
  </motion.span>
);

export const PillCTA = ({
  children = 'Book Your Evaluation',
  dark = false,
  className = '',
}: {
  children?: React.ReactNode;
  dark?: boolean;
  className?: string;
}) => (
  <a
    href={BOOKING_URL}
    className={`group inline-flex items-center gap-2.5 rounded-full font-semibold text-sm px-6 py-3 transition-all ${
      dark
        ? 'bg-[#121212] text-white hover:bg-black border border-white/10'
        : 'bg-white text-black hover:bg-gray-100 shadow-[0_0_30px_rgba(255,0,0,0.15)]'
    } ${className}`}
  >
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#FF0000]">
      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="currentColor">
        <path d="M3.5 2l6 4-6 4V2z" />
      </svg>
    </span>
    {children}
  </a>
);

// Deterministic floating accent dots (no Math.random — stable across renders).
const DOT_POSITIONS = [
  { top: '12%', left: '7%', size: 7 },
  { top: '30%', left: '15%', size: 5 },
  { top: '68%', left: '9%', size: 8 },
  { top: '85%', left: '20%', size: 5 },
  { top: '15%', left: '88%', size: 6 },
  { top: '38%', left: '93%', size: 8 },
  { top: '70%', left: '90%', size: 5 },
  { top: '88%', left: '80%', size: 7 },
  { top: '8%', left: '45%', size: 5 },
  { top: '92%', left: '55%', size: 6 },
];

export const FloatingDots = ({ color = '#FF0000', opacity = 0.5 }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
    {DOT_POSITIONS.map((d, i) => (
      <motion.span
        key={i}
        className="absolute rounded-full"
        style={{
          top: d.top,
          left: d.left,
          width: d.size,
          height: d.size,
          backgroundColor: color,
          opacity,
        }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3 + (i % 4), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
      />
    ))}
  </div>
);
