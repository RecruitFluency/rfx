import { useEffect, useState } from 'react';
import { Download, FileJson, Smartphone } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { ExportFilters, fetchAllCoaches, listCoaches, listDivisions, listSports } from '../../lib/api';
import { Coach } from '../../lib/types';
import { Card, PageHeader, ErrorBox } from '../components/ui';
import NotConnected from '../components/NotConnected';

const CSV_COLUMNS: (keyof Coach)[] = [
  'master_id', 'first_name', 'last_name', 'email', 'phone', 'school',
  'sport', 'title', 'division', 'conference', 'state', 'status', 'last_seen_at',
];

function toCsv(coaches: Coach[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    CSV_COLUMNS.join(','),
    ...coaches.map((c) => CSV_COLUMNS.map((k) => escape(c[k])).join(',')),
  ].join('\n');
}

function download(content: string, fileName: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Export() {
  const [sport, setSport] = useState('');
  const [division, setDivision] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [sports, setSports] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    listSports().then(setSports).catch(() => undefined);
    listDivisions().then(setDivisions).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    setCount(null);
    listCoaches({ sport: sport || undefined, status, pageSize: 1 })
      .then(({ total }) => setCount(total))
      .catch((e) => setError((e as Error).message));
    // division isn't a listCoaches filter; count refresh below handles it via export fetch
  }, [sport, status]);

  if (!isConfigured) return <NotConnected feature="exports" />;

  const filters: ExportFilters = {
    sport: sport || undefined,
    division: division || undefined,
    status,
  };

  async function run(format: 'csv' | 'json') {
    setError('');
    setProgress(0);
    try {
      const coaches = await fetchAllCoaches(filters, setProgress);
      const stamp = new Date().toISOString().slice(0, 10);
      const scope = [sport || 'all-sports', division, status].filter(Boolean).join('-').replace(/\s+/g, '_');
      if (format === 'csv') {
        download(toCsv(coaches), `rfx-coaches-${scope}-${stamp}.csv`, 'text/csv');
      } else {
        download(JSON.stringify(coaches, null, 2), `rfx-coaches-${scope}-${stamp}.json`, 'application/json');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const select =
    'bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none';

  return (
    <div>
      <PageHeader
        title="Export / App Feed"
        subtitle="Pull the current verified contact list to feed the RFX app — filtered to exactly the slice you need."
      />

      <Card className="p-6 max-w-3xl mb-6">
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={sport} onChange={(e) => setSport(e.target.value)} className={select} aria-label="Sport">
            <option value="">All sports</option>
            {sports.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={division} onChange={(e) => setDivision(e.target.value)} className={select} aria-label="Division">
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={select}
            aria-label="Status"
          >
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="all">Active + inactive</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          {count === null
            ? 'Counting…'
            : division
            ? `Up to ${count.toLocaleString()} coaches match the sport/status filters; the division filter is applied during export.`
            : `${count.toLocaleString()} coach${count === 1 ? '' : 'es'} match.`}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={progress !== null}
            onClick={() => run('csv')}
            className="flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white font-medium rounded-lg px-5 py-2.5 text-sm disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {progress !== null ? `Fetching… ${progress.toLocaleString()}` : 'Download CSV'}
          </button>
          <button
            disabled={progress !== null}
            onClick={() => run('json')}
            className="flex items-center gap-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-5 py-2.5 text-sm disabled:opacity-50 transition-colors"
          >
            <FileJson className="w-4 h-4" /> Download JSON
          </button>
        </div>

        {error && <div className="mt-4"><ErrorBox message={error} /></div>}
      </Card>

      <Card className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 font-semibold mb-2">
          <Smartphone className="w-4 h-4 text-[#FF0000]" /> Connecting the RFX app directly
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          The app doesn't have to consume files: this database lives in Supabase, so the app can read the{' '}
          <code className="bg-[#1f1f1f] px-1.5 py-0.5 rounded text-xs">coaches</code> table live using the same
          project URL and anon key this dashboard uses. Anything Jen approves here — new coaches, moves,
          departures — is instantly what the app sees. Filter to{' '}
          <code className="bg-[#1f1f1f] px-1.5 py-0.5 rounded text-xs">status = 'active'</code> in the app so
          departed coaches drop out automatically.
        </p>
      </Card>
    </div>
  );
}
