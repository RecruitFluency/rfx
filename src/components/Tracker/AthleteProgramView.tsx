import React, { useState } from 'react';
import ProgramCard from './ProgramCard';
import { sampleProgram } from './mockData';
import { PositionGroup } from './types';

// Demo harness for the single-program athlete card. The first build target of the
// International % Tracker (docs/intl-percentage-tracker-spec.md §8.6).
const AthleteProgramView: React.FC = () => {
  const [position, setPosition] = useState<PositionGroup>('FWD');

  return (
    <div className="min-h-screen bg-[#1f1f1f] flex flex-col items-center py-16 px-4">
      <div className="text-center mb-10 max-w-xl">
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
      <ProgramCard program={sampleProgram} position={position} onSelectPosition={setPosition} />
    </div>
  );
};

export default AthleteProgramView;
