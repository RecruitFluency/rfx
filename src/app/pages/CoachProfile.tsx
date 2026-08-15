import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, School, Fingerprint, Plus, Pencil, UserMinus, RefreshCcw } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import {
  addCoachNote, addEmailLog, getCoach, getCoachHistory, getCoachNotes, getEmailLogs,
  setCoachStatus, updateCoach,
} from '../../lib/api';
import { Coach, CoachHistoryEntry, CoachNote, EmailLog } from '../../lib/types';
import { Card, Spinner, ErrorBox, StatusPill, formatDate, formatDateTime } from '../components/ui';
import CoachForm from '../components/CoachForm';
import NotConnected from '../components/NotConnected';

const HISTORY_LABEL: Record<CoachHistoryEntry['change_type'], string> = {
  hired: 'Hired',
  moved: 'Moved schools',
  title_change: 'Title change',
  email_change: 'Email change',
  departed: 'Departed',
  reinstated: 'Reinstated',
  merged: 'Records merged',
};

export default function CoachProfile() {
  const { id } = useParams<{ id: string }>();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [history, setHistory] = useState<CoachHistoryEntry[]>([]);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [error, setError] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(() => {
    if (!isConfigured || !id) return;
    Promise.all([getCoach(id), getCoachHistory(id), getCoachNotes(id), getEmailLogs(id)])
      .then(([c, h, n, e]) => { setCoach(c); setHistory(h); setNotes(n); setEmails(e); })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(load, [load]);

  if (!isConfigured) return <NotConnected feature="coach profiles" />;
  if (error) return <ErrorBox message={error} />;
  if (!coach) return <Spinner />;

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteDraft.trim() || !id) return;
    await addCoachNote(id, noteDraft.trim());
    setNoteDraft('');
    load();
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailDraft.trim() || !id) return;
    await addEmailLog(id, emailDraft.trim(), 'outbound');
    setEmailDraft('');
    load();
  }

  return (
    <div>
      <Link to="/app/coaches" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Coach Directory
      </Link>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{coach.first_name} {coach.last_name}</h1>
              <StatusPill status={coach.status} />
            </div>
            <div className="text-gray-400 mt-1">
              {coach.title ?? 'Coach'}{coach.sport ? ` · ${coach.sport}` : ''}{coach.school ? ` · ${coach.school}` : ''}
            </div>
          </div>
          <div className="flex items-start gap-4">
            {!editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-sm transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  disabled={statusBusy}
                  onClick={async () => {
                    const active = coach.status !== 'active';
                    if (!active && !window.confirm(`Mark ${coach.first_name} ${coach.last_name} as departed?`)) return;
                    setStatusBusy(true);
                    try {
                      await setCoachStatus(coach, active);
                      load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setStatusBusy(false);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-200 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors"
                >
                  {coach.status === 'active'
                    ? <><UserMinus className="w-3.5 h-3.5" /> Mark departed</>
                    : <><RefreshCcw className="w-3.5 h-3.5" /> Reinstate</>}
                </button>
              </div>
            )}
            <div className="text-right text-xs text-gray-600">
              Last seen in a vendor file<br />{formatDate(coach.last_seen_at)}
            </div>
          </div>
        </div>
        {editing ? (
          <div className="mt-5">
            <CoachForm
              initial={coach}
              submitLabel="Save changes"
              onSubmit={async (draft) => {
                await updateCoach(coach, draft);
                setEditing(false);
                load();
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 text-sm">
            {[
              { icon: Fingerprint, label: 'Unique ID', value: coach.master_id },
              { icon: Mail, label: 'Email', value: coach.email ?? '—' },
              { icon: Phone, label: 'Phone', value: coach.phone ?? '—' },
              { icon: School, label: 'Division / Conference', value: [coach.division, coach.conference].filter(Boolean).join(' · ') || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-[#1f1f1f] rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </div>
                <div className="text-gray-200 break-all">{value}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Job history */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="font-semibold mb-4">Job History</h2>
          {history.length === 0 ? (
            <div className="text-sm text-gray-500">History builds up as monthly syncs run.</div>
          ) : (
            <ol className="relative border-l border-[#2a2a2a] ml-2 space-y-5">
              {history.map((h) => (
                <li key={h.id} className="ml-4">
                  <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-[#FF0000] mt-1.5" />
                  <div className="text-sm font-medium text-gray-200">{HISTORY_LABEL[h.change_type]}</div>
                  <div className="text-xs text-gray-500">
                    {h.change_type === 'moved' && h.previous_school
                      ? `${h.previous_school} → ${h.school}`
                      : h.change_type === 'title_change' && h.previous_title
                      ? `${h.previous_title} → ${h.title}`
                      : h.change_type === 'email_change' && h.previous_email
                      ? `${h.previous_email} → ${h.email}`
                      : h.change_type === 'departed' && h.previous_school
                      ? `Left ${h.previous_school}`
                      : [h.title, h.school].filter(Boolean).join(' at ') || '—'}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{formatDate(h.changed_at)}</div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Notes */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="font-semibold mb-4">Notes</h2>
          <form onSubmit={saveNote} className="flex gap-2 mb-4">
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000]/60"
            />
            <button type="submit" className="bg-[#FF0000] hover:bg-[#CC0000] rounded-lg px-3 transition-colors" aria-label="Add note">
              <Plus className="w-4 h-4" />
            </button>
          </form>
          {notes.length === 0 ? (
            <div className="text-sm text-gray-500">No notes yet.</div>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="bg-[#1f1f1f] rounded-lg p-3 text-sm">
                  <div className="text-gray-200 whitespace-pre-line">{n.body}</div>
                  <div className="text-xs text-gray-600 mt-1.5">{n.author} · {formatDateTime(n.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Email log */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="font-semibold mb-4">Email Log</h2>
          <form onSubmit={saveEmail} className="flex gap-2 mb-4">
            <input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="Log an email subject…"
              className="flex-1 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000]/60"
            />
            <button type="submit" className="bg-[#FF0000] hover:bg-[#CC0000] rounded-lg px-3 transition-colors" aria-label="Log email">
              <Plus className="w-4 h-4" />
            </button>
          </form>
          {emails.length === 0 ? (
            <div className="text-sm text-gray-500">No emails logged yet.</div>
          ) : (
            <ul className="space-y-3">
              {emails.map((m) => (
                <li key={m.id} className="bg-[#1f1f1f] rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-200">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{m.subject}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1.5 capitalize">{m.direction} · {formatDateTime(m.sent_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
