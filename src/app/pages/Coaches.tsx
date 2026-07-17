import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { listCoaches, listDivisions, listSports } from '../../lib/api';
import { Coach } from '../../lib/types';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, StatusPill } from '../components/ui';
import NotConnected from '../components/NotConnected';

const PAGE_SIZE = 50;

export default function Coaches() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = (params.get('status') ?? 'active') as 'active' | 'inactive' | 'all';
  const sport = params.get('sport') ?? '';
  const division = params.get('division') ?? '';
  const page = Number(params.get('page') ?? '0');

  const [input, setInput] = useState(search);
  const [coaches, setCoaches] = useState<Coach[] | null>(null);
  const [total, setTotal] = useState(0);
  const [sports, setSports] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    listSports().then(setSports).catch(() => undefined);
    listDivisions().then(setDivisions).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    setCoaches(null);
    listCoaches({ search, status, sport: sport || undefined, division: division || undefined, page, pageSize: PAGE_SIZE })
      .then(({ coaches, total }) => { setCoaches(coaches); setTotal(total); })
      .catch((e) => setError((e as Error).message));
  }, [search, status, sport, division, page]);

  if (!isConfigured) return <NotConnected feature="the Coach Directory" />;

  function updateParams(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p, { replace: true });
  }

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Coach Directory"
        subtitle={`${total.toLocaleString()} coach${total === 1 ? '' : 'es'} matching your filters`}
        actions={
          <Link
            to="/app/coaches/new"
            className="flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add coach
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <form
          onSubmit={(e) => { e.preventDefault(); updateParams({ search: input }); }}
          className="flex-1 min-w-[240px] relative"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search name, email, or school — press Enter"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000]/60"
          />
        </form>
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <select
          value={sport}
          onChange={(e) => updateParams({ sport: e.target.value })}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none max-w-[200px]"
        >
          <option value="">All sports</option>
          {sports.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={division}
          onChange={(e) => updateParams({ division: e.target.value })}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none max-w-[200px]"
        >
          <option value="">All divisions</option>
          {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {error && <ErrorBox message={error} />}
      {!error && coaches === null && <Spinner />}
      {!error && coaches !== null && coaches.length === 0 && (
        <EmptyState title="No coaches found" hint="Try a different search, or upload a vendor file in Monthly Sync to load the database." />
      )}

      {!error && coaches !== null && coaches.length > 0 && (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#2a2a2a]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Sport</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((c) => (
                  <tr key={c.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1f1f1f]/60">
                    <td className="px-4 py-3">
                      <Link to={`/app/coaches/${c.id}`} className="text-white font-medium hover:text-[#FF6666]">
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.school ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{c.sport ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{c.title ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email ?? '—'}</td>
                    <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
