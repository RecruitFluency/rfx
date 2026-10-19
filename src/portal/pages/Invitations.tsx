import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import type { Invitation, InvitationStatus } from '../lib/types';
import { downloadCsv, formatDate, programName, recipientLabel, statusLabel } from '../lib/format';
import { Button, Empty, ErrorNote, PageHeader, Panel, Select, Spinner, StatusBadge, Table, td, th } from '../components/ui';

const GROUPS: Record<string, InvitationStatus[]> = {
  all: [],
  scheduled: ['pending_approval', 'queued', 'sending'],
  sent: ['sent', 'delivered', 'clicked', 'replied'],
  active: ['started', 'completed'],
  problems: ['failed', 'blocked', 'opted_out', 'rejected'],
};

export default function Invitations() {
  const { scopeProgramIds, programs } = usePortal();
  const [rows, setRows] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState('all');
  const [recipient, setRecipient] = useState('');
  const [channel, setChannel] = useState('');

  useEffect(() => {
    setRows(null);
    api.listInvitations({ programIds: scopeProgramIds, limit: 1000 }).then(setRows).catch((e) => setError(e.message));
  }, [scopeProgramIds]);

  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, programName(p)])), [programs]);
  const filtered = useMemo(() => (rows ?? []).filter((r) =>
    (group === 'all' || GROUPS[group].includes(r.status))
    && (!recipient || r.recipient_type === recipient)
    && (!channel || r.channel === channel)), [rows, group, recipient, channel]);

  const exportRows = () => downloadCsv('vekt-invitations.csv', filtered.map((r) => ({
    created: r.created_at, program: programMap.get(r.program_id), recipient: r.recipient_name,
    recipient_type: recipientLabel[r.recipient_type], channel: r.channel, to: r.to_phone ?? r.to_email,
    status: statusLabel[r.status], detail: r.status_detail, sent_at: r.sent_at, delivered_at: r.delivered_at,
    started_at: r.started_at, completed_at: r.completed_at, reminder: r.reminder_number,
  })));

  return (
    <div>
      <PageHeader eyebrow="Tracking" title="Invitations"
        subtitle="Every text and email your staff has sent through VEKT, with live delivery and conversation status." />
      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/[0.08]">
          <Select aria-label="Status" className="!w-auto" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled / awaiting approval</option>
            <option value="sent">Sent, not started</option>
            <option value="active">Conversation started or done</option>
            <option value="problems">Failed, blocked or opted out</option>
          </Select>
          <Select aria-label="Recipient" className="!w-auto" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
            <option value="">All recipients</option>
            <option value="athlete">Athletes</option><option value="guardian">Parents / guardians</option><option value="club_contact">Club directors</option>
          </Select>
          <Select aria-label="Channel" className="!w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">Text + email</option><option value="sms">Text</option><option value="email">Email</option>
          </Select>
          <div className="flex-1" />
          <Button variant="ghost" onClick={exportRows} disabled={filtered.length === 0}>Export CSV</Button>
        </div>
        {error && <div className="p-4"><ErrorNote message={error} /></div>}
        {!rows && !error && <Spinner />}
        {rows && filtered.length === 0 && <Empty title="No invitations here" hint="Invite prospects from the Prospects page." />}
        {rows && filtered.length > 0 && (
          <Table>
            <thead><tr>
              <th className={th}>Recipient</th><th className={th}>For prospect</th><th className={th}>Channel</th>
              <th className={th}>Sent</th><th className={th}>Status</th><th className={th}>Detail</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <div className="text-white">{r.recipient_name}</div>
                    <div className="text-xs text-vekt-grey">{recipientLabel[r.recipient_type]}{r.reminder_number ? ` · Reminder ${r.reminder_number}` : ''}</div>
                  </td>
                  <td className={td}>
                    <Link to={`/portal/prospects/${r.prospect_id}`} className="text-white underline decoration-white/30 hover:decoration-white">View prospect</Link>
                    {scopeProgramIds.length > 1 && <div className="text-xs text-vekt-grey">{programMap.get(r.program_id)}</div>}
                  </td>
                  <td className={`${td} text-vekt-grey`}>{r.channel === 'sms' ? 'Text' : 'Email'}<div className="text-xs">{r.to_phone ?? r.to_email}</div></td>
                  <td className={`${td} text-vekt-grey whitespace-nowrap`}>{formatDate(r.sent_at ?? r.scheduled_for, true)}</td>
                  <td className={td}><StatusBadge status={r.status} /></td>
                  <td className={`${td} text-xs text-vekt-grey max-w-[260px]`}>{r.status_detail ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
