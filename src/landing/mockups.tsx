import React from 'react';
import { BarChart3, Home, MessageSquare, Play, Search, Settings, Users } from 'lucide-react';

/** Phone shell with a heavy colored drop-shadow. glow: 'red' | 'blue'. */
export function PhoneFrame({
  children,
  glow = 'red',
  className = '',
}: {
  children: React.ReactNode;
  glow?: 'red' | 'blue';
  className?: string;
}) {
  return (
    <div
      className={`w-[280px] rounded-[2.4rem] border border-line-2 bg-ink-1 p-2.5 ${
        glow === 'red' ? 'shadow-drop-red' : 'shadow-drop-blue'
      } ${className}`}
    >
      <div className="overflow-hidden rounded-[1.9rem] border border-line bg-ink-0">
        <div className="flex justify-center pt-2.5">
          <span className="h-5 w-24 rounded-full bg-ink-3" aria-hidden="true" />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Browser-chromed shell for desktop dashboard mockups. */
export function BrowserFrame({
  children,
  glow = 'red',
  className = '',
}: {
  children: React.ReactNode;
  glow?: 'red' | 'blue';
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-banner border border-line-2 bg-ink-1 ${
        glow === 'red' ? 'shadow-drop-red' : 'shadow-drop-blue'
      } ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-ink-2 px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-crimson-500/80" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-paper-3/60" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-paper-3/30" aria-hidden="true" />
        <span className="ml-4 flex-1 rounded-md bg-ink-3 px-3 py-1 font-mono text-[10px] text-paper-3">
          app.rfx.team/athlete/liam-carter
        </span>
      </div>
      {children}
    </div>
  );
}

const rows = [
  ['Vertical jump', '96 cm', 92],
  ['Points per game', '21.4', 82],
  ['Field goal %', '54%', 54],
  ['Assists per game', '6.8', 68],
] as const;

/** Full dashboard screen — athlete profile with stats table. */
export function DashboardScreen() {
  return (
    <div className="grid grid-cols-[180px_1fr] bg-ink-0 max-md:grid-cols-1">
      <aside className="border-r border-line p-4 max-md:hidden">
        <span className="font-display text-sm font-bold text-paper-0">
          RF<span className="text-crimson-400">X</span>
        </span>
        <nav className="mt-6 space-y-1 text-xs text-paper-2">
          {[
            ['Dashboard', Home, true],
            ['Athletes', Users, false],
            ['Metrics', BarChart3, false],
            ['Messages', MessageSquare, false],
            ['Settings', Settings, false],
          ].map(([label, Icon, active]) => (
            <span
              key={label as string}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                active ? 'border-l-2 border-crimson-500 bg-ink-2 text-paper-0' : ''
              }`}
            >
              {React.createElement(Icon as React.ElementType, { className: 'h-3.5 w-3.5' })}
              {label as string}
            </span>
          ))}
        </nav>
      </aside>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-crimson-500 to-crimson-900 font-display text-sm font-bold text-white">
              LC
            </span>
            <div>
              <p className="font-display text-base font-semibold text-paper-0">Liam Carter</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper-3">
                Guard · Class of 2027 · Verified
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-line-red bg-crimson-500/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-crimson-400">
            <Play className="h-3 w-3 fill-current" aria-hidden="true" /> Highlight reel
          </span>
        </div>
        <div className="mt-6 space-y-3">
          {rows.map(([label, value, pct]) => (
            <div key={label} className="grid grid-cols-[110px_1fr_64px] items-center gap-4 text-xs">
              <span className="text-paper-2">{label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-ink-3">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-crimson-700 to-crimson-400"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-right font-mono tabular-nums text-paper-0">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 max-md:grid-cols-2">
          {[
            ['Coach views', '128', '+34%'],
            ['Program matches', '17', '+5'],
            ['Messages', '9', '3 new'],
          ].map(([label, value, delta]) => (
            <div key={label} className="rounded-xl border border-line bg-ink-2 p-3.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">{label}</p>
              <p className="mt-1.5 font-display text-xl font-semibold text-paper-0 tabular-nums">
                {value} <span className="text-[10px] font-medium text-crimson-400">{delta}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Phone screen: athlete profile builder. */
export function ProfilePhoneScreen() {
  return (
    <div className="space-y-3 p-4 pb-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-bold text-paper-0">
          RF<span className="text-crimson-400">X</span>
        </span>
        <Search className="h-3.5 w-3.5 text-paper-3" aria-hidden="true" />
      </div>
      <div className="rounded-xl border border-line bg-ink-2 p-3.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">
          Assistance &amp; Experts
        </p>
        <p className="mt-1 text-xs text-paper-1">Your profile is 84% complete</p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-3">
          <span className="block h-full w-[84%] rounded-full bg-gradient-to-r from-crimson-700 to-crimson-400" />
        </div>
      </div>
      <div className="rounded-xl border border-line-red bg-gradient-to-br from-crimson-500/15 to-transparent p-3.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">Highlight Reel</p>
        <div className="mt-2.5 flex aspect-video items-center justify-center rounded-lg bg-ink-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-crimson-500 shadow-glow-red">
            <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
          </span>
        </div>
        <span className="mt-3 block rounded-full bg-crimson-500 py-2 text-center text-[11px] font-semibold text-white shadow-glow-red">
          Upload new clip
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['Speed', 'Vision', 'Shooting', 'Defense'].map((t) => (
          <span key={t} className="rounded-full border border-line-2 px-2.5 py-1 text-[9px] text-paper-2">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Phone screen: coach messaging thread. */
export function MessagesPhoneScreen() {
  return (
    <div className="space-y-3 p-4 pb-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cobalt-500 to-cobalt-700 font-display text-[10px] font-bold text-white">
          DM
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-paper-0">Coach D. Moreno</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-paper-3">
            Westlake University · D1
          </p>
        </div>
      </div>
      {[
        ['Saw your reel — that fourth-quarter stepback is exactly what we need.', false],
        ['Thank you coach! Happy to share my full match footage.', true],
        ['Do that. And let’s set up a call this week with our staff.', false],
      ].map(([text, mine], i) => (
        <p
          key={i}
          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed ${
            mine
              ? 'ml-auto rounded-br-md bg-crimson-500 text-white'
              : 'rounded-bl-md border border-line bg-ink-2 text-paper-1'
          }`}
        >
          {text as string}
        </p>
      ))}
      <div className="flex items-center gap-2 rounded-full border border-line-2 bg-ink-2 px-3.5 py-2">
        <span className="flex-1 text-[10px] text-paper-3">Message…</span>
        <span className="h-6 w-6 rounded-full bg-crimson-500 shadow-glow-red" aria-hidden="true" />
      </div>
    </div>
  );
}
