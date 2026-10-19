import { useEffect, useMemo, useState } from 'react';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import { formatDate, programName, roleLabel } from '../lib/format';
import type { Staff } from '../lib/types';
import {
  Button, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Textarea,
} from '../components/ui';

const EMPTY = { coaching_style: '', accountability: '', culture: '', locker_room: '' };

export default function Settings() {
  const { can, staff: me, editablePrograms, programId, department } = usePortal();
  const [picked, setPicked] = useState<string | null>(null);
  const current = useMemo(() => {
    const id = picked ?? (programId && editablePrograms.some((p) => p.id === programId) ? programId : null)
      ?? (editablePrograms.length === 1 ? editablePrograms[0].id : null);
    return editablePrograms.find((p) => p.id === id) ?? null;
  }, [picked, programId, editablePrograms]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [profile, setProfile] = useState(EMPTY);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [days, setDays] = useState<[string, string]>(['', '']);
  const [team, setTeam] = useState<Staff[]>([]);
  const [busy, setBusy] = useState<'profile' | 'reminders' | null>(null);

  useEffect(() => {
    if (!current || !department) return;
    let cancelled = false;
    setLoading(true); setError(null); setSaved(null);
    Promise.all([api.getStyleProfile(current.id), api.listStaff(department.id), api.listStaffPrograms()])
      .then(([p, s, links]) => {
        if (cancelled) return;
        setProfile({
          coaching_style: p?.coaching_style ?? '', accountability: p?.accountability ?? '',
          culture: p?.culture ?? '', locker_room: p?.locker_room ?? '',
        });
        setUpdatedAt(p?.updated_at ?? null);
        setDays([String(current.reminder_days[0] ?? ''), String(current.reminder_days[1] ?? '')]);
        setTeam(s.filter((x) => links.some((l) => l.staff_id === x.id && l.program_id === current.id)));
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [current, department]);

  if (!can('settings')) {
    return (
      <>
        <PageHeader eyebrow="Program settings" title="Settings" />
        <Panel><Empty title="Program settings are for coaching staff." hint="Head and assistant coaches manage their program here." /></Panel>
      </>
    );
  }

  const isHead = me?.role === 'head_coach';

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !me) return;
    setBusy('profile'); setError(null); setSaved(null);
    try {
      await api.saveStyleProfile({
        program_id: current.id,
        coaching_style: profile.coaching_style.trim() || null, accountability: profile.accountability.trim() || null,
        culture: profile.culture.trim() || null, locker_room: profile.locker_room.trim() || null,
      }, me.id);
      setUpdatedAt(new Date().toISOString());
      setSaved('Coaching profile saved.');
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveReminders(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    const values = days.map((d) => d.trim()).filter(Boolean).map(Number);
    if (values.some((v) => !Number.isInteger(v) || v < 1 || v > 30)) { setError('Reminder days must be whole numbers from 1 to 30.'); return; }
    setBusy('reminders'); setError(null); setSaved(null);
    try {
      await api.updateReminderDays(current.id, values);
      setSaved('Reminder cadence saved.');
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Program settings" title={current ? programName(current) : 'Settings'}
        subtitle="How your staff coaches, and how VEKT follows up on invitations." />

      {editablePrograms.length > 1 && (
        <div className="mb-8 max-w-sm">
          <Field label="Program">
            <Select value={current?.id ?? ''} onChange={(e) => setPicked(e.target.value || null)}>
              <option value="">Choose a program</option>
              {editablePrograms.map((p) => <option key={p.id} value={p.id}>{programName(p)}</option>)}
            </Select>
          </Field>
        </div>
      )}

      {!current ? (
        <Panel><Empty title="Choose a program to edit its settings." /></Panel>
      ) : loading ? <Spinner /> : (
        <div className="flex flex-col gap-6">
          {error && <ErrorNote message={error} />}
          {saved && <p role="status" className="text-sm text-white">{saved}</p>}

          <Panel>
            <PanelTitle>Coaching style profile</PanelTitle>
            <form onSubmit={saveProfile} className="px-6 py-6 flex flex-col gap-5">
              <p className="text-sm text-vekt-grey font-light max-w-2xl">
                VEKT's Coach Agent reads every prospect against this. Be honest about how your staff coaches.
              </p>
              <Field label="Coaching style" hint="e.g. demanding and high-volume, teaching-first, player-led">
                <Textarea value={profile.coaching_style} onChange={(e) => setProfile({ ...profile, coaching_style: e.target.value })} />
              </Field>
              <Field label="Accountability" hint="How feedback is given: public, private, film-based">
                <Textarea value={profile.accountability} onChange={(e) => setProfile({ ...profile, accountability: e.target.value })} />
              </Field>
              <Field label="Culture">
                <Textarea value={profile.culture} onChange={(e) => setProfile({ ...profile, culture: e.target.value })} />
              </Field>
              <Field label="Locker room" hint="The personality types that thrive here, and the ones that struggle">
                <Textarea value={profile.locker_room} onChange={(e) => setProfile({ ...profile, locker_room: e.target.value })} />
              </Field>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" variant="primary" loading={busy === 'profile'}>Save profile</Button>
                {updatedAt && <span className="text-xs text-vekt-grey">Last updated {formatDate(updatedAt, true)}</span>}
              </div>
            </form>
          </Panel>

          <Panel>
            <PanelTitle>Reminders</PanelTitle>
            <form onSubmit={saveReminders} className="px-6 py-6 flex flex-col gap-5">
              <p className="text-sm text-vekt-grey font-light max-w-2xl">
                If an athlete hasn't started their conversation, VEKT sends up to two reminders. Leave a box blank to skip that reminder.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 max-w-md">
                <Field label="Reminder 1 (days after invite)">
                  <Input type="number" min={1} max={30} disabled={!isHead} value={days[0]} onChange={(e) => setDays([e.target.value, days[1]])} />
                </Field>
                <Field label="Reminder 2 (days after invite)">
                  <Input type="number" min={1} max={30} disabled={!isHead} value={days[1]} onChange={(e) => setDays([days[0], e.target.value])} />
                </Field>
              </div>
              {isHead
                ? <div><Button type="submit" variant="secondary" loading={busy === 'reminders'}>Save reminders</Button></div>
                : <p className="text-xs text-vekt-grey">Only the head coach can change the reminder cadence.</p>}
            </form>
          </Panel>

          <Panel>
            <PanelTitle>Program staff</PanelTitle>
            {team.length === 0 ? <Empty title="No staff linked to this program." /> : (
              <ul>
                {team.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4 border-b border-white/[0.06]">
                    <span className="text-white">{s.first_name} {s.last_name}
                      <span className="text-vekt-grey text-sm"> · {s.title ?? roleLabel[s.role]}</span></span>
                    <span className="text-sm text-vekt-grey">{s.email}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-6 py-4 text-xs text-vekt-grey">Staff changes are made by your athletic department.</p>
          </Panel>
        </div>
      )}
    </>
  );
}
