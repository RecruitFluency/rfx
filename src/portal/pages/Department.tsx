import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/supabase';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import { formatDate, formatUsd, programName, roleLabel } from '../lib/format';
import type { Invitation, Staff, StaffRole } from '../lib/types';
import {
  Badge, Button, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Table, Toggle, td, th,
} from '../components/ui';

const INVITED = (s: string) => !['blocked', 'cancelled', 'rejected'].includes(s);
const DELIVERED = ['delivered', 'clicked', 'replied', 'started', 'completed'];
const STARTED = ['started', 'completed'];

export default function Department() {
  const { can, department, programs, staff: me, superAdmin, refresh } = usePortal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [links, setLinks] = useState<{ staff_id: string; program_id: string }[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [reads, setReads] = useState<{ program_id: string; brief_status: string }[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [toggling, setToggling] = useState(false);

  const deptPrograms = useMemo(
    () => programs.filter((p) => !department || p.department_id === department.id), [programs, department]);

  const load = useCallback(async () => {
    if (!department) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const ids = deptPrograms.map((p) => p.id);
      const [s, l, inv, pr, rd] = await Promise.all([
        api.listStaff(department.id),
        api.listStaffPrograms(),
        api.listInvitations({ programIds: ids, limit: 5000 }),
        api.pricing(),
        ids.length
          ? db().from('portal_reads').select('program_id, brief_status').in('program_id', ids)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (rd.error) throw new Error(rd.error.message);
      setStaff(s); setLinks(l); setInvites(inv); setPrices(pr);
      setReads((rd.data ?? []) as { program_id: string; brief_status: string }[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [department, deptPrograms]);

  useEffect(() => { load(); }, [load]);

  if (!can('department')) {
    return (
      <>
        <PageHeader eyebrow="Department" title="Department" />
        <Panel><Empty title="This page is for your athletic department and compliance office."
          hint="Ask your athletic department if you need license or staff details." /></Panel>
      </>
    );
  }
  if (!department) {
    return (
      <>
        <PageHeader eyebrow="Department" title="Department" />
        <Panel><Empty title="No department selected." hint="Sign in as department staff to see license and program details." /></Panel>
      </>
    );
  }

  const allSports = department.license_type === 'all_sports';
  const licensed = deptPrograms.filter((p) => allSports || p.licensed);
  const n = licensed.length;
  const quote = prices.all_sports != null && prices.single_sport != null && prices.additional_sport != null
    ? Math.min(prices.all_sports, n <= 0 ? 0 : prices.single_sport + (n - 1) * prices.additional_sport)
    : null;
  const canToggle = superAdmin || me?.role === 'dept_admin' || me?.role === 'compliance';
  const isAdmin = superAdmin || me?.role === 'dept_admin';

  async function toggleApproval(on: boolean) {
    setToggling(true);
    try {
      await api.setApprovalMode(department!.id, on);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Athletic department" title={department.name}
        subtitle={`${department.division}${department.conference ? ` · ${department.conference}` : ''}`} />
      {error && <div className="mb-6"><ErrorNote message={error} /></div>}

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Panel>
          <PanelTitle>License</PanelTitle>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-6 text-sm">
            <Item label="License" value={allSports ? 'All sports' : 'Per sport'} />
            <Item label="Billing" value={<Badge tone={department.billing_status === 'paid' ? 'done' : department.billing_status === 'overdue' ? 'bad' : 'progress'}>{department.billing_status}</Badge>} />
            <Item label="Term" value={`${formatDate(department.license_start)} – ${formatDate(department.license_end)}`} />
            <Item label="Licensed programs" value={`${n} of ${deptPrograms.length}`} />
            <Item label="Annual" value={quote != null ? formatUsd(quote) : '—'} />
          </dl>
          {prices.all_sports != null && (
            <p className="px-6 pb-6 text-xs text-vekt-grey">
              Published rates: all sports {formatUsd(prices.all_sports)} / year · single sport {formatUsd(prices.single_sport ?? 0)} ·
              each additional sport {formatUsd(prices.additional_sport ?? 0)}. You pay whichever is lower.
            </p>
          )}
        </Panel>

        <Panel>
          <PanelTitle>Compliance approval</PanelTitle>
          <div className="px-6 py-6 flex flex-col gap-4">
            <p className="text-sm text-vekt-grey font-light">
              When approval mode is on, every invitation waits for your compliance officer to approve it before anything is sent.
            </p>
            <Toggle checked={department.approval_mode} disabled={!canToggle || toggling} onChange={toggleApproval}
              label={department.approval_mode ? 'Approval mode is on' : 'Approval mode is off'}
              hint={canToggle ? 'Changes are recorded in the audit log.' : 'Only the athletic department or compliance can change this.'} />
          </div>
        </Panel>
      </div>

      <Panel className="mb-6">
        <PanelTitle>Programs</PanelTitle>
        {loading ? <Spinner /> : deptPrograms.length === 0 ? <Empty title="No programs yet." /> : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Program</th><th className={th}>Licensed</th><th className={th}>Staff</th>
                <th className={th}>Invited</th><th className={th}>Delivered</th><th className={th}>Started</th><th className={th}>Briefs ready</th>
              </tr>
            </thead>
            <tbody>
              {deptPrograms.map((p) => {
                const athlete = invites.filter((i) => i.program_id === p.id && i.recipient_type === 'athlete');
                const programStaff = staff.filter((s) => links.some((l) => l.staff_id === s.id && l.program_id === p.id));
                return (
                  <tr key={p.id}>
                    <td className={`${td} text-white whitespace-nowrap`}>{programName(p)}</td>
                    <td className={td}>{allSports || p.licensed ? <Badge tone="done">Licensed</Badge> : <Badge>Not licensed</Badge>}</td>
                    <td className={`${td} text-vekt-grey`}>{programStaff.map((s) => `${s.first_name} ${s.last_name}`).join(', ') || '—'}</td>
                    <td className={td}>{athlete.filter((i) => INVITED(i.status)).length}</td>
                    <td className={td}>{athlete.filter((i) => DELIVERED.includes(i.status)).length}</td>
                    <td className={td}>{athlete.filter((i) => STARTED.includes(i.status)).length}</td>
                    <td className={td}>{reads.filter((r) => r.program_id === p.id && r.brief_status === 'ready').length}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelTitle>Staff</PanelTitle>
        {loading ? <Spinner /> : (
          <Table>
            <thead>
              <tr><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Email</th><th className={th}>Status</th></tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className={`${td} text-white whitespace-nowrap`}>{s.first_name} {s.last_name}
                    {s.title && <div className="text-xs text-vekt-grey">{s.title}</div>}</td>
                  <td className={`${td} whitespace-nowrap`}>{roleLabel[s.role]}</td>
                  <td className={`${td} text-vekt-grey`}>{s.email}</td>
                  <td className={td}>
                    {!s.active ? <Badge tone="bad">Inactive</Badge> : s.user_id ? <Badge tone="progress">Signed in</Badge> : <Badge tone="warn">Invited</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {isAdmin
          ? <AddStaff departmentId={department.id} programs={deptPrograms} onAdded={load} />
          : <p className="px-6 py-5 text-xs text-vekt-grey">Staff changes are made by your athletic department.</p>}
      </Panel>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="vekt-label mb-1.5">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}

function AddStaff({ departmentId, programs, onAdded }:
  { departmentId: string; programs: { id: string; sport: string; gender: 'mens' | 'womens' | 'coed' }[]; onAdded: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', title: '', role: 'head_coach' as StaffRole });
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const coach = form.role === 'head_coach' || form.role === 'assistant_coach';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setDone(null);
    if (!/^[^@\s]+@[^@\s]+\.edu$/i.test(form.email.trim())) { setError('Staff must use a school email ending in .edu.'); return; }
    if (coach && programIds.length === 0) { setError('Choose at least one program for a coach.'); return; }
    setBusy(true);
    try {
      const { data, error: err } = await db().from('portal_staff').insert({
        department_id: departmentId, role: form.role, first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(), title: form.title.trim() || null,
      }).select('id').single();
      if (err) throw new Error(err.code === '23505' ? 'That email is already on a staff list.' : err.message);
      if (coach) {
        const { error: linkErr } = await db().from('portal_staff_programs')
          .insert(programIds.map((program_id) => ({ staff_id: (data as { id: string }).id, program_id })));
        if (linkErr) throw new Error(linkErr.message);
      }
      setDone(`${form.first_name} can now sign in with ${form.email.trim().toLowerCase()}.`);
      setForm({ first_name: '', last_name: '', email: '', title: '', role: 'head_coach' });
      setProgramIds([]);
      onAdded();
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-6 py-6 border-t border-white/[0.08] flex flex-col gap-5">
      <div className="vekt-label">Add staff</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
        <Field label="Last name"><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
        <Field label="School email"><Input type="email" required value={form.email} placeholder="name@school.edu"
          onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
            {(Object.keys(roleLabel) as StaffRole[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </Select>
        </Field>
      </div>
      {coach && (
        <fieldset className="flex flex-col gap-2">
          <legend className="vekt-label mb-2">Programs</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {programs.map((p) => (
              <Toggle key={p.id} label={programName(p)} checked={programIds.includes(p.id)}
                onChange={(v) => setProgramIds((xs) => v ? [...xs, p.id] : xs.filter((x) => x !== p.id))} />
            ))}
          </div>
        </fieldset>
      )}
      {error && <ErrorNote message={error} />}
      {done && <p className="text-sm text-white">{done}</p>}
      <div><Button type="submit" variant="secondary" loading={busy}>Add staff member</Button></div>
    </form>
  );
}
