import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import type { Brief, ClubContact, Invitation, MessageEvent, ProspectOverview, QueueResult } from '../lib/types';
import { eventLabel, formatDate, formatPhone, programName, recipientLabel } from '../lib/format';
import { Badge, Button, ButtonLink, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, StatusBadge } from '../components/ui';
import InviteComposer from '../components/InviteComposer';
import ReadStatus from '../components/ReadStatus';

export default function ProspectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { programs, can, editablePrograms } = usePortal();
  const [p, setP] = useState<ProspectOverview | null | undefined>(undefined);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [contacts, setContacts] = useState<ClubContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [prospect, inv, b, cc] = await Promise.all([
        api.getProspect(id), api.listInvitations({ prospectId: id }), api.latestBrief(id), api.prospectClubContacts(id),
      ]);
      setP(prospect);
      setInvites(inv);
      setBrief(b);
      setContacts(cc);
      setEvents(await api.listEvents(inv.map((i) => i.id)));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const editable = !!p && editablePrograms.some((x) => x.id === p.program_id);
  const program = programs.find((x) => x.id === p?.program_id);

  if (error) return <ErrorNote message={error} />;
  if (p === undefined) return <Spinner />;
  if (p === null) return <Empty title="Prospect not found" hint="They may have been deleted, or they belong to a program you can't see." />;

  const name = `${p.preferred_name ?? p.first_name} ${p.last_name}`;

  const onSent = (r: QueueResult) => {
    setFlash(`${r.queued} invitation${r.queued === 1 ? '' : 's'} queued${r.blocked ? `, ${r.blocked} blocked` : ''}.`);
    load();
  };

  async function act(fn: () => Promise<unknown>, done: string) {
    try { await fn(); setFlash(done); await load(); } catch (e) { setFlash((e as Error).message); }
  }

  async function remove() {
    if (!window.confirm(`Delete ${name}? This removes their record, invitations and brief from the portal, and can't be undone.`)) return;
    try { await api.deleteProspect(id); navigate('/portal/prospects'); } catch (e) { setFlash((e as Error).message); }
  }

  return (
    <div>
      <Link to="/portal/prospects" className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white mb-6 min-h-[32px]">
        <ArrowLeft className="w-4 h-4" /> Prospects
      </Link>
      <PageHeader eyebrow={program ? programName(program) : undefined} title={name}
        subtitle={[p.positions.join(' / '), p.grad_year ? `Class of ${p.grad_year}` : null, p.club_team, p.state].filter(Boolean).join(' · ')}
        actions={editable ? <>
          <ButtonLink to={`/portal/prospects/${p.id}/edit`}>Edit</ButtonLink>
          <Button variant="primary" onClick={() => setComposer(true)}>Invite to VEKT</Button>
        </> : undefined} />

      {flash && <div role="status" className="mb-6 border border-white/30 rounded px-4 py-3 text-sm text-white">{flash}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6 min-w-0">
          <Panel>
            <PanelTitle action={<ReadStatus p={p} />}>Prospect brief</PanelTitle>
            {brief ? <BriefView brief={brief} /> : (
              <div className="px-6 py-8">
                <div className="grid sm:grid-cols-3 gap-6 mb-6">
                  <Step label="Athlete conversation" value={p.athlete_status} />
                  <Step label="Club director's read" value={p.director_status} />
                  <Step label="Brief" value={p.brief_status === 'in_progress' ? 'in_progress' : 'not_started'} />
                </div>
                <p className="text-sm text-vekt-grey">
                  The brief appears here when VEKT has finished its conversations. You'll see VEKT's synthesized read only,
                  never the athlete's or director's own words.
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelTitle>Invitations</PanelTitle>
            {invites.length === 0 ? <Empty title="Not invited yet" hint="Invite them and their club director to start VEKT's read." /> : (
              <ul>
                {invites.map((inv) => (
                  <InviteRow key={inv.id} inv={inv} events={events.filter((e) => e.invitation_id === inv.id)} editable={editable}
                    onCancel={() => act(() => api.cancelInvitation(inv.id), 'Invitation cancelled.')}
                    onResend={() => act(() => api.resendInvitation(inv.id), 'Invitation queued again.')} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelTitle>Contact</PanelTitle>
            <dl className="px-6 py-5 grid gap-4 text-sm">
              <Detail label="Mobile" value={formatPhone(p.mobile)} />
              <Detail label="Email" value={p.email} />
              <Detail label="High school" value={p.high_school} />
              <Detail label="Club" value={[p.club_team, p.club_level].filter(Boolean).join(' · ')} />
              <Detail label="GPA" value={p.gpa?.toString()} />
              <Detail label="Priority" value={p.priority} />
              {p.film_links.length > 0 && (
                <div><dt className="vekt-label mb-1">Film</dt>
                  {p.film_links.map((f) => <dd key={f}><a href={f} target="_blank" rel="noreferrer" className="text-white underline break-all">{f}</a></dd>)}
                </div>
              )}
              {p.tags.length > 0 && <div className="flex flex-wrap gap-2">{p.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
            </dl>
          </Panel>

          <Panel>
            <PanelTitle>Parent / guardian</PanelTitle>
            <dl className="px-6 py-5 grid gap-4 text-sm">
              {p.guardian_name || p.guardian_mobile || p.guardian_email ? <>
                <Detail label="Name" value={[p.guardian_name, p.guardian_relationship && `(${p.guardian_relationship})`].filter(Boolean).join(' ')} />
                <Detail label="Mobile" value={formatPhone(p.guardian_mobile)} />
                <Detail label="Email" value={p.guardian_email} />
              </> : <p className="text-vekt-grey">None on file. Athletes under 18 can't be invited until a parent or guardian contact is added.</p>}
            </dl>
          </Panel>

          <ClubContacts prospectId={p.id} programId={p.program_id} contacts={contacts} editable={editable} onChange={load} />

          {p.notes && (
            <Panel><PanelTitle>Staff notes</PanelTitle><p className="px-6 py-5 text-sm text-white/90 whitespace-pre-wrap">{p.notes}</p></Panel>
          )}

          {editable && can('invite') && (
            <button onClick={remove} className="text-sm text-vekt-grey hover:text-white underline self-start min-h-[32px]">
              Delete prospect (data deletion request)
            </button>
          )}
        </div>
      </div>

      <InviteComposer open={composer} onClose={() => setComposer(false)} prospectIds={[p.id]} prospectLabel={name} onSent={onSent} />
    </div>
  );
}

function Step({ label, value }: { label: string; value: string | null }) {
  const text = { not_started: 'Not started', invited: 'Invited', in_progress: 'In progress', complete: 'Complete' }[value ?? 'not_started'] ?? 'Not started';
  return (
    <div>
      <div className="vekt-label mb-2">{label}</div>
      <Badge tone={value === 'complete' ? 'done' : value === 'in_progress' || value === 'invited' ? 'progress' : 'neutral'}>{text}</Badge>
    </div>
  );
}

function BriefView({ brief }: { brief: Brief }) {
  const rows: [string, string | null][] = [
    ['How they play', brief.plays], ['How they take coaching', brief.takes_coaching],
    ['Locker room', brief.locker_room], ['Against your staff', brief.against_staff],
  ];
  return (
    <div className="px-6 pb-6">
      {rows.map(([label, value]) => value && (
        <div key={label} className="grid sm:grid-cols-[200px_1fr] gap-x-8 gap-y-1 py-5 border-b border-white/[0.08]">
          <div className="vekt-label pt-1">{label}</div>
          <div className="text-[15px] font-light text-white">{value}</div>
        </div>
      ))}
      {brief.summary && <p className="pt-6 text-lg text-white leading-snug">{brief.summary}</p>}
      <div className="pt-4 text-xs text-vekt-grey">Version {brief.version} · {formatDate(brief.created_at)} · Director verified · Triple-blind</div>
    </div>
  );
}

function InviteRow({ inv, events, editable, onCancel, onResend }:
  { inv: Invitation; events: MessageEvent[]; editable: boolean; onCancel: () => void; onResend: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-white/[0.06] last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex flex-wrap items-center gap-3 px-6 py-4 text-left hover:bg-white/[0.02]">
        <span className="flex-1 min-w-[200px]">
          <span className="text-white text-sm">{inv.recipient_name}</span>
          <span className="text-vekt-grey text-sm"> · {recipientLabel[inv.recipient_type]} · {inv.channel === 'sms' ? 'Text' : 'Email'}
            {inv.reminder_number > 0 ? ` · Reminder ${inv.reminder_number}` : ''}</span>
          <span className="block text-xs text-vekt-grey">{formatDate(inv.sent_at ?? inv.scheduled_for, true)}{inv.status_detail ? ` · ${inv.status_detail}` : ''}</span>
        </span>
        <StatusBadge status={inv.status} />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <ol className="border-l border-white/[0.12] ml-1 pl-5 flex flex-col gap-3 mb-4">
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="text-white">{eventLabel[e.event] ?? e.event}</span>
                <span className="text-vekt-grey"> · {formatDate(e.occurred_at, true)}{e.detail && !/^ghl_|^mock_/.test(e.detail) ? ` · ${e.detail}` : ''}</span>
              </li>
            ))}
          </ol>
          {inv.rendered_subject && <div className="text-sm text-white mb-2">Subject: {inv.rendered_subject}</div>}
          <pre className="whitespace-pre-wrap font-geist text-sm text-white/80 bg-vekt-panel rounded p-4">{inv.rendered_body}</pre>
          {editable && (
            <div className="flex gap-3 mt-4">
              {['queued', 'pending_approval'].includes(inv.status) && <Button onClick={onCancel}>Cancel send</Button>}
              {['sent', 'delivered', 'clicked', 'failed', 'cancelled'].includes(inv.status) && <Button onClick={onResend}>Resend</Button>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="vekt-label mb-1">{label}</dt>
      <dd className="text-white break-words">{value || '—'}</dd>
    </div>
  );
}

function ClubContacts({ prospectId, programId, contacts, editable, onChange }:
  { prospectId: string; programId: string; contacts: ClubContact[]; editable: boolean; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [all, setAll] = useState<ClubContact[]>([]);
  const [pick, setPick] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', role: 'club_director' as ClubContact['role'], club: '', mobile: '', email: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (adding) api.listClubContacts([programId]).then(setAll).catch(() => setAll([])); }, [adding, programId]);
  const available = useMemo(() => all.filter((c) => !contacts.some((x) => x.id === c.id)), [all, contacts]);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      let ccId = pick;
      if (!ccId) {
        const { normalizePhone, normalizeEmail } = await import('../lib/csv');
        const mobile = form.mobile ? normalizePhone(form.mobile) : null;
        if (form.mobile && !mobile) throw new Error('Enter a full mobile number with area code.');
        if (!form.first_name || !form.last_name) throw new Error('Enter the club contact\'s name.');
        const email = form.email ? normalizeEmail(form.email) : null;
        if (form.email && !email) throw new Error('Enter a valid email.');
        if (!mobile && !email) throw new Error('Add a mobile number or email so VEKT can reach them.');
        ccId = (await api.saveClubContact({ program_id: programId, first_name: form.first_name, last_name: form.last_name,
          role: form.role, club: form.club || null, mobile, email })).id;
      }
      await api.linkClubContact(prospectId, ccId);
      setAdding(false); setPick('');
      setForm({ first_name: '', last_name: '', role: 'club_director', club: '', mobile: '', email: '' });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelTitle action={editable && !adding ? <button onClick={() => setAdding(true)} className="text-sm text-white underline">Add</button> : undefined}>
        Club coach / director
      </PanelTitle>
      <div className="px-6 py-5 flex flex-col gap-4 text-sm">
        {contacts.length === 0 && !adding && <p className="text-vekt-grey">None linked. Their read is what makes VEKT's brief trustworthy.</p>}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white">{c.first_name} {c.last_name}</div>
              <div className="text-xs text-vekt-grey">{c.role === 'club_director' ? 'Club director' : 'Club coach'}{c.club ? ` · ${c.club}` : ''}</div>
              <div className="text-xs text-vekt-grey">{formatPhone(c.mobile)}{c.email ? ` · ${c.email}` : ''}</div>
            </div>
            {editable && (
              <button onClick={() => api.unlinkClubContact(prospectId, c.id).then(onChange)} className="text-xs text-vekt-grey hover:text-white underline">Remove</button>
            )}
          </div>
        ))}
        {adding && (
          <div className="flex flex-col gap-4 border-t border-white/[0.08] pt-4">
            {available.length > 0 && (
              <Field label="Existing contact">
                <Select value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">New contact…</option>
                  {available.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.club ? ` (${c.club})` : ''}</option>)}
                </Select>
              </Field>
            )}
            {!pick && <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
                <Field label="Last name"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
              </div>
              <Field label="Role">
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ClubContact['role'] })}>
                  <option value="club_director">Club director</option><option value="club_coach">Club coach</option>
                </Select>
              </Field>
              <Field label="Club"><Input value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} /></Field>
              <Field label="Mobile"><Input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </>}
            {error && <ErrorNote message={error} />}
            <div className="flex gap-3">
              <Button onClick={save} loading={busy}>Save</Button>
              <Button variant="ghost" onClick={() => { setAdding(false); setError(null); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
