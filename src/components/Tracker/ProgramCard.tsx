import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  Users,
  DoorOpen,
  Layers,
  DollarSign,
  Trophy,
  Info,
  ExternalLink,
  Globe2,
} from 'lucide-react';
import {
  Program,
  PositionGroup,
  Confidence,
  LookSignal,
  readPosition,
} from './types';

const POSITIONS: PositionGroup[] = ['GK', 'DEF', 'MID', 'FWD'];
const POSITION_LABEL: Record<PositionGroup, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

const SIGNAL_STYLE: Record<
  LookSignal,
  { label: string; text: string; bg: string; ring: string }
> = {
  // Palette is black/red/white only — meaning is carried by red intensity vs. white
  // opacity. Red = strong domestic opportunity (worth a look); white-dimmed = muted.
  'worth-a-look': {
    label: 'Worth a look',
    text: 'text-[#FF0000]',
    bg: 'bg-[#FF0000]/15',
    ring: 'ring-[#FF0000]/40',
  },
  mixed: {
    label: 'Mixed signal',
    text: 'text-white/80',
    bg: 'bg-white/10',
    ring: 'ring-white/20',
  },
  reach: {
    label: 'Likely a reach',
    text: 'text-white/45',
    bg: 'bg-white/[0.04]',
    ring: 'ring-white/10',
  },
};

const ConfidenceBadge: React.FC<{ level: Confidence }> = ({ level }) => {
  // Confidence is neutral metadata -> encoded as white opacity tiers.
  const map: Record<Confidence, string> = {
    high: 'text-white bg-white/10',
    medium: 'text-white/65 bg-white/5',
    low: 'text-white/40 bg-white/5',
  };
  return (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${map[level]}`}>
      {level} confidence
    </span>
  );
};

// Phase tag so the build honors the v1 / v1.1 sourcing split (§8.6, roadmap §15).
const PhaseTag: React.FC<{ phase: 'v1' | 'v1.1' }> = ({ phase }) => (
  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 border border-white/15 bg-white/5 rounded px-1.5 py-0.5">
    {phase}
  </span>
);

const Tile: React.FC<{
  icon: React.ReactNode;
  title: string;
  accent: string;
  phase?: 'v1' | 'v1.1';
  children: React.ReactNode;
}> = ({ icon, title, accent, phase, children }) => (
  <div className="bg-white/[0.04] backdrop-blur-md rounded-xl p-4 flex flex-col gap-2 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 ${accent}`}>
        {icon}
        <span className="text-xs font-medium text-gray-300">{title}</span>
      </div>
      {phase && <PhaseTag phase={phase} />}
    </div>
    {children}
  </div>
);

interface ProgramCardProps {
  program: Program;
  position: PositionGroup;
  onSelectPosition: (p: PositionGroup) => void;
  // true = illustrative numbers, not sourced. Surfaced prominently so demo data is
  // never mistaken for verified roster facts.
  sample?: boolean;
}

