import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { listPrograms } from '../../lib/api';
import { Program } from '../../lib/types';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState } from '../components/ui';
import NotConnected from '../components/NotConnected';

const PAGE_SIZE = 50;

export default function Programs() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const page = Number(params.get('page') ?? '0');

  const [input, setInput] = useState(search);
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    setPrograms(null);
    listPrograms(search, page, PAGE_SIZE)
      .then(({ programs, total }) => { setPrograms(programs); setTotal(total); })
      .catch((e) => setError((e as Error).message));
  }, [search, page]);

  if (!isConfigured) return <NotConnected feature="the Program Directory" />;

  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Program Directory" subtitle={`${total.toLocaleString()} school program${total === 1 ? '' : 's'}`} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const p = new URLSearchParams(params);
          if (input) p.set('search', input);
          else p.delete('search');
          p.delete('page');
          setParams(p, { replace: true });
        }}
        className="relative max-w-md mb-6"
      >
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search school, sport, or conference — press Enter"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000]/60"
        />
      </form>

      {error && <ErrorBox message={error} />}
      {!error && programs === null && <Spinner />}
      {!error && programs !== null && programs.length === 0 && (
        <EmptyState title="No programs found" hint="Programs are created automatically from the schools in your vendor files." />
      )}

      {!error && programs !== null && programs.length > 0 && (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#2a2a2a]">
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Sport</th>
                  <th className="px-4 py-3 font-medium">Division</th>
                  <th className="px-4 py-3 font-medium">Conference</th>
                  <th className="px-4 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-[#1f1f1f]/60">
                    <td className="px-4 py-3">
                      <Link to={`/app/programs/${p.id}`} className="text-white font-medium hover:text-[#FF6666]">
                        {p.school}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{p.sport}</td>
                    <td className="px-4 py-3 text-gray-400">{p.division ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{p.conference ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{p.state ?? '—'}</td>
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
                  onClick={() => { const p = new URLSearchParams(params); p.set('page', String(page - 1)); setParams(p, { replace: true }); }}
                  className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg disabled:opacity-40 hover:border-[#FF0000]/50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page + 1 >= pages}
                  onClick={() => { const p = new URLSearchParams(params); p.set('page', String(page + 1)); setParams(p, { replace: true }); }}
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
