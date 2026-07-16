import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';
import { Section, Kicker, SectionTitle, fadeUp } from './ui';

type Cell = 'yes' | 'no' | 'partial';

const columns = ['RFX Engine', 'Recruiting service', 'DIY', 'Club coach', 'Camps & showcases'];

const rows: { label: string; cells: Cell[] }[] = [
  { label: 'Sees every program in the nation', cells: ['yes', 'no', 'no', 'no', 'no'] },
  { label: 'Knows roster needs before they’re posted', cells: ['yes', 'no', 'no', 'partial', 'no'] },
  { label: 'Works every week without you', cells: ['yes', 'partial', 'no', 'no', 'no'] },
  { label: 'Improves with every new data point', cells: ['yes', 'no', 'no', 'no', 'no'] },
  { label: 'Matches on fit, not on who answers email', cells: ['yes', 'no', 'partial', 'partial', 'no'] },
  { label: 'You own your data and relationships', cells: ['yes', 'no', 'yes', 'partial', 'no'] },
];

const CellIcon = ({ value }: { value: Cell }) => {
  if (value === 'yes') return <Check className="w-5 h-5 text-[#FF0000] mx-auto" />;
  if (value === 'partial') return <Minus className="w-5 h-5 text-gray-500 mx-auto" />;
  return <X className="w-5 h-5 text-gray-700 mx-auto" />;
};

const Comparison = () => (
  <Section dark>
    <div className="text-center mb-14">
      <Kicker>Own vs rent</Kicker>
      <SectionTitle>
        Own the machine &mdash; don&rsquo;t rent a slice of one
      </SectionTitle>
    </div>

    <motion.div {...fadeUp} className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[720px] text-left bg-[#0b0b0b]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-4 text-gray-400 text-sm font-medium" />
            {columns.map((c, i) => (
              <th
                key={c}
                className={`p-4 text-sm font-bold text-center ${
                  i === 0
                    ? 'text-white bg-gradient-to-b from-[#2a0000] to-transparent border-x border-[#FF0000]/30'
                    : 'text-gray-400'
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-white/5 last:border-0">
              <td className="p-4 text-gray-300 text-sm">{row.label}</td>
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  className={`p-4 text-center ${
                    i === 0 ? 'bg-[#2a0000]/40 border-x border-[#FF0000]/30' : ''
                  }`}
                >
                  <CellIcon value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>

    <motion.p {...fadeUp} className="text-center text-gray-500 text-sm mt-6">
      Services rent you their effort. RFX installs an engine you own.
    </motion.p>
  </Section>
);

export default Comparison;
