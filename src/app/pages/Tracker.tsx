import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, UserPlus, ArrowRightLeft, UserMinus,
  Mail, RefreshCcw, Briefcase, Radar, Newspaper, ExternalLink, Check, X,
} from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import {
  listMovements, listRadarItems, listSports, Movement, RadarItem, runRadarSweep, setRadarItemStatus,
} from '../../lib/api';
import { CoachHistoryEntry } from '../../lib/types';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, formatDateTime } from '../components/ui';
import NotConnected from '../components/NotConnected';

const PAGE_SIZE = 50;

const TYPE_META: Record<CoachHistoryEntry['change_type'], { icon: React.ElementType; label: string; color: string }> = {
  hired: { icon: UserPlus, label: 'Hired', color: 'text-green-400' },
  moved: { icon: ArrowRightLeft, label: 'Moved schools', color: 'text-blue-400' },
  title_change: { icon: Briefcase, label: 'Title change', color: 'text-blue-400' },
  email_change: { icon: Mail, label: 'Email change', color: 'text-amber-400' },
  departed: { icon: UserMinus, label: 'Departed', color: 'text-orange-400' },
  reinstated: { icon: RefreshCcw, label: 'Reinstated', color: 'text-green-400' },
  merged: { icon: ArrowRightLeft, label: 'Records merged', color: 'text-purple-400' },
};

function describe(m: Movement): string {
  switch (m.change_type) {
    case 'moved':
      return m.previous_school && m.school ? `${m.previous_school} → ${m.school}` : m.school ?? '';
    case 'title_change':
      return m.previous_title && m.title ? `${m.previous_title} → ${m.title}` : m.title ?? '';
    case 'email_change':
      return m.previous_email && m.email ? `${m.previous_email} → ${m.email}` : m.email ?? '';
    case 'departed':
      return m.previous_school ? `Left ${m.previous_school}` : 'Left their program';
    default:
      return [m.title, m.school].filter(Boolean).join(' at ');
  }
}

