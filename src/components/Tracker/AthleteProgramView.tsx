import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ProgramCard from './ProgramCard';
import { sampleProgram } from './mockData';
import { PositionGroup, validateProgram } from './types';

// Demo harness for the single-program athlete card. The first build target of the
// International % Tracker (docs/intl-percentage-tracker-spec.md §8.6).
const AthleteProgramView: React.FC = () => {
  const [position, setPosition] = useState<PositionGroup>('FWD');

  // Numbers are the product: never render a program whose data is internally
  // inconsistent — surface the problem instead.
  const errors = validateProgram(sampleProgram);

  return (
    <div className="relative min-h-screen bg-[#08080a] flex flex-col items-center py-16 px-4 overflow-hidden">
      {/* Ambient color glows so the frosted-glass blur reads */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-[#FF0000]/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#FF0000]/12 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 w-[34rem] h-[34rem] rounded-full bg-white/[0.06] blur-[130px]" />
      </div>

      <div className="relative text-center mb-10 max-w-xl">
        <span className="text-xs uppercase tracking-widest text-[#FF0000] font-semibold">
          International % Tracker
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">Is this program worth a look — for you?</h1>
        <p className="text-gray-400 mt-3 text-sm leading-relaxed">
          Pick your position and the card re-reads the program around your spot: domestic
          opportunity, the 2-year trend, spots opening, depth, scholarship context, and level.
          Sourced and dated — a signal, never a verdict.
        </p>
      </div>
      <div className="relative">
        {errors.length > 0 ? (
          <div className="w-full max-w-xl rounded-3xl border border-[#FF0000]/40 bg-[#FF0000]/10 backdrop-blur-2xl p-6">
            <div className="flex items-center gap-2 text-[#FF0000] font-semibold mb-3">
              <AlertTriangle className="w-5 h-5" />
              Data failed integrity checks — not displayed
            </div>
            <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : (
          <ProgramCard
            program={sampleProgram}
            position={position}
            onSelectPosition={setPosition}
            sample
          />
        )}
      </div>
    </div>
  );
};

export default AthleteProgramView;
