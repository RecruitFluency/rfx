import React from 'react';
import {
  BarChart3, Building2, Eye, FileText, GraduationCap, Heart, LayoutGrid,
  LogOut, Settings, AlertTriangle, Trophy, Users, Filter,
} from 'lucide-react';

/**
 * Club-brand skin. Every value is a raw CSS color so one dashboard component
 * can be re-skinned entirely through inline custom properties — this is what
 * demonstrates the white-label pitch instead of merely asserting it.
 */
export type ClubSkin = {
  id: string;
  name: string;
  mark: string;
  page: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  line2: string;
  crest: string;
  crestText: string;
};

export const CLUB_SKINS: ClubSkin[] = [
  {
    id: 'midnight', name: 'Riverside Academy', mark: 'RA',
    page: '#0a0a0b', surface: '#141416', surfaceAlt: '#0f0f11', border: 'rgba(255,255,255,0.08)',
    text: '#f5f5f3', muted: '#8a8a93', accent: '#e5192c', accentText: '#ffffff',
    line2: '#ffffff', crest: '#1c1c22', crestText: '#e5192c',
  },
  {
    id: 'harbor', name: 'Harbor City FC', mark: 'HC',
    page: '#8ac7f0', surface: '#101f45', surfaceAlt: '#0d1936', border: 'rgba(255,255,255,0.10)',
    text: '#ffffff', muted: '#9fb2d4', accent: '#f26522', accentText: '#ffffff',
    line2: '#ffffff', crest: '#0d1936', crestText: '#f26522',
  },
  {
    id: 'goldenrod', name: 'Northside United', mark: 'NU',
    page: '#fee12b', surface: '#141416', surfaceAlt: '#0f0f11', border: 'rgba(255,255,255,0.10)',
    text: '#ffffff', muted: '#9a9aa2', accent: '#fee12b', accentText: '#141416',
    line2: '#ffffff', crest: '#0f0f11', crestText: '#fee12b',
  },
  {
    id: 'ivory', name: 'Summit Athletic', mark: 'SA',
    page: '#eef1f6', surface: '#ffffff', surfaceAlt: '#dfe4ec', border: 'rgba(18,38,75,0.12)',
    text: '#12264b', muted: '#5c6b88', accent: '#d6202f', accentText: '#ffffff',
    line2: '#12264b', crest: '#12264b', crestText: '#ffffff',
  },
  {
    id: 'coastal', name: 'Coastal FC Academy', mark: 'CF',
    page: '#0a0a0b', surface: '#141416', surfaceAlt: '#0f0f11', border: 'rgba(255,255,255,0.08)',
    text: '#ffffff', muted: '#8a8a93', accent: '#f7b5cd', accentText: '#141416',
    line2: '#ffffff', crest: '#1c1c22', crestText: '#f7b5cd',
  },
];

const NAV: Array<[string, React.ElementType, string?]> = [
  ['OVERVIEW', LayoutGrid, 'label'],
  ['Club Health', LayoutGrid],
  ['Player Pipeline', Users],
  ['Opportunities', AlertTriangle],
  ['ANALYTICS', BarChart3, 'label'],
  ['Coach Engagement', GraduationCap],
  ['Recruiting Funnel', Filter],
  ['Commitments', Trophy],
  ['RESEARCH', Building2, 'label'],
  ['Program Research', Building2],
  ['REPORTS', FileText, 'label'],
  ['Reports & Export', FileText],
  ['SETTINGS', Settings, 'label'],
  ['Club Settings', Settings],
];

const KPIS: Array<[string, string, string, React.ElementType]> = [
  ['ACTIVE ATHLETES', '23', 'in recruiting', Users],
  ['PROFILE VIEWS', '136', 'last 7 days', Eye],
  ['COACH INTERESTS', '28', '15 positive', Heart],
  ['PROGRAMS ENGAGING', '56', 'unique schools', Building2],
];

const RATES: Array<[string, string, string, number]> = [
  ['RESPONSE RATE', '21%', 'views → responses', 21],
  ['POSITIVE INTEREST RATE', '54%', 'responses → interest', 54],
  ['AVG INTERESTS / ATHLETE', '1.2', 'engagement score', 12],
];

