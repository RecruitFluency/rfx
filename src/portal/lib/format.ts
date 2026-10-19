import type { InvitationStatus, Program, RecipientType, StaffRole } from './types';

export const programName = (p: Pick<Program, 'sport' | 'gender'>) =>
  `${p.gender === 'mens' ? "Men's" : p.gender === 'womens' ? "Women's" : 'Coed'} ${p.sport}`;

export const roleLabel: Record<StaffRole, string> = {
  dept_admin: 'Athletic Department',
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  compliance: 'Compliance',
};

export const recipientLabel: Record<RecipientType, string> = {
  athlete: 'Athlete',
  guardian: 'Parent / guardian',
  club_contact: 'Club director',
};

export const statusLabel: Record<InvitationStatus, string> = {
  pending_approval: 'Awaiting approval',
  queued: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  clicked: 'Opened link',
  replied: 'Replied',
  started: 'Conversation started',
  completed: 'Conversation complete',
  failed: 'Failed',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  opted_out: 'Opted out',
};

export type Tone = 'neutral' | 'progress' | 'done' | 'warn' | 'bad';

export const statusTone: Record<InvitationStatus, Tone> = {
  pending_approval: 'warn', queued: 'neutral', sending: 'neutral', sent: 'progress', delivered: 'progress',
  clicked: 'progress', replied: 'progress', started: 'progress', completed: 'done',
  failed: 'bad', blocked: 'warn', cancelled: 'neutral', rejected: 'bad', opted_out: 'bad',
};

export const eventLabel: Record<string, string> = {
  queued: 'Queued', approved: 'Approved by compliance', rejected: 'Rejected by compliance', blocked: 'Blocked',
  released: 'Released by compliance', cancelled: 'Cancelled', sending: 'Sending', sent: 'Sent', delivered: 'Delivered',
  failed: 'Failed', bounced: 'Bounced', opened: 'Opened', clicked: 'Opened link', replied: 'Replied',
  started: 'Conversation started', completed: 'Conversation complete', opted_out: 'Opted out', opted_in: 'Opted back in',
};

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', withTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const future = diff < 0;
  const s = Math.abs(diff);
  const v = s < 60 ? 'just now'
    : s < 3600 ? `${Math.round(s / 60)}m`
    : s < 86400 ? `${Math.round(s / 3600)}h`
    : `${Math.round(s / 86400)}d`;
  if (v === 'just now') return v;
  return future ? `in ${v}` : `${v} ago`;
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '—';
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export const formatUsd = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
