import React from 'react';
import { Search, Users, ChevronDown, LayoutGrid, Filter } from 'lucide-react';

type Card = { name: string; meta: string; coach: string; program: string; active?: boolean };

const COLUMNS: Array<{ stage: string; count: number; dot: string; cards: Card[] }> = [
  {
    stage: 'IDENTIFIED', count: 18, dot: '#8a8a93',
    cards: [
      { name: 'Elliot Ramos', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
      { name: 'James Stevenson', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
      { name: 'Leo Martins', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
    ],
  },
  {
    stage: 'CONTACTED', count: 18, dot: '#3d5afe',
    cards: [
      { name: 'James Stevenson', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
      { name: 'Leo Martins', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham', active: true },
    ],
  },
  {
    stage: 'ENGAGED', count: 18, dot: '#8b5cf6',
    cards: [
      { name: 'Leo Martins', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
    ],
  },
  {
    stage: 'EVALUATING', count: 18, dot: '#f0a020',
    cards: [
      { name: 'Elliot Ramos', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
      { name: 'James Stevenson', meta: 'Striker (ST) · 2028', coach: 'M. Jennings', program: 'University of Alabama – Birmingham' },
    ],
  },
];

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((n) => n[0]).join('');
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-ink-3 font-semibold text-paper-2 ring-1 ring-white/10 ${
        size === 'sm' ? 'h-3.5 w-3.5 text-[5px]' : 'h-5 w-5 text-[7px]'
      }`}
    >
      {initials}
    </span>
  );
}

/** Player Pipeline — kanban board of the club's recruitment stages. */
export default function PlayerPipeline() {
  return (
    <div className="flex bg-ink-0 text-[11px] text-paper-1">
      <aside className="hidden w-[118px] shrink-0 border-r border-line p-2.5 md:block">
        <span className="font-display text-[11px] font-bold text-paper-0">
          RF<span className="text-crimson-400">X</span>
        </span>
        <p className="mt-2 text-[6px] uppercase tracking-[0.14em] text-paper-3">Your club</p>
        <p className="text-[8px] font-semibold text-paper-0">Riverside Club</p>
        <nav className="mt-3 space-y-px">
          {['Club Health', 'Player Pipeline', 'Opportunities', 'Coach Engagement', 'Commitments'].map((l) => (
            <span
              key={l}
              className={`block rounded px-2 py-[5px] text-[8px] ${
                l === 'Player Pipeline'
                  ? 'border-r-2 border-crimson-500 bg-ink-2 text-paper-0'
                  : 'text-paper-2'
              }`}
            >
              {l}
            </span>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-paper-0" strokeWidth={1.8} aria-hidden="true" />
          <h4 className="text-[14px] font-bold text-paper-0">Player Pipeline</h4>
        </div>
        <p className="mt-0.5 text-[7.5px] text-paper-3">Track and manage players through the recruitment process.</p>

        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex flex-1 items-center gap-1 rounded border border-line bg-ink-2 px-2 py-1 text-[7px] text-paper-3">
            <Search className="h-2.5 w-2.5" aria-hidden="true" /> Search players…
          </span>
          {['All years', 'All positions', 'All divisions'].map((f) => (
            <span key={f} className="flex items-center gap-1 rounded border border-line bg-ink-2 px-2 py-1 text-[7px] text-paper-2">
              {f} <ChevronDown className="h-2 w-2" aria-hidden="true" />
            </span>
          ))}
          <span className="ml-auto flex overflow-hidden rounded border border-line-red">
            <span className="flex items-center gap-1 bg-crimson-500/15 px-2 py-1 text-[7px] font-semibold text-crimson-400">
              <LayoutGrid className="h-2 w-2" aria-hidden="true" /> Kanban
            </span>
            <span className="flex items-center gap-1 px-2 py-1 text-[7px] text-paper-3">
              <Filter className="h-2 w-2" aria-hidden="true" /> Funnel
            </span>
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {COLUMNS.map(({ stage, count, dot, cards }) => (
            <div key={stage} className="rounded-md border border-line bg-ink-1/60 p-1.5">
              <div className="flex items-center gap-1 px-0.5 pb-1.5">
                <span className="h-1 w-1 rounded-full" style={{ background: dot }} aria-hidden="true" />
                <span className="text-[6.5px] font-bold uppercase tracking-[0.1em] text-paper-1">{stage}</span>
                <span className="ml-auto text-[6.5px] text-paper-3">{count}</span>
              </div>
              <div className="space-y-1.5">
                {cards.map((c, i) => (
                  <div
                    key={c.name + i}
                    className={`rounded border bg-ink-2 p-1.5 ${
                      c.active ? 'border-crimson-500' : 'border-line'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Avatar name={c.name} />
                      <span className="min-w-0">
                        <span className="block truncate text-[8px] font-semibold text-paper-0">{c.name}</span>
                        <span className="block truncate text-[5.5px] text-paper-3">{c.meta}</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[5.5px] uppercase tracking-[0.1em] text-paper-3">Recruiting coach</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Avatar name={c.coach} size="sm" />
                      <span className="truncate text-[7px] text-paper-1">{c.coach}</span>
                    </div>
                    <p className="mt-1.5 text-[5.5px] uppercase tracking-[0.1em] text-paper-3">Program</p>
                    <p className="truncate text-[7px] text-paper-1">{c.program}</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      {[['GPA', '3.83'], ['Accept', '78.9'], ['Cost', '$39k']].map(([k, v]) => (
                        <span key={k} className="rounded-sm bg-ink-3 px-1 py-0.5">
                          <span className="block text-[5px] text-paper-3">{k}</span>
                          <span className="block text-[7px] font-semibold text-paper-0">{v}</span>
                        </span>
                      ))}
                    </div>
                    {c.active && (
                      <div className="mt-1.5 flex items-center justify-between border-t border-line-red pt-1 text-[6.5px]">
                        <span className="text-crimson-400">Moving…</span>
                        <span className="text-paper-3">Undo</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