const PIPELINE: Array<[string, number, string]> = [
  ['In recruiting', 100, '24'],
  ['Profile viewed', 79, '19  5 stuck'],
  ['Coach interest', 62, '15  5 stuck'],
  ['Positive interest', 62, '15  4 stuck'],
];

/** Smooth line path through evenly spaced values, normalised to the viewBox. */
function linePath(values: number[], w: number, h: number, max: number) {
  const step = w / (values.length - 1);
  return values
    .map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(' ');
}

/** Club Health Overview — the screen used for the white-label demo. */
export default function ClubHealth({ skin }: { skin: ClubSkin }) {
  const views = [21, 19, 23, 13, 16, 22, 20, 4];
  const interests = [2, 5, 5, 5, 4, 3, 2, 4];

  return (
    <div
      className="flex text-[11px]"
      style={{ background: skin.page, color: skin.text, fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* sidebar */}
      <aside
        className="hidden w-[132px] shrink-0 flex-col justify-between py-3 md:flex"
        style={{ background: skin.surfaceAlt, borderRight: `1px solid ${skin.border}` }}
      >
        <div>
          <div className="flex flex-col items-center gap-1.5 px-3 pb-3" style={{ borderBottom: `1px solid ${skin.border}` }}>
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold"
              style={{ background: skin.crest, color: skin.crestText, border: `1px solid ${skin.border}` }}
            >
              {skin.mark}
            </span>
            <span className="text-center text-[9px] font-semibold leading-tight">{skin.name}</span>
            <span className="text-[6px] uppercase tracking-[0.1em]" style={{ color: skin.muted }}>
              Dashboard powered by RFX
            </span>
          </div>
          <nav className="mt-2.5 space-y-px px-1.5">
            {NAV.map(([label, Icon, kind], i) =>
              kind === 'label' ? (
                <p key={label + i} className="px-2 pb-0.5 pt-2 text-[6px] uppercase tracking-[0.14em]" style={{ color: skin.muted }}>
                  {label}
                </p>
              ) : (
                <span
                  key={label + i}
                  className="flex items-center gap-1.5 rounded px-2 py-[5px] text-[8px]"
                  style={
                    label === 'Club Health'
                      ? { background: skin.accent, color: skin.accentText, fontWeight: 600 }
                      : { color: skin.text }
                  }
                >
                  <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </span>
              ),
            )}
          </nav>
        </div>
        <div className="px-3 pt-3 text-[7px]" style={{ borderTop: `1px solid ${skin.border}`, color: skin.muted }}>
          <p className="truncate">admin@club.com</p>
          <p className="mt-1.5 flex items-center gap-1">
            <LogOut className="h-2 w-2" aria-hidden="true" /> Sign Out
          </p>
        </div>
      </aside>

      {/* main */}
      <div className="min-w-0 flex-1 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-[15px] font-bold leading-tight">Club Health Overview</h4>
            <p className="mt-0.5 text-[8px]" style={{ color: skin.muted }}>
              {skin.name} · Is your recruiting working?
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[7px]">
            <span className="rounded px-2 py-1" style={{ border: `1px solid ${skin.border}` }}>Season Recap</span>
            <span className="flex overflow-hidden rounded" style={{ border: `1px solid ${skin.border}` }}>
              <span className="px-2 py-1 font-semibold" style={{ background: skin.accent, color: skin.accentText }}>7 Days</span>
              <span className="px-2 py-1" style={{ color: skin.muted }}>30 Days</span>
              <span className="px-2 py-1" style={{ color: skin.muted }}>All Time</span>
            </span>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {KPIS.map(([label, value, sub, Icon]) => (
            <div key={label} className="rounded-md p-2" style={{ background: skin.surface, border: `1px solid ${skin.border}` }}>
              <div className="flex items-start justify-between">
                <span className="text-[6.5px] font-semibold uppercase tracking-[0.1em]">{label}</span>
                <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} style={{ color: skin.muted }} aria-hidden="true" />
              </div>
              <p className="mt-1 text-[19px] font-bold leading-none" style={{ color: skin.accent }}>{value}</p>
              <p className="mt-1 text-[7px]" style={{ color: skin.muted }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* rate tiles */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {RATES.map(([label, value, sub, pct]) => (
            <div key={label} className="rounded-md p-2" style={{ background: skin.surface, border: `1px solid ${skin.border}` }}>
              <span className="text-[6.5px] font-semibold uppercase tracking-[0.1em]">{label}</span>
              <p className="mt-1 text-[17px] font-bold leading-none" style={{ color: skin.accent }}>{value}</p>
              <p className="mt-0.5 text-[7px]" style={{ color: skin.muted }}>{sub}</p>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full" style={{ background: skin.surfaceAlt }}>
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: skin.accent }} />
              </span>
            </div>
          ))}
        </div>

        {/* charts */}
        <div className="mt-2 grid grid-cols-[1.75fr_1fr] gap-2">
          <div className="rounded-md p-2.5" style={{ background: skin.surface, border: `1px solid ${skin.border}` }}>
            <p className="text-[8px] font-semibold">Profile Views Over Time</p>
            <svg viewBox="0 0 240 62" className="mt-1.5 w-full" preserveAspectRatio="none" aria-hidden="true">
              {[0, 15.5, 31, 46.5, 62].map((y) => (
                <line key={y} x1="0" y1={y} x2="240" y2={y} stroke={skin.border} strokeWidth="0.5" strokeDasharray="2 2" />
              ))}
              <path d={linePath(views, 240, 62, 24)} fill="none" stroke={skin.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d={linePath(interests, 240, 62, 24)} fill="none" stroke={skin.line2} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-1 flex items-center justify-center gap-3 text-[6px]" style={{ color: skin.muted }}>
              <span className="flex items-center gap-1">
                <span className="h-px w-2.5" style={{ background: skin.accent }} /> Views
              </span>
              <span className="flex items-center gap-1">
                <span className="h-px w-2.5" style={{ background: skin.line2 }} /> Interests
              </span>
            </div>
          </div>
          <div className="rounded-md p-2.5" style={{ background: skin.surface, border: `1px solid ${skin.border}` }}>
            <p className="text-[8px] font-semibold">Interest by Division</p>
            <div className="mt-1.5 flex justify-center">
              <svg viewBox="0 0 42 42" className="h-[62px] w-[62px]" aria-hidden="true">
                {/* 18 / 8 / 1 of 27 */}
                <circle cx="21" cy="21" r="15.9" fill="none" stroke={skin.accent} strokeWidth="7"
                  strokeDasharray="66 34" strokeDashoffset="25" />
                <circle cx="21" cy="21" r="15.9" fill="none" stroke={skin.line2} strokeWidth="7"
                  strokeDasharray="30 70" strokeDashoffset="-41" />
                <circle cx="21" cy="21" r="15.9" fill="none" stroke={skin.muted} strokeWidth="7"
                  strokeDasharray="4 96" strokeDashoffset="-71" />
              </svg>
            </div>
            <div className="mt-1 flex justify-center gap-2 text-[6px]" style={{ color: skin.muted }}>
              <span>D1: 18</span><span>D2: 8</span><span>NAIA: 1</span>
            </div>
          </div>
        </div>

        {/* class pipeline */}
        <div className="mt-2 rounded-md p-2.5" style={{ background: skin.surface, border: `1px solid ${skin.border}` }}>
          <p className="text-[8px] font-semibold">Class Pipeline</p>
          <p className="text-[6.5px]" style={{ color: skin.muted }}>Where each class stands — click a stage to see who&apos;s stuck</p>
          <div className="mt-1.5 space-y-1">
            {PIPELINE.map(([label, pct, value]) => (
              <div key={label} className="grid grid-cols-[62px_1fr] items-center gap-2">
                <span className="text-[7px]" style={{ color: skin.muted }}>{label}</span>
                <span className="h-3 overflow-hidden rounded-sm" style={{ background: skin.surfaceAlt }}>
                  <span
                    className="flex h-full items-center rounded-sm px-1.5 text-[6.5px] font-bold"
                    style={{ width: `${pct}%`, background: skin.accent, color: skin.accentText }}
                  >
                    {value}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
