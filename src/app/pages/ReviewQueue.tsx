import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Check, X, CheckCheck } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { listReviewItems, resolveReviewItem } from '../../lib/api';
import { ReviewItem } from '../../lib/types';
import { Card, PageHeader, Spinner, ErrorBox, EmptyState, StatusPill, formatDateTime } from '../components/ui';
import NotConnected from '../components/NotConnected';

const TYPE_LABEL: Record<ReviewItem['item_type'], string> = {
  identity_conflict: 'Identity conflict',
  mass_departure: 'Mass disappearance',
  duplicate_id: 'Duplicate ID in file',
  missing_id: 'Missing unique ID',
};

const TYPE_HELP: Record<ReviewItem['item_type'], string> = {
  identity_conflict: 'The vendor file calls this coach new, but the email already belongs to someone in your database. Approve to treat them as the same person (history is preserved); reject to ignore the row.',
  mass_departure: 'A large chunk of coaches vanished from the file at once — usually a truncated or bad vendor file. Approve to mark the coach as departed; reject to keep them active.',
  duplicate_id: 'The same unique ID appeared on multiple rows. The first row was used. Approve to acknowledge; nothing else changes.',
  missing_id: 'This row has no unique ID so it could not be matched safely. Approve to add them as a new coach with a generated ID; reject to ignore the row.',
};

export default function ReviewQueue() {
  const [tab, setTab] = useState<ReviewItem['status']>('pending');
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!isConfigured) return;
    setItems(null);
    listReviewItems(tab).then(setItems).catch((e) => setError((e as Error).message));
  }, [tab]);

  useEffect(refresh, [refresh]);

  if (!isConfigured) return <NotConnected feature="the Review Queue" />;

  async function resolve(item: ReviewItem, approve: boolean) {
    setBusyIds((s) => new Set(s).add(item.id));
    try {
      await resolveReviewItem(item.id, approve);
      setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(item.id); return n; });
    }
  }

  async function resolveAll(type: ReviewItem['item_type'], approve: boolean) {
    if (!items) return;
    const targets = items.filter((i) => i.item_type === type);
    const verb = approve ? 'Approve' : 'Reject';
    if (!window.confirm(`${verb} all ${targets.length} "${TYPE_LABEL[type]}" items?`)) return;
    setBulkBusy(true);
    try {
      for (const t of targets) await resolveReviewItem(t.id, approve);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  const massDepartures = (items ?? []).filter((i) => i.item_type === 'mass_departure');

  return (
    <div>
      <PageHeader
        title="Review Queue"
        subtitle="The safety net: suspicious vendor data pauses here until you approve or reject it. Nothing below has touched the master list yet."
      />

      <div className="flex gap-2 mb-6">
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
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      {tab === 'pending' && massDepartures.length > 1 && (
        <Card className="p-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-amber-800">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            {massDepartures.length} coaches disappeared at once — likely one bad file. Handle them together:
          </div>
          <div className="flex gap-2">
            <button
              disabled={bulkBusy}
              onClick={() => resolveAll('mass_departure', false)}
              className="flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Reject all (keep everyone active)
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => resolveAll('mass_departure', true)}
              className="flex items-center gap-1.5 bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Approve all departures
            </button>
          </div>
        </Card>
      )}

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          title={tab === 'pending' ? 'The queue is clear' : `No ${tab} items`}
          hint={tab === 'pending' ? 'When a sync finds suspicious data, it will pause here for your call.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#FF6666]">
                      {TYPE_LABEL[item.item_type]}
                    </span>
                    <StatusPill status={item.status} />
                  </div>
                  <div className="text-sm text-gray-200">{item.summary}</div>
                  <div className="text-xs text-gray-600 mt-1">{formatDateTime(item.created_at)}</div>
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                      What does this mean?
                    </summary>
                    <p className="text-xs text-gray-500 mt-1 max-w-2xl">{TYPE_HELP[item.item_type]}</p>
                  </details>
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
          ))}
        </div>
      )}
    </div>
  );
}
