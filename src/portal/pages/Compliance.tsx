import { Fragment, useCallback, useEffect, useState } from 'react';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import { downloadCsv, formatDate, programName, recipientLabel, statusLabel } from '../lib/format';
import type { AuditEntry, ContactRule, Invitation, Program } from '../lib/types';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Segmented, Select, Spinner,
  StatusBadge, Table, Toggle, td, th,
} from '../components/ui';

type Tab = 'approvals' | 'blocked' | 'log' | 'rules' | 'audit';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const OVERRIDABLE = (detail: string | null) =>
  !!detail && (detail.startsWith('Recruiting contact not permitted') || detail.startsWith('Already invited'));

export default function Compliance() {
  const { can, programs } = usePortal();
  const [tab, setTab] = useState<Tab>('approvals');

  if (!can('compliance')) {
    return (
      <>
        <PageHeader eyebrow="Compliance" title="Compliance" />
        <Panel><Empty title="This page is for your compliance office." hint="Ask your compliance officer about approvals and contact rules." /></Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Compliance" title="Compliance"
        subtitle="Approve sends, review blocks, read every message sent, and keep recruiting-contact rules current." />
      <div className="mb-8 overflow-x-auto">
        <Segmented<Tab> label="Compliance section" value={tab} onChange={setTab} options={[
          { value: 'approvals', label: 'Approvals' }, { value: 'blocked', label: 'Blocked' },
          { value: 'log', label: 'Message log' }, { value: 'rules', label: 'Contact rules' }, { value: 'audit', label: 'Audit log' },
        ]} />
      </div>
      {tab === 'approvals' && <Queue kind="approvals" programs={programs} />}
      {tab === 'blocked' && <Queue kind="blocked" programs={programs} />}
      {tab === 'log' && <MessageLog programs={programs} />}
      {tab === 'rules' && <Rules />}
      {tab === 'audit' && <Audit />}
    </>
  );
}

function progLabel(programs: Program[], id: string) {
  const p = programs.find((x) => x.id === id);
  return p ? programName(p) : '—';
}

function Message({ inv }: { inv: Invitation }) {
  return (
    <div className="bg-vekt-black border border-white/[0.08] rounded p-4 text-sm">
      {inv.rendered_subject && <div className="text-white mb-2">Subject: {inv.rendered_subject}</div>}
      <div className="whitespace-pre-wrap text-vekt-grey font-light">{inv.rendered_body}</div>
    </div>
  );
}

function Queue({ kind, programs }: { kind: 'approvals' | 'blocked'; programs: Program[] }) {
  const [items, setItems] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.listInvitations({ statuses: [kind === 'approvals' ? 'pending_approval' : 'blocked'], limit: 300 })
      .then(setItems).catch((e) => setError((e as Error).message));
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  async function act(inv: Invitation, decision: 'approve' | 'reject' | 'release') {
    const reason = (reasons[inv.id] ?? '').trim();
    if (decision === 'release' && reason.length < 10) { setError('Give a reason of at least 10 characters for the override.'); return; }
    if (decision === 'reject' && !reason) { setError('Add a short reason before rejecting.'); return; }
    setBusy(inv.id + decision); setError(null);
    try {
      await api.reviewInvitation(inv.id, decision, reason || undefined);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!items) return error ? <ErrorNote message={error} /> : <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      {kind === 'blocked' && (
        <p className="text-sm text-vekt-grey font-light max-w-3xl">
          Only contact-date and duplicate blocks can be overridden, with a logged reason. Opt-outs, missing contact details and
          minors without a parent/guardian contact can never be released.
        </p>
      )}
      {error && <ErrorNote message={error} />}
      {items.length === 0 && (
        <Panel><Empty title={kind === 'approvals' ? 'Nothing waiting for approval.' : 'No blocked sends.'} /></Panel>
      )}
      {items.map((inv, idx) => {
        const overridable = OVERRIDABLE(inv.status_detail);
        return (
          <Panel key={inv.id}>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-white">{inv.recipient_name}</div>
                  <div className="text-xs text-vekt-grey mt-1">
                    {recipientLabel[inv.recipient_type]} · {inv.channel === 'sms' ? 'SMS' : 'Email'} · {inv.to_phone ?? inv.to_email ?? 'no contact'} ·{' '}
                    {progLabel(programs, inv.program_id)} · {formatDate(inv.created_at, true)}
                  </div>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              {kind === 'blocked' && <p className="text-sm text-white">Reason: {inv.status_detail ?? 'Not recorded'}</p>}
              <Message inv={inv} />
              {(kind === 'approvals' || overridable) ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <Field label={kind === 'blocked' ? 'Override or rejection reason' : 'Reason (required to reject)'} className="flex-1">
                    <Input value={reasons[inv.id] ?? ''} onChange={(e) => setReasons({ ...reasons, [inv.id]: e.target.value })}
                      placeholder={kind === 'blocked' ? 'e.g. Verified contact window with NCAA bylaw, ref #' : 'Optional when approving'} />
                  </Field>
                  <div className="flex gap-3">
                    {kind === 'approvals'
                      ? <Button variant={idx === 0 ? 'primary' : 'secondary'} loading={busy === inv.id + 'approve'} onClick={() => act(inv, 'approve')}>Approve</Button>
                      : <Button variant="secondary" loading={busy === inv.id + 'release'} onClick={() => act(inv, 'release')}>Release with override</Button>}
                    <Button variant="ghost" loading={busy === inv.id + 'reject'} onClick={() => act(inv, 'reject')}>Reject</Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-vekt-grey">This block can't be overridden.</p>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function MessageLog({ programs }: { programs: Program[] }) {
  const [items, setItems] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.listInvitations({ limit: 200 }).then(setItems).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!items) return <Spinner />;

  const exportCsv = () => downloadCsv('vekt-message-log.csv', items.map((i) => ({
    created_at: i.created_at, sent_at: i.sent_at, program: progLabel(programs, i.program_id), recipient: i.recipient_name,
    recipient_type: i.recipient_type, channel: i.channel, to: i.to_phone ?? i.to_email, status: statusLabel[i.status],
    detail: i.status_detail, compliance_override: i.compliance_override, override_reason: i.override_reason,
    subject: i.rendered_subject, body: i.rendered_body,
  })));

  return (
    <Panel>
      <PanelTitle action={<Button variant="ghost" onClick={exportCsv} disabled={items.length === 0}>Export CSV</Button>}>
        Last {items.length} messages
      </PanelTitle>
      {items.length === 0 ? <Empty title="No messages yet." /> : (
        <Table>
          <thead>
            <tr>
              <th className={th}>Sent</th><th className={th}>Recipient</th><th className={th}>Channel</th>
              <th className={th}>Program</th><th className={th}>Status</th><th className={th}><span className="sr-only">Content</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <Fragment key={i.id}>
                <tr>
                  <td className={`${td} whitespace-nowrap text-vekt-grey`}>{formatDate(i.sent_at ?? i.created_at, true)}</td>
                  <td className={td}><span className="text-white">{i.recipient_name}</span>
                    <div className="text-xs text-vekt-grey">{recipientLabel[i.recipient_type]}</div></td>
                  <td className={`${td} whitespace-nowrap`}>{i.channel === 'sms' ? 'SMS' : 'Email'}</td>
                  <td className={`${td} whitespace-nowrap text-vekt-grey`}>{progLabel(programs, i.program_id)}</td>
                  <td className={td}><StatusBadge status={i.status} />{i.compliance_override && <div className="text-xs text-vekt-grey mt-1">Override</div>}</td>
                  <td className={td}>
                    <button className="text-sm text-white underline underline-offset-4 min-h-[32px]" aria-expanded={open === i.id}
                      onClick={() => setOpen(open === i.id ? null : i.id)}>{open === i.id ? 'Hide' : 'View'}</button>
                  </td>
                </tr>
                {open === i.id && (
                  <tr><td colSpan={6} className={td}><Message inv={i} /></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function ruleText(r: ContactRule) {
  const y = r.years_before_grad;
  return `Contact opens ${MONTHS[r.permitted_month - 1]} ${r.permitted_day}, ${y === 0 ? 'of the graduation year' : `${y} year${y === 1 ? '' : 's'} before graduation`}`;
}

const BLANK = { sport: '', gender: '', years_before_grad: '2', permitted_month: '6', permitted_day: '15', verified: false, source_note: '' };

function Rules() {
  const { department, staff } = usePortal();
  const [rules, setRules] = useState<ContactRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.listContactRules().then(setRules).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  function startEdit(r?: ContactRule) {
    setError(null);
    setEditing(r ? r.id : 'new');
    setForm(r ? {
      sport: r.sport ?? '', gender: r.gender ?? '', years_before_grad: String(r.years_before_grad),
      permitted_month: String(r.permitted_month), permitted_day: String(r.permitted_day), verified: r.verified, source_note: r.source_note ?? '',
    } : BLANK);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!department) return;
    const years = Number(form.years_before_grad), month = Number(form.permitted_month), day = Number(form.permitted_day);
    if (!Number.isInteger(years) || years < 0 || years > 6) { setError('Years before graduation must be 0–6.'); return; }
    if (!Number.isInteger(day) || day < 1 || day > 31) { setError('Day must be 1–31.'); return; }
    setBusy(true); setError(null);
    try {
      await api.saveContactRule({
        department_id: department.id, division: department.division, sport: form.sport.trim() || null,
        gender: (form.gender || null) as ContactRule['gender'], years_before_grad: years, permitted_month: month, permitted_day: day,
        verified: form.verified, source_note: form.source_note.trim() || null,
      }, editing === 'new' ? undefined : editing ?? undefined, staff?.id);
      setEditing(null);
      load();
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this contact rule? Sends for this sport may be blocked until a rule exists.')) return;
    try { await api.deleteContactRule(id); load(); } catch (e) { setError((e as Error).message); }
  }

  if (!rules) return error ? <ErrorNote message={error} /> : <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-dashed border-white/50 rounded p-5 text-sm text-white">
        Dates must come from your compliance office. Rules marked Not verified are placeholders.
        <span className="block text-vekt-grey mt-1">Department rules override VEKT defaults; sport-specific rules override division-wide ones.</span>
      </div>
      {error && <ErrorNote message={error} />}
      <Panel>
        <PanelTitle action={editing === null && <Button variant="secondary" onClick={() => startEdit()}>Add rule</Button>}>Recruiting-contact rules</PanelTitle>
        {rules.length === 0 ? <Empty title="No rules yet." hint="Until a rule exists for a sport, invitations to prospects are blocked." /> : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Scope</th><th className={th}>Division</th><th className={th}>Sport</th><th className={th}>Rule</th>
                <th className={th}>Status</th><th className={th}>Source</th><th className={th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>{r.department_id ? 'This department' : 'VEKT default'}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.division}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.sport ? `${r.gender ? `${r.gender === 'mens' ? "Men's" : r.gender === 'womens' ? "Women's" : 'Coed'} ` : ''}${r.sport}` : 'All sports'}</td>
                  <td className={`${td} text-white`}>{ruleText(r)}</td>
                  <td className={td}>{r.verified ? <Badge tone="done">Verified</Badge> : <Badge tone="warn">Not verified</Badge>}</td>
                  <td className={`${td} text-vekt-grey text-xs max-w-[240px]`}>{r.source_note ?? '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {r.department_id ? (
                      <span className="flex gap-3">
                        <button className="text-sm text-white underline underline-offset-4" onClick={() => startEdit(r)}>Edit</button>
                        <button className="text-sm text-vekt-grey underline underline-offset-4" onClick={() => remove(r.id)}>Delete</button>
                      </span>
                    ) : <span className="text-xs text-vekt-grey">Read-only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {editing !== null && (
          <form onSubmit={save} className="px-6 py-6 border-t border-white/[0.08] flex flex-col gap-5">
            <div className="vekt-label">{editing === 'new' ? 'New department rule' : 'Edit rule'} · {department?.division}</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Sport" hint="Blank = every sport"><Input value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} placeholder="Soccer" /></Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">All</option><option value="mens">Men's</option><option value="womens">Women's</option><option value="coed">Coed</option>
                </Select>
              </Field>
              <Field label="Years before graduation">
                <Input type="number" min={0} max={6} value={form.years_before_grad} onChange={(e) => setForm({ ...form, years_before_grad: e.target.value })} />
              </Field>
              <Field label="Month">
                <Select value={form.permitted_month} onChange={(e) => setForm({ ...form, permitted_month: e.target.value })}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Day"><Input type="number" min={1} max={31} value={form.permitted_day} onChange={(e) => setForm({ ...form, permitted_day: e.target.value })} /></Field>
              <Field label="Source note"><Input value={form.source_note} onChange={(e) => setForm({ ...form, source_note: e.target.value })} placeholder="Bylaw reference, reviewed by…" /></Field>
            </div>
            <Toggle checked={form.verified} onChange={(v) => setForm({ ...form, verified: v })}
              label="Verified by our compliance office" hint="Leave unchecked if this is a placeholder." />
            <div className="flex gap-3">
              <Button type="submit" variant="secondary" loading={busy}>Save rule</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}

function summarize(detail: Record<string, unknown>) {
  return Object.entries(detail ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

function Audit() {
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.listAudit(200).then(setItems).catch((e) => setError((e as Error).message)); }, []);
  if (error) return <ErrorNote message={error} />;
  if (!items) return <Spinner />;
  return (
    <Panel>
      <PanelTitle>Audit log · append-only</PanelTitle>
      {items.length === 0 ? <Empty title="No activity recorded yet." /> : (
        <Table>
          <thead><tr><th className={th}>Time</th><th className={th}>Action</th><th className={th}>Entity</th><th className={th}>Detail</th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className={`${td} whitespace-nowrap text-vekt-grey`}>{formatDate(a.created_at, true)}</td>
                <td className={`${td} whitespace-nowrap text-white font-geist-mono text-xs`}>{a.action}</td>
                <td className={`${td} whitespace-nowrap text-vekt-grey`}>{a.entity}</td>
                <td className={`${td} text-vekt-grey text-xs`}>{summarize(a.detail) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
