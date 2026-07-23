import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Radar, Gauge, Brain, ShieldCheck, TrendingUp, Target,
  Bookmark, BookmarkCheck, Film, Sparkles,
} from 'lucide-react';
import {
  DEMO_PROSPECTS, DEMO_CONTEXT, generateBriefing,
  type Lens, type Feasibility, type Prospect,
} from '../../lib/briefing';

const LENSES: { key: Lens; label: string }[] = [
  { key: 'college', label: 'College' },
  { key: 'club', label: 'Club' },
  { key: 'pro', label: 'Pro' },
];

const FEASIBILITY_STYLE: Record<Feasibility, { label: string; cls: string }> = {
  feasible: { label: 'Coachable', cls: 'bg-green-900/40 text-green-400 border-green-800' },
  stretch: { label: 'Stretch', cls: 'bg-amber-900/40 text-amber-400 border-amber-800' },
  longshot: { label: 'Long shot', cls: 'bg-red-900/40 text-red-400 border-red-800' },
};

function scoreColor(score: number): string {
  if (score >= 90) return 'text-[#FF0000]';
  if (score >= 80) return 'text-[#FF6666]';
  return 'text-gray-200';
}

export default function Briefing() {
  const [selectedId, setSelectedId] = useState(DEMO_PROSPECTS[0].id);
  const [lens, setLens] = useState<Lens>('college');
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const prospect = useMemo(
    () => DEMO_PROSPECTS.find((p) => p.id === selectedId) ?? DEMO_PROSPECTS[0],
    [selectedId],
  );
  const briefing = useMemo(() => generateBriefing(prospect, DEMO_CONTEXT, lens), [prospect, lens]);

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF0000]" /> AI Briefing
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Every score, written out in plain English — how spot-on a player is for{' '}
            <span className="text-gray-200">{DEMO_CONTEXT.scheme}</span>, what they'd need to work on, and your next move.
          </p>
        </div>
        {/* Audience lens toggle */}
        <div className="inline-flex rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-1">
          {LENSES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLens(l.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                lens === l.key ? 'bg-[#FF0000] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-mono uppercase tracking-wider mb-5 border border-[#2a2a2a] bg-[#141414] rounded-lg px-4 py-2.5">
        <span className="text-[#FF6666]">&gt; Target</span>
        <span className="text-gray-300">{DEMO_CONTEXT.need}</span>
        <span className="text-gray-700">|</span>
        <span>{DEMO_CONTEXT.level} · {DEMO_CONTEXT.coachStyle}</span>
        <span className="text-gray-700">|</span>
        <span>Matches <span className="text-white">{DEMO_PROSPECTS.length}</span></span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6">
        {/* LEFT — Relational Feed */}
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">Relational feed</h2>
          <div className="space-y-3">
            {DEMO_PROSPECTS.map((p) => (
              <FeedCard key={p.id} p={p} active={p.id === selectedId} onClick={() => setSelectedId(p.id)} />
            ))}
          </div>
          <p className="text-[11px] text-gray-600 mt-4 leading-relaxed">
            Sample prospects powered by the on-device briefing engine. Live vector-database matches drop into this
            same feed once the backend is connected.
          </p>
        </div>

        {/* RIGHT — Relational Briefing */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 lg:p-8 border-b border-[#2a2a2a]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#FF6666] flex items-center gap-1.5 mb-2">
                  <Radar className="w-3.5 h-3.5" /> RFX Relational Briefing
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  {prospect.firstName} {prospect.lastName}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {prospect.club} ({prospect.league}) · {prospect.location} · Class of '{String(prospect.gradYear).slice(2)}
                </p>
              </div>
              <div className="text-center shrink-0">
                <div className={`text-5xl font-bold ${scoreColor(prospect.syncScore)}`}>{prospect.syncScore}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mt-1">Match</div>
              </div>
            </div>

            {/* Verdict */}
            <div className="mt-5 flex items-start gap-3 bg-[#FF0000]/5 border border-[#FF0000]/30 rounded-lg px-4 py-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF6666] shrink-0 mt-1">
                {briefing.matchBand}
              </span>
              <p className="text-gray-100 text-sm leading-relaxed">{briefing.verdict}</p>
            </div>
          </div>

          {/* Vector sections */}
          <div className="p-6 lg:p-8 space-y-8">
            {briefing.sections.map((s, i) => (
              <section key={s.title}>
                <SectionHeader title={s.title} index={i} lens={lens} />
                <p className="text-gray-400 text-sm leading-relaxed">{s.body}</p>
                {i === 0 && <TacticalStats prospect={prospect} />}
              </section>
            ))}

            {/* Development gaps */}
            <section>
              <SectionHeader title="What he'd need to work on" icon={<Target className="w-3.5 h-3.5" />} />
              <div className="space-y-2.5">
                {briefing.gaps.map((g) => {
                  const style = FEASIBILITY_STYLE[g.feasibility];
                  return (
                    <div key={g.area} className="border border-[#2a2a2a] bg-[#141414] rounded-lg p-3.5">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-white text-sm font-medium">{g.area}</span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${style.cls}`}>
                          {style.label} · {g.horizon}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Now: {g.current} <span className="text-gray-700">→</span> Needs: {g.target}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Next steps */}
            <section>
              <SectionHeader title="Recommended next move" icon={<TrendingUp className="w-3.5 h-3.5" />} />
              <ol className="space-y-2">
                {briefing.nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#FF0000]/15 text-[#FF6666] text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Bottom line */}
            <div className="flex items-start gap-3 bg-[#141414] border-l-2 border-[#FF0000] rounded-r-lg px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-[#FF6666] shrink-0 mt-0.5" />
              <p className="text-gray-200 text-sm leading-relaxed">
                <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500 block mb-1">Bottom line</span>
                {briefing.bottomLine}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 lg:p-8 pt-0 flex flex-col sm:flex-row gap-3">
            <button className="flex-1 inline-flex items-center justify-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">
              <Film className="w-4 h-4" /> Request film packet
            </button>
            <button
              onClick={() => setSaved((s) => ({ ...s, [prospect.id]: !s[prospect.id] }))}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[#2a2a2a] hover:border-[#FF0000]/50 text-gray-200 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {saved[prospect.id] ? (
                <><BookmarkCheck className="w-4 h-4 text-[#FF6666]" /> Saved to roster</>
              ) : (
                <><Bookmark className="w-4 h-4" /> Save to roster</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedCard({ p, active, onClick }: { p: Prospect; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${
        active
          ? 'border-[#FF0000] bg-[#FF0000]/5'
          : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#FF0000]/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-bold tracking-tight truncate ${active ? 'text-white' : 'text-gray-200'}`}>
            {p.firstName} {p.lastName}
          </h3>
          <p className="text-[11px] font-mono uppercase tracking-wide text-gray-500 mt-0.5">
            Class of '{String(p.gradYear).slice(2)} · {p.position}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${active ? scoreColor(p.syncScore) : 'text-gray-300'}`}>{p.syncScore}</div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600">Match</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {p.tacticalTags.map((t) => (
          <span key={t} className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-[#2a2a2a] text-gray-500 bg-black/40">
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}

function SectionHeader({ title, index, lens, icon }: { title: string; index?: number; lens?: Lens; icon?: ReactNode }) {
  const resolved =
    icon ??
    (index === 0 ? <Gauge className="w-3.5 h-3.5" /> :
     index === 1 ? <Brain className="w-3.5 h-3.5" /> :
     index === 2 ? <ShieldCheck className="w-3.5 h-3.5" /> :
     <TrendingUp className="w-3.5 h-3.5" />);
  void lens;
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-[#FF6666]">{resolved}</span>
      <h3 className="text-xs font-mono uppercase tracking-widest text-white">{title}</h3>
      <div className="h-px flex-1 bg-[#2a2a2a]" />
    </div>
  );
}

function TacticalStats({ prospect }: { prospect: Prospect }) {
  const stats = [
    { value: `${prospect.schemeFit}%`, label: 'Scheme fit', accent: prospect.schemeFit >= 85 },
    { value: `${prospect.avgCoverageKm}km`, label: 'Avg coverage', accent: false },
    { value: prospect.transitionTier, label: 'Transition', accent: prospect.transitionTier === 'T-1' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mt-4 border border-[#2a2a2a] bg-[#141414] rounded-lg p-4">
      {stats.map((s) => (
        <div key={s.label}>
          <div className={`text-lg font-bold ${s.accent ? 'text-[#FF6666]' : 'text-white'}`}>{s.value}</div>
          <div className="text-[10px] font-mono uppercase tracking-wide text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
