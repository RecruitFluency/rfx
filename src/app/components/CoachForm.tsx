import { useState } from 'react';
import { CoachDraft } from '../../lib/api';

const FIELDS: { key: keyof CoachDraft; label: string; required?: boolean }[] = [
  { key: 'first_name', label: 'First name', required: true },
  { key: 'last_name', label: 'Last name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'school', label: 'School' },
  { key: 'sport', label: 'Sport' },
  { key: 'title', label: 'Title' },
  { key: 'division', label: 'Division (e.g. NCAA D1, NAIA, JUCO)' },
  { key: 'conference', label: 'Conference' },
  { key: 'state', label: 'State' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CoachForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CoachDraft>;
  submitLabel: string;
  onSubmit: (draft: CoachDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, (initial?.[f.key] as string | null) ?? '']))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.first_name.trim() && !draft.last_name.trim()) {
      setError('A first or last name is required.');
      return;
    }
    if (draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) {
      setError(`"${draft.email.trim()}" doesn't look like a valid email address.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const clean = Object.fromEntries(
        FIELDS.map((f) => [f.key, draft[f.key].trim() === '' ? null : draft[f.key].trim()])
      ) as unknown as CoachDraft;
      clean.first_name = clean.first_name ?? '';
      clean.last_name = clean.last_name ?? '';
      if (clean.email) clean.email = clean.email.toLowerCase();
      await onSubmit(clean);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1" htmlFor={`coach-${key}`}>{label}</label>
            <input
              id={`coach-${key}`}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              className="w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF0000]/60"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-[#FF0000] hover:bg-[#CC0000] text-white font-medium rounded-lg px-5 py-2.5 text-sm disabled:opacity-50 transition-colors"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 rounded-lg px-5 py-2.5 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
