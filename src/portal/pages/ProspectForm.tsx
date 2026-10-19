import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import { normalizeEmail, normalizePhone } from '../lib/csv';
import { programName } from '../lib/format';
import { Button, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Textarea } from '../components/ui';

const blank = {
  program_id: '', first_name: '', last_name: '', preferred_name: '', mobile: '', email: '', grad_year: '', dob: '',
  positions: '', high_school: '', club_team: '', club_level: '', city: '', state: '', film_links: '', gpa: '',
  guardian_name: '', guardian_mobile: '', guardian_email: '', guardian_relationship: '', priority: 'B', tags: '', notes: '',
};
type Form = typeof blank;

export default function ProspectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { editablePrograms, programId } = usePortal();
  const [form, setForm] = useState<Form | null>(id ? null : { ...blank, program_id: programId && editablePrograms.some((p) => p.id === programId) ? programId : editablePrograms[0]?.id ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getProspect(id).then((p) => {
      if (!p) { setError('Prospect not found'); return; }
      setForm({
        program_id: p.program_id, first_name: p.first_name, last_name: p.last_name, preferred_name: p.preferred_name ?? '',
        mobile: p.mobile ?? '', email: p.email ?? '', grad_year: p.grad_year?.toString() ?? '', dob: p.dob ?? '',
        positions: p.positions.join(', '), high_school: p.high_school ?? '', club_team: p.club_team ?? '', club_level: p.club_level ?? '',
        city: p.city ?? '', state: p.state ?? '', film_links: p.film_links.join('\n'), gpa: p.gpa?.toString() ?? '',
        guardian_name: p.guardian_name ?? '', guardian_mobile: p.guardian_mobile ?? '', guardian_email: p.guardian_email ?? '',
        guardian_relationship: p.guardian_relationship ?? '', priority: p.priority, tags: p.tags.join(', '), notes: p.notes ?? '',
      });
    }).catch((e) => setError(e.message));
  }, [id]);

  if (editablePrograms.length === 0) return <Empty title="Only coaching staff can add prospects" />;
  if (!form) return error ? <ErrorNote message={error} /> : <Spinner />;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const list = (s: string, sep = /[,;\n]/) => s.split(sep).map((x) => x.trim()).filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const phone = (v: string, label: string) => {
      if (!v.trim()) return null;
      const n = normalizePhone(v);
      if (!n) throw new Error(`${label}: enter a full number with area code.`);
      return n;
    };
    const email = (v: string, label: string) => {
      if (!v.trim()) return null;
      const n = normalizeEmail(v);
      if (!n) throw new Error(`${label}: enter a valid email.`);
      return n;
    };
    setSaving(true);
    try {
      const mobile = phone(form.mobile, 'Mobile');
      const mail = email(form.email, 'Email');
      if (!mobile && !mail) throw new Error('Add a mobile number or email so VEKT can reach them.');
      const saved = await api.saveProspect({
        program_id: form.program_id,
        first_name: form.first_name.trim(), last_name: form.last_name.trim(), preferred_name: form.preferred_name.trim() || null,
        mobile, email: mail, grad_year: form.grad_year ? Number(form.grad_year) : null, dob: form.dob || null,
        positions: list(form.positions), high_school: form.high_school.trim() || null, club_team: form.club_team.trim() || null,
        club_level: form.club_level.trim() || null, city: form.city.trim() || null, state: form.state.trim().toUpperCase() || null,
        film_links: list(form.film_links, /[\s,]+/), gpa: form.gpa ? Number(form.gpa) : null,
        guardian_name: form.guardian_name.trim() || null, guardian_mobile: phone(form.guardian_mobile, 'Parent/guardian mobile'),
        guardian_email: email(form.guardian_email, 'Parent/guardian email'), guardian_relationship: form.guardian_relationship.trim() || null,
        priority: form.priority as 'A' | 'B' | 'C', tags: list(form.tags), notes: form.notes.trim() || null,
      }, id);
      navigate(`/portal/prospects/${saved.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader eyebrow="Prospects" title={id ? 'Edit prospect' : 'Add prospect'}
        subtitle="A mobile number or email is required. Athletes under 18 also need a parent or guardian contact before they can be invited." />
      <div className="grid gap-6 max-w-4xl">
        <Panel>
          <PanelTitle>Athlete</PanelTitle>
          <div className="p-6 grid gap-5 sm:grid-cols-2">
            {!id && editablePrograms.length > 1 && (
              <Field label="Program" className="sm:col-span-2">
                <Select value={form.program_id} onChange={set('program_id')}>
                  {editablePrograms.map((p) => <option key={p.id} value={p.id}>{programName(p)}</option>)}
                </Select>
              </Field>
            )}
            <Field label="First name"><Input required value={form.first_name} onChange={set('first_name')} /></Field>
            <Field label="Last name"><Input required value={form.last_name} onChange={set('last_name')} /></Field>
            <Field label="Preferred name"><Input value={form.preferred_name} onChange={set('preferred_name')} /></Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={set('priority')}><option>A</option><option>B</option><option>C</option></Select>
            </Field>
            <Field label="Mobile"><Input type="tel" value={form.mobile} onChange={set('mobile')} placeholder="(555) 555-0100" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Grad year"><Input type="number" min={2000} max={2100} value={form.grad_year} onChange={set('grad_year')} /></Field>
            <Field label="Date of birth" hint="Optional. Used to tell whether they're under 18."><Input type="date" value={form.dob} onChange={set('dob')} /></Field>
            <Field label="Position(s)" hint="Comma-separated"><Input value={form.positions} onChange={set('positions')} /></Field>
            <Field label="GPA"><Input type="number" step="0.01" min={0} max={5} value={form.gpa} onChange={set('gpa')} /></Field>
            <Field label="High school"><Input value={form.high_school} onChange={set('high_school')} /></Field>
            <Field label="Club team"><Input value={form.club_team} onChange={set('club_team')} /></Field>
            <Field label="Club level / league"><Input value={form.club_level} onChange={set('club_level')} /></Field>
            <div className="grid grid-cols-[1fr_96px] gap-3">
              <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
              <Field label="State"><Input maxLength={2} value={form.state} onChange={set('state')} /></Field>
            </div>
            <Field label="Film link(s)" className="sm:col-span-2"><Textarea value={form.film_links} onChange={set('film_links')} placeholder="One per line" /></Field>
            <Field label="Tags" hint="Comma-separated"><Input value={form.tags} onChange={set('tags')} /></Field>
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Parent / guardian</PanelTitle>
          <div className="p-6 grid gap-5 sm:grid-cols-2">
            <Field label="Name"><Input value={form.guardian_name} onChange={set('guardian_name')} /></Field>
            <Field label="Relationship"><Input value={form.guardian_relationship} onChange={set('guardian_relationship')} placeholder="Parent" /></Field>
            <Field label="Mobile"><Input type="tel" value={form.guardian_mobile} onChange={set('guardian_mobile')} /></Field>
            <Field label="Email"><Input type="email" value={form.guardian_email} onChange={set('guardian_email')} /></Field>
          </div>
        </Panel>

        <Panel>
          <PanelTitle>Staff notes</PanelTitle>
          <div className="p-6">
            <Field label="Private to your program"><Textarea value={form.notes} onChange={set('notes')} /></Field>
          </div>
        </Panel>

        {error && <ErrorNote message={error} />}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={saving}>{id ? 'Save changes' : 'Add prospect'}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
        {!id && <p className="text-sm text-vekt-grey">Add their club coach or director from the prospect's page after saving.</p>}
      </div>
    </form>
  );
}
