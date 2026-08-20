import React from 'react';
import { BarChart3, Home, MessageSquare, Play, Settings, Users } from 'lucide-react';

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



/** Real app screenshot (already framed in iPhone hardware) with a colored drop-shadow. */
export function AppShot({
  src,
  alt,
  glow = 'red',
  className = '',
  width = 280,
}: {
  src: string;
  alt: string;
  glow?: 'red' | 'blue';
  className?: string;
  width?: number;
}) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width }}
      className={`rounded-[2.4rem] ${glow === 'red' ? 'shadow-drop-red' : 'shadow-drop-blue'} ${className}`}
      loading="lazy"
    />
  );
}

/** CSS MacBook shell for B2B desktop dashboards. */
export function MacBookFrame({
  children,
  glow = 'red',
  className = '',
}: {
  children: React.ReactNode;
  glow?: 'red' | 'blue';
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={`overflow-hidden rounded-t-[1.1rem] border-[6px] border-b-0 border-[#26262c] bg-ink-0 ${
          glow === 'red' ? 'shadow-drop-red' : 'shadow-drop-blue'
        }`}
      >
        {children}
      </div>
      <div className="relative mx-[-4%] h-4 rounded-b-xl bg-gradient-to-b from-[#3a3a42] to-[#1c1c22]">
        <span className="absolute left-1/2 top-0 h-1.5 w-24 -translate-x-1/2 rounded-b-md bg-[#111114]" aria-hidden="true" />
      </div>
    </div>
  );
}

const roster = [
  ['Liam Carter', 'Guard · 2027', 12, 'D1 interest'],
  ['Maya Johnson', 'Point Guard · 2026', 9, 'Committed'],
  ['Darius Cole', 'Wing · 2027', 7, 'D1 interest'],
  ['Sofia Reyes', 'Guard · 2026', 5, 'D3 interest'],
  ['Jaxsen Wirth', 'Center · 2028', 3, 'Building'],
] as const;

/** Club-director B2B view: roster-wide recruitment pipeline. */
export function ClubDashboardScreen() {
  return (
    <div className="grid grid-cols-[168px_1fr] bg-ink-0 max-md:grid-cols-1">
      <aside className="border-r border-line p-4 max-md:hidden">
        <span className="font-display text-sm font-bold text-paper-0">
          RF<span className="text-crimson-400">X</span>{' '}
          <span className="font-mono text-[8px] font-medium uppercase tracking-[0.14em] text-paper-3">Club OS</span>
        </span>
        <nav className="mt-6 space-y-1 text-xs text-paper-2">
          {['Roster', 'Recruitment', 'Revenue', 'Branding'].map((label, i) => (
            <span
              key={label}
              className={`block rounded-lg px-3 py-2 ${
                i === 0 ? 'border-l-2 border-cobalt-400 bg-ink-2 text-paper-0' : ''
              }`}
            >
              {label}
            </span>
          ))}
        </nav>
      </aside>
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-base font-semibold text-paper-0">Northside Academy</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper-3">
              Director view · 42 athletes on pathway
            </p>
          </div>
          <span className="rounded-full border border-line-blue bg-cobalt-500/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cobalt-400">
            Season report
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 max-md:grid-cols-2">
          {[
            ['Coach interest', '214', '+18%'],
            ['Offers this season', '11', '+4'],
            ['Club revenue', '$8.2k', 'MRR'],
          ].map(([label, value, delta]) => (
            <div key={label} className="rounded-xl border border-line bg-ink-2 p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">{label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-paper-0 tabular-nums">
                {value} <span className="text-[10px] font-medium text-cobalt-400">{delta}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {roster.map(([name, pos, interest, status]) => (
            <div
              key={name}
              className="grid grid-cols-[1.2fr_1fr_0.9fr_0.9fr] items-center gap-3 rounded-lg border border-line bg-ink-2/60 px-3.5 py-2.5 text-xs max-md:grid-cols-2"
            >
              <span className="font-semibold text-paper-0">{name}</span>
              <span className="text-paper-2">{pos}</span>
              <span className="font-mono tabular-nums text-paper-1">{interest} coaches</span>
              <span
                className={`justify-self-start rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] ${
                  status === 'Committed'
                    ? 'bg-crimson-500/15 text-crimson-400'
                    : 'bg-ink-3 text-paper-2'
                }`}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
