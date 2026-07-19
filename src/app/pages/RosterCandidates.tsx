import { useCallback, useEffect, useState } from 'react';
import { Users2, Check, X, ExternalLink, ShieldQuestion, CheckCheck } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import {
  listRosterCandidates, RosterCandidate, resolveRosterCandidate, updateRosterCandidate,
} from '../../lib/api';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState } from '../components/ui';
import NotConnected from '../components/NotConnected';

export default function RosterCandidates() {
  const [items, setItems] = useState<RosterCandidate[] | null | 'unavailable'>(null);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!isConfigured) return;
    setItems(null);
    listRosterCandidates('pending').then((r) => setItems(r ?? 'unavailable')).catch(() => setItems('unavailable'));
  }, []);

  useEffect(refresh, [refresh]);

  if (!isConfigured) return <NotConnected feature="Roster Candidates" />;

  async function edit(id: string, field: 'first_name' | 'last_name' | 'title', value: string) {
    setItems((list) => (Array.isArray(list) ? list.map((i) => (i.id === id ? { ...i, [field]: value } : i)) : list));
  }

  async function resolve(item: RosterCandidate, approve: boolean) {
    setBusyIds((s) => new Set(s).add(item.id));
    try {
      if (approve) {
        await updateRosterCandidate(item.id, { first_name: item.first_name, last_name: item.last_name, title: item.title });
      }
      await resolveRosterCandidate(item.id, approve);
      setItems((list) => (Array.isArray(list) ? list.filter((i) => i.id !== item.id) : list));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(item.id); return n; });
    }
  }

  async function approveSchool(school: string, sport: string | null) {
    if (!Array.isArray(items)) return;
    const targets = items.filter((i) => i.school === school && i.sport === sport && i.first_name.trim() && i.last_name.trim());
    if (!targets.length || !window.confirm(`Approve all ${targets.length} named coaches for ${school} — ${sport}?`)) return;
    setBulkBusy(true);
    try {
      for (const t of targets) {
        await updateRosterCandidate(t.id, { first_name: t.first_name, last_name: t.last_name, title: t.title });
        await resolveRosterCandidate(t.id, true);
      }
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  // Group by school + sport for tidy per-program review.
  const groups: { key: string; school: string; sport: string | null; rows: RosterCandidate[] }[] = [];
  if (Array.isArray(items)) {
    for (const it of items) {
      const key = `${it.school}|${it.sport}`;
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key, school: it.school, sport: it.sport, rows: [] }; groups.push(g); }
      g.rows.push(it);
    }
  }

  const inputCls = 'bg-[#1f1f1f] border border-[#2a2a2a] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#FF0000]/60';

  return (
    <div>
      <PageHeader
        title="Roster Candidates"
        subtitle="Coaches the Roster Builder found on program pages, awaiting your review. Names are derived from each coach's email — fix any that look off, then approve. Nothing becomes a coach until you approve it."
      />

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      {items === null && <Spinner />}
      {items === 'unavailable' && (
        <Card className="p-6 max-w-3xl text-sm text-gray-400 leading-relaxed">
          The Roster Builder isn't installed yet. Run{' '}
          <code className="bg-black px-1.5 py-0.5 rounded text-xs">supabase/setup_all.sql</code> in the Supabase SQL
          editor (it includes the roster-candidates table), then a build can be run for a conference.
        </Card>
      )}
      {Array.isArray(items) && items.length === 0 && (
        <EmptyState
          title="No candidates to review"
          hint="When the Roster Builder runs for a conference, the coaches it finds will appear here for your approval."
        />
      )}

      {groups.map((g) => (
        <Card key={g.key} className="mb-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#2a2a2a] bg-[#161616]">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users2 className="w-4 h-4 text-[#FF0000]" /> {g.school}
              <span className="text-gray-500 font-normal">· {g.sport} · {g.rows.length} found</span>
            </div>
            <button
              disabled={bulkBusy}
              onClick={() => approveSchool(g.school, g.sport)}
              className="flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-xs disabled:opacity-50 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Approve all named
            </button>
          </div>
          <div className="divide-y divide-[#1f1f1f]">
            {g.rows.map((item) => {
              const needsName = !item.first_name.trim() || !item.last_name.trim();
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                  <input
                    value={item.first_name}
                    onChange={(e) => edit(item.id, 'first_name', e.target.value)}
                    placeholder="First"
                    className={`${inputCls} w-24 ${needsName ? 'border-amber-700' : ''}`}
                  />
                  <input
                    value={item.last_name}
                    onChange={(e) => edit(item.id, 'last_name', e.target.value)}
                    placeholder="Last"
                    className={`${inputCls} w-28 ${needsName ? 'border-amber-700' : ''}`}
                  />
                  <input
                    value={item.title ?? ''}
                    onChange={(e) => edit(item.id, 'title', e.target.value)}
                    className={`${inputCls} w-40`}
                  />
                  <span className="text-gray-300 flex-1 min-w-[180px] break-all">{item.email}</span>
                  {needsName && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <ShieldQuestion className="w-3 h-3" /> add name
                    </span>
                  )}
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-300" title="Source page">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    disabled={busyIds.has(item.id)}
                    onClick={() => resolve(item, false)}
                    className="p-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-gray-300 disabled:opacity-50"
                    aria-label="Reject"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={busyIds.has(item.id) || needsName}
                    onClick={() => resolve(item, true)}
                    className="p-1.5 bg-[#FF0000] hover:bg-[#CC0000] rounded-lg text-white disabled:opacity-40"
                    aria-label="Approve"
                    title={needsName ? 'Add a name first' : 'Approve — creates the coach'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