const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  position,
  onSelectPosition,
  sample = false,
}) => {
  const [showMethod, setShowMethod] = useState(false);
  const stat = program.positions[position];
  const read = readPosition(stat);
  const signal = SIGNAL_STYLE[read.signal];

  const rosterTrend = program.rosterIntlPct - program.rosterIntlPctPrev; // intl pp move
  const domesticBuried = read.crowded;

  const signalSentence = buildSignalSentence(program, position, read, domesticBuried);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl bg-white/[0.06] backdrop-blur-2xl rounded-3xl shadow-[0_8px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 border border-white/10 overflow-hidden"
    >
      {sample && (
        <div className="bg-[#FF0000]/12 backdrop-blur-md border-b border-[#FF0000]/30 px-6 py-2 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF0000]">
            Sample data
          </span>
          <span className="text-[11px] text-white/60">
            Illustrative shape only — not sourced roster figures.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{program.school}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {program.gender}'s Soccer · NCAA {program.division} · {program.competitiveness.conference}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Roster intl %</div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-2xl font-bold text-white">{program.rosterIntlPct}%</span>
              <TrendChip pp={rosterTrend} invert />
            </div>
            <div className="text-[11px] text-gray-500">{program.rosterSize} players</div>
          </div>
        </div>
      </div>

      {/* Position selector — the athlete picks their spot (§8.2/§8.6) */}
      <div className="px-6 pt-4">
        <div className="text-xs text-gray-500 mb-2">Viewing as a</div>
        <div className="flex gap-2">
          {POSITIONS.map((p) => {
            const active = p === position;
            return (
              <button
                key={p}
                onClick={() => onSelectPosition(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  active
                    ? 'bg-[#FF0000] text-white border-[#FF0000] shadow-[0_0_20px_rgba(255,0,0,0.35)]'
                    : 'bg-white/[0.04] backdrop-blur-md text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Worth-a-look banner — a signal, never a verdict */}
      <div className="px-6 pt-4">
        <div className={`rounded-xl p-4 ring-1 backdrop-blur-md border border-white/10 ${signal.bg} ${signal.ring}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wide ${signal.text}`}>
              {signal.label}
            </span>
            <span className="text-[11px] text-gray-500">
              for a {POSITION_LABEL[position].toLowerCase()}
            </span>
          </div>
          <p className="text-sm text-gray-200 leading-snug">{signalSentence}</p>
        </div>
      </div>

      {/* Six-dimension grid */}
      <div className="p-6 grid grid-cols-2 gap-3">
        {/* 1. Position opportunity */}
        <Tile
          icon={<Globe2 className="w-4 h-4" />}
          title="Domestic opportunity"
          accent="text-[#FF0000]/70"
          phase="v1"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {read.domestic} of {stat.resolved}
            </span>
            <span className="text-xs text-gray-400">domestic</span>
          </div>
          {read.belowGate ? (
            <span className="text-[11px] text-white/45">n/a · small sample (n&lt;4)</span>
          ) : (
            <>
              {/* Domestic opportunity = solid red (the highlight); intl = dim white */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                <div className="h-full bg-[#FF0000]" style={{ width: `${read.domesticPct}%` }} />
                <div className="h-full bg-white/20" style={{ width: `${read.intlPct}%` }} />
              </div>
              <span className="text-[11px] text-gray-500">
                {read.domesticPctLabel}% domestic · {read.intlPctLabel}% intl
                {stat.unknown > 0 && ` · ${stat.unknown} unknown`}
              </span>
            </>
          )}
        </Tile>

        {/* 2. Two-year trend */}
        <Tile
          icon={<TrendingUp className="w-4 h-4" />}
          title="2-yr trend"
          accent="text-[#FF0000]/70"
          phase="v1"
        >
          {read.trendPp === null ? (
            <span className="text-[11px] text-white/45 mt-1">
              n/a · needs two seasons above the gate
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <TrendChip pp={read.trendPp} showNumber={false} />
                <span className="text-sm text-white font-semibold">
                  {Math.abs(Math.round(read.trendPp))} pp
                </span>
              </div>
              <span className="text-[11px] text-gray-500">
                {read.trendPp >= 0 ? 'more domestic' : 'more international'} vs. last season
              </span>
            </>
          )}
        </Tile>

        {/* 3. Spots opening */}
        <Tile
          icon={<DoorOpen className="w-4 h-4" />}
          title="Spots opening"
          accent="text-[#FF0000]/70"
          phase="v1"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{read.openings}</span>
            <span className="text-xs text-gray-400">upperclassmen</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Jr/Sr/Grad at {position} — indicator, not a guarantee
          </span>
        </Tile>

        {/* 4. Depth at position */}
        <Tile
          icon={<Layers className="w-4 h-4" />}
          title="Depth at position"
          accent="text-[#FF0000]/70"
          phase="v1"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{stat.depth}</span>
            <span className="text-xs text-gray-400">carried</span>
          </div>
          <span className="text-[11px] text-gray-500">
            typical ~{stat.typicalDepth} · {read.crowded ? 'crowded' : 'room'}
          </span>
        </Tile>

        {/* 5. Scholarship context (v1.1) */}
        <Tile
          icon={<DollarSign className="w-4 h-4" />}
          title="Scholarship context"
          accent="text-[#FF0000]/70"
          phase="v1.1"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              ~{program.scholarship.equivalencyLimit}
            </span>
            <span className="text-xs text-gray-400">equiv.</span>
          </div>
          <span className="text-[11px] text-gray-500">
            {program.scholarship.isEquivalencySport ? 'Equivalency sport' : 'Headcount sport'} ·{' '}
            {program.scholarship.fullyFunded === null
              ? 'funding unknown'
              : program.scholarship.fullyFunded
              ? 'fully funded'
              : 'partially funded'}
          </span>
          <ConfidenceBadge level={program.scholarship.confidence} />
        </Tile>

        {/* 6. Competitiveness / level (v1.1) */}
        <Tile
          icon={<Trophy className="w-4 h-4" />}
          title="Competitiveness"
          accent="text-[#FF0000]/70"
          phase="v1.1"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">
              {program.competitiveness.nationalRank ? `#${program.competitiveness.nationalRank}` : '—'}
            </span>
            <span className="text-xs text-gray-400">{program.competitiveness.record}</span>
          </div>
          <span className="text-[11px] text-gray-500">
            {program.competitiveness.conference}
            {program.competitiveness.rating && ` · ${program.competitiveness.rating}`}
          </span>
          <ConfidenceBadge level={program.competitiveness.confidence} />
        </Tile>
      </div>

      {/* RFX core hand-off — personalized fit/odds stay in the core product */}
      <div className="px-6 pb-4">
        <a
          href="#"
          className="flex items-center justify-between gap-2 rounded-xl bg-[#FF0000]/10 backdrop-blur-md border border-[#FF0000]/20 hover:bg-[#FF0000]/20 transition-colors p-4 group"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#FF0000]" />
            <div>
              <div className="text-sm font-semibold text-white">Is this the right level for me?</div>
              <div className="text-[11px] text-gray-400">
                Personalized fit & odds use your rating — open in RFX
              </div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-[#FF0000] group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* Provenance / methodology footer */}
      <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02]">
        <button
          onClick={() => setShowMethod((s) => !s)}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300"
        >
          <Info className="w-3 h-3" />
          Roster data as of {program.rosterAsOf} · {program.rosterSource} · methodology{' '}
          {program.methodologyVersion}
        </button>
        {showMethod && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-[11px] text-gray-500 mt-2 leading-relaxed"
          >
            International = non-U.S. stated home country. Unknowns excluded from the denominator and
            shown separately. Position % suppressed below n&lt;4. Scholarship &amp; competitiveness
            are program-level context from secondary sources — never an individual offer. A signal,
            not a verdict.{' '}
            <a href="#" className="text-[#FF0000] hover:underline">
              Report a correction
            </a>
            .
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

const TrendChip: React.FC<{ pp: number; invert?: boolean; showNumber?: boolean }> = ({
  pp,
  invert,
  showNumber = true,
}) => {
  // invert=true: the number is an INTL pp move (header), so up = worse for domestic.
  // Palette is black/red/white: red = good for domestic (the highlight), dim white = not.
  const rounded = Math.round(pp);
  if (rounded === 0)
    return (
      <span className="flex items-center text-white/40 text-xs">
        <Minus className="w-3.5 h-3.5" />
      </span>
    );
  const goodForDomestic = invert ? rounded < 0 : rounded > 0;
  const color = goodForDomestic ? 'text-[#FF0000]' : 'text-white/45';
  const Icon = rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {showNumber && Math.abs(rounded)}
    </span>
  );
};

function buildSignalSentence(
  program: Program,
  position: PositionGroup,
  read: ReturnType<typeof readPosition>,
  crowded: boolean
): string {
  const spot = POSITION_LABEL[position].toLowerCase();
  if (read.belowGate) {
    return `Only ${program.positions[position].resolved} ${spot}s on the roster — too small a sample to read a domestic-opportunity trend. Look at the raw count and ask the coach directly.`;
  }
  const dpct = read.domesticPctLabel!;
  const dir =
    read.trendPp === null
      ? ''
      : read.trendPp >= 5
      ? ' and trending more domestic'
      : read.trendPp <= -5
      ? ' and trending more international'
      : '';
  const open = read.openings >= 3 ? ` with ${read.openings} upperclassmen likely to move on` : '';
  const depth = crowded ? ', but the position is already deep' : '';
  return `${dpct}% of resolved ${spot}s are domestic${dir}${open}${depth}. Numbers below; confirm fit in RFX.`;
}

export default ProgramCard;
