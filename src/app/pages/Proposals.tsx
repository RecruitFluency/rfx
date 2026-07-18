import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MailPlus, Check, X, ExternalLink, ShieldQuestion } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { listProposedChanges, ProposedChange, resolveProposedChange } from '../../lib/api';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, formatDateTime } from '../components/ui';
import NotConnected from '../components/NotConnected';

export default function Proposals() {
  const [tab, setTab] = useState<ProposedChange['status']>('pending');
  const [items, setItems] = useState<ProposedChange[] | null | 'unavailable'>(null);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!isConfigured) return;
    setItems(null);
    listProposedChanges(tab).then((r) => setItems(r ?? 'unavailable')).catch(() => setItems('unavailable'));
  }, [tab]);

  useEffect(refresh, [refresh]);

  if (!isConfigured) return <NotConnected feature="Found Contacts" />;

  async function resolve(item: ProposedChange, approve: boolean) {
    setBusyIds((s) => new Set(s).add(item.id));
    try {
      await resolveProposedChange(item.id, approve);
      setItems((list) => (Array.isArray(list) ? list.filter((i) => i.id !== item.id) : list));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(item.id); return n; });
    }
  }

  async function approveStrong() {
    if (!Array.isArray(items)) return;
    const strong = items.filter((i) => i.source.endsWith('strong'));
    if (!strong.length) return;
    if (!window.confirm(`Approve all ${strong.length} high-confidence matches?`)) return;
    setBulkBusy(true);
    try {
      for (const it of strong) await resolveProposedChange(it.id, true);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  const strongCount = Array.isArray(items) ? items.filter((i) => i.source.endsWith('strong')).length : 0;

  return (
    <div>
      <PageHeader
        title="Found Contacts"
        subtitle="The Email Hunter visits each coach's program page overnight and proposes contact info it finds. Nothing is applied until you approve it here."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === s ? 'bg-[#FF0000] text-white' : 'bg-[#1f1f1f] text-gray-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            {s}
          </button>
        ))}
        {tab === 'pending' && strongCount > 1 && (
          <button
            disabled={bulkBusy}
            onClick={approveStrong}
            className="ml-auto flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Approve all {strongCount} high-confidence
          </button>
        )}
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      {items === null && <Spinner />}
      {items === 'unavailable' && (
        <Card className="p-6 max-w-3xl text-sm text-gray-400 leading-relaxed">
          The Email Hunter isn't installed yet. Run{' '}
          <code className="bg-black px-1.5 py-0.5 rounded text-xs">supabase/setup_all.sql</code> in the Supabase SQL
          editor (it includes the Email Hunter tables), then enable the nightly agent by adding your Supabase URL and
          key as GitHub Actions secrets — see the setup note in the repo's{' '}
          <code className="bg-black px-1.5 py-0.5 rounded text-xs">.github/workflows/email-hunter.yml</code>.
        </Card>
      )}
      {Array.isArray(items) && items.length === 0 && (
        <EmptyState
          title={tab === 'pending' ? 'No proposals waiting' : `No ${tab} proposals`}
          hint={tab === 'pending' ? 'The Email Hunter runs nightly. Found emails will land here for your one-click approval.' : undefined}
        />
      )}

      {Array.isArray(items) && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const weak = item.source.endsWith('weak');
            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MailPlus className="w-4 h-4 text-[#FF6666] shrink-0" />
                      <Link to={`/app/coaches/${item.coach_id}`} className="text-white font-medium hover:text-[#FF6666]">
                        {item.coaches ? `${item.coaches.first_name} ${item.coaches.last_name}` : 'Coach'}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {[item.coaches?.school, item.coaches?.sport].filter(Boolean).join(' · ')}
                      </span>
                      {weak && (
                        <span className="flex items-center gap-1 text-xs bg-amber-900/30 text-amber-400 border border-amber-800 rounded px-1.5 py-0.5">
                          <ShieldQuestion className="w-3 h-3" /> low confidence — verify
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-300">
                      Proposed {item.field}: <span className="text-white font-medium">{item.proposed_value}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                      <span>{formatDateTime(item.created_at)}</span>
                      {item.source_url && (
                        <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-gray-300">
                          source page <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {item.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        disabled={busyIds.has(item.id)}
                        onClick={() => resolve(item, false)}
                        className="flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        disabled={busyIds.has(item.id)}
                        onClick={() => resolve(item, true)}
                        className="flex items-center gap-1.5 bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
