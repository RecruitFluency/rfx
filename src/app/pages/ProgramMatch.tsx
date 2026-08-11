import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, MapPin, GraduationCap, Target, Database } from 'lucide-react';
import { PageHeader, Card } from '../components/ui';
import { PlainEnglish } from '../components/PlainEnglish';
import { isConfigured } from '../../lib/supabase';
import { runMatch, PROMPT_STARTERS, MatchResult } from '../../lib/programMatch';

const FIT_STYLE: Record<string, string> = {
  'Strong fit': 'bg-volt text-black',
  'Solid fit': 'bg-volt/20 text-volt border border-volt/40',
  'Worth a look': 'bg-matte2 text-gray-300 border border-white/[0.08]',
};

export default function ProgramMatch() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(text?: string) {
    const q = (text ?? prompt).trim();
    if (!q || busy) return;
    if (text) setPrompt(text);
    setBusy(true);
    try {
      // Small delay so the "reading" state is legible; the work itself is instant.
      const r = await runMatch(q);
      setResult(r);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } finally {
      setBusy(false);
    }
  }

  const c = result?.criteria;

  return (
    <div>
      <PageHeader
        title="Program Match"
        subtitle="Describe a student-athlete in plain English — region, academics, position, assets, the degree they want — and syncmob tells you which college programs are recruiting that player."
      />

      {/* Prompt console */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-3 font-mono text-[11px] uppercase tracking-widest text-volt">
          <Sparkles className="w-4 h-4" /> Ask in plain English
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
          rows={3}
          placeholder="e.g. Find me a college program on the eastern seaboard with an opening for an incoming right back — 5'10&quot;, right-footed — with a 3.2 GPA, 1200 SAT, 32 ACT, who wants a business degree on a rural campus."
          className="w-full bg-black border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-volt/60 resize-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <div className="text-xs text-gray-600">Press ⌘/Ctrl + Enter to run</div>
          <button
            onClick={() => run()}
            disabled={busy || !prompt.trim()}
            className="inline-flex items-center gap-2 bg-volt hover:bg-volt/80 disabled:opacity-40 text-black font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            {busy ? 'Reading your request…' : 'Find matching programs'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Prompt starters */}
      {!result && (
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-mono">
            Not sure how to phrase it? Start from one of these
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {PROMPT_STARTERS.map((s) => (
              <button
                key={s.label}
                onClick={() => run(s.prompt)}
                className="text-left bg-matte border border-white/[0.08] hover:border-volt/50 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-1.5">
                  <Target className="w-4 h-4 text-volt shrink-0" /> {s.label}
                </div>
                <div className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400">{s.prompt}</div>
              </button>
            ))}
          </div>
          {!isConfigured && (
            <p className="text-xs text-gray-600 mt-4 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Matching runs on syncmob's reference program set now; once your live database is connected, real programs from your directory are folded in automatically.
            </p>
          )}
        </div>
      )}

      {/* Result */}
      {result && c && (
        <div ref={resultRef} className="space-y-6">
          {/* What syncmob understood */}
          <div className="flex flex-wrap gap-2">
            {[
              c.region ? { icon: MapPin, v: c.region.label } : c.states.length ? { icon: MapPin, v: c.states.join(', ') } : null,
              c.division ? { icon: Target, v: c.division } : null,
              c.position ? { icon: Target, v: c.position } : null,
              c.gpa ? { icon: GraduationCap, v: `${c.gpa.toFixed(2)} GPA` } : null,
              c.sat ? { icon: GraduationCap, v: `${c.sat} SAT` } : null,
              c.act ? { icon: GraduationCap, v: `${c.act} ACT` } : null,
              c.degree ? { icon: GraduationCap, v: c.degree } : null,
              c.campus ? { icon: MapPin, v: `${c.campus} campus` } : null,
              c.height ? { icon: Target, v: c.height } : null,
              c.foot ? { icon: Target, v: `${c.foot}-footed` } : null,
            ]
              .filter(Boolean)
              .map((chip, i) => {
                const Icon = chip!.icon;
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-matte2 border border-white/[0.08] rounded-full px-3 py-1 text-xs text-gray-300">
                    <Icon className="w-3 h-3 text-volt" /> {chip!.v}
                  </span>
                );
              })}
          </div>

          {/* Plain-English headline */}
          <PlainEnglish label="syncmob briefing">
            {result.headline}
          </PlainEnglish>

          {/* Matched programs */}
          {result.matches.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Programs recruiting this profile</h2>
              <div className="space-y-3">
                {result.matches.map((m) => (
                  <Card key={m.school} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="font-display text-lg font-semibold text-white">
                        {m.school} <span className="text-gray-500 text-sm font-sans font-normal">· {m.state} · {m.division}</span>
                      </div>
                      <span className={`text-xs font-medium rounded-full px-3 py-1 ${FIT_STYLE[m.fit]}`}>{m.fit}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{m.sentence}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Live database cross-reference */}
          {result.databaseNote && (
            <Card className="p-5 border-volt/20">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-white">
                <Database className="w-4 h-4 text-volt" /> From your live database
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{result.databaseNote}</p>
              <Link to="/app/programs" className="inline-flex items-center gap-1.5 text-sm text-volt hover:text-white mt-3">
                Open Program Directory <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          )}

          {/* Next steps */}
          {result.nextSteps.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold mb-3">Recommended next steps</h2>
              <ol className="space-y-2.5">
                {result.nextSteps.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="font-mono text-xs text-volt mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <button
            onClick={() => { setResult(null); setPrompt(''); }}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            ← Start a new search
          </button>
        </div>
      )}
    </div>
  );
}