export default function Tracker() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'radar' ? 'radar' : 'log';
  const type = (params.get('type') ?? '') as CoachHistoryEntry['change_type'] | '';
  const sport = params.get('sport') ?? '';
  const page = Number(params.get('page') ?? '0');

  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [total, setTotal] = useState(0);
  const [sports, setSports] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [radar, setRadar] = useState<RadarItem[] | null | 'unavailable'>(null);
  const [radarBusy, setRadarBusy] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    listSports().then(setSports).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isConfigured || view !== 'log') return;
    setMovements(null);
    listMovements({ type: type || undefined, sport: sport || undefined, page, pageSize: PAGE_SIZE })
      .then(({ movements, total }) => { setMovements(movements); setTotal(total); })
      .catch((e) => setError((e as Error).message));
  }, [view, type, sport, page]);

  useEffect(() => {
    if (!isConfigured || view !== 'radar') return;
    setRadar(null);
    listRadarItems('new').then((r) => setRadar(r ?? 'unavailable')).catch(() => setRadar('unavailable'));
  }, [view]);

  async function sweepNow() {
    setRadarBusy(true);
    setError('');
    try {
      await runRadarSweep();
      const r = await listRadarItems('new');
      if (r !== null) setRadar(r);
    } catch (e) {
      // A sweep failure is an error, not a missing installation.
      setError(`Radar sweep failed: ${(e as Error).message}`);
    } finally {
      setRadarBusy(false);
    }
  }

  async function resolveRadar(item: RadarItem, status: 'reviewed' | 'dismissed') {
    try {
      await setRadarItemStatus(item.id, status);
      setRadar((r) => (Array.isArray(r) ? r.filter((i) => i.id !== item.id) : r));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!isConfigured) return <NotConnected feature="the Coach Tracker" />;

  function updateParams(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p, { replace: true });
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const select =
    'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none max-w-[220px]';

  return (
    <div>
      <PageHeader
        title="Coach Tracker"
        subtitle={
          view === 'radar'
            ? 'The National Radar: coaching-change headlines from across the country, swept every 6 hours — often before they reach a vendor file.'
            : `Every hire, move, and departure across the database — ${total.toLocaleString()} recorded movement${total === 1 ? '' : 's'} matching your filters.`
        }
      />

      <div className="flex gap-2 mb-6">
        {([['log', 'Database movements', Radar], ['radar', 'News Radar', Newspaper]] as const).map(([v, label, Icon]) => (
          <button
            key={v}
            onClick={() => updateParams({ view: v === 'log' ? '' : v, type: '', sport: '' })}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v ? 'bg-[#FF0000] text-white' : 'bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {view === 'radar' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={sweepNow}
              disabled={radarBusy}
              className="flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${radarBusy ? 'animate-spin' : ''}`} /> Sweep sources now
            </button>
          </div>
          {radar === null && <Spinner />}
          {radar === 'unavailable' && (
            <Card className="p-6 max-w-3xl text-sm text-gray-400 leading-relaxed">
              The National Radar isn't installed yet. Run{' '}
              <code className="bg-black px-1.5 py-0.5 rounded text-xs">supabase/migrations/0004_radar.sql</code> in the
              Supabase SQL editor — that creates the news sources and schedules a sweep every 6 hours. Headlines will
              show up here, matched against your coaches where possible.
            </Card>
          )}
          {Array.isArray(radar) && radar.length === 0 && (
            <EmptyState title="Radar is clear" hint="No unreviewed headlines. The radar sweeps every 6 hours, or use Sweep sources now." />
          )}
          {Array.isArray(radar) && radar.length > 0 && (
            <Card>
              <ul className="divide-y divide-[#1f1f1f]">
                {radar.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-5 py-3.5 text-sm">
                    <Newspaper className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-200 hover:text-[#FF6666] font-medium inline-flex items-start gap-1.5"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        {item.matched_coach_id && (
                          <Link
                            to={`/app/coaches/${item.matched_coach_id}`}
                            className="text-xs bg-[#FF0000]/10 text-[#FF6666] border border-[#FF0000]/30 rounded px-1.5 py-0.5 hover:text-white"
                          >
                            Matches a coach in your database →
                          </Link>
                        )}
                        <span className="text-xs text-gray-600">{formatDateTime(item.published_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => resolveRadar(item, 'reviewed')}
                        className="p-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-gray-300"
                        aria-label="Mark reviewed"
                        title="Mark reviewed"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => resolveRadar(item, 'dismissed')}
                        className="p-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-gray-300"
                        aria-label="Dismiss"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {view === 'log' && (
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={type} onChange={(e) => updateParams({ type: e.target.value })} className={select} aria-label="Change type">
          <option value="">All movement types</option>
          {(Object.keys(TYPE_META) as CoachHistoryEntry['change_type'][]).map((t) => (
            <option key={t} value={t}>{TYPE_META[t].label}</option>
          ))}
        </select>
        <select value={sport} onChange={(e) => updateParams({ sport: e.target.value })} className={select} aria-label="Sport">
          <option value="">All sports</option>
          {sports.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      )}

      {error && <ErrorBox message={error} />}
      {view === 'log' && !error && movements === null && <Spinner />}
      {view === 'log' && !error && movements !== null && movements.length === 0 && (
        <EmptyState
          title="No movements match"
          hint="Movements are recorded every time a sync (or a manual edit) changes a coach. Run a monthly sync to see the feed fill up."
        />
      )}

      {view === 'log' && !error && movements !== null && movements.length > 0 && (
        <>
          <Card>
            <ul className="divide-y divide-[#1f1f1f]">
              {movements.map((m) => {
                const meta = TYPE_META[m.change_type] ?? TYPE_META.moved;
                const Icon = meta.icon;
                return (
                  <li key={m.id} className="flex items-start gap-3 px-5 py-3.5 text-sm">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="min-w-0 flex-1">
                      <div>
                        {m.coach_id ? (
                          <Link to={`/app/coaches/${m.coach_id}`} className="text-white font-medium hover:text-[#FF6666]">
                            {m.coaches ? `${m.coaches.first_name} ${m.coaches.last_name}` : 'Unknown coach'}
                          </Link>
                        ) : (
                          <span className="text-white font-medium">Unknown coach</span>
                        )}
                        <span className={`ml-2 text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                          {meta.label}
                        </span>
                        {m.coaches?.sport && (
                          <span className="ml-2 text-xs bg-[#1f1f1f] border border-[#2a2a2a] text-gray-400 rounded px-1.5 py-0.5">
                            {m.coaches.sport}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 mt-0.5 break-words">{describe(m)}</div>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap mt-0.5">{formatDateTime(m.changed_at)}</div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => updateParams({ page: String(page - 1) })}
                  className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg disabled:opacity-40 hover:border-[#FF0000]/50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page + 1 >= pages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                  className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg disabled:opacity-40 hover:border-[#FF0000]/50"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-600 mt-6 max-w-2xl">
        <Radar className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          The tracker is the raw movement log behind the Insights page. Every entry is tied to the coach's permanent
          ID, so a coach's full career path survives school moves and email changes.
        </span>
      </div>
    </div>
  );
}
