import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { getProgram, getProgramRoster, updateProgram } from '../../lib/api';
import { Coach, Program } from '../../lib/types';
import { Card, Spinner, ErrorBox, StatusPill } from '../components/ui';
import NotConnected from '../components/NotConnected';

interface AcademicField {
  key: 'enrollment' | 'tuition' | 'acceptance_rate' | 'sat_range' | 'avg_gpa';
  label: string;
  format: (v: number | string | null) => string;
  numeric: boolean;
}

const ACADEMIC_FIELDS: AcademicField[] = [
  { key: 'enrollment', label: 'Enrollment', numeric: true, format: (v) => (v == null ? '—' : Number(v).toLocaleString()) },
  { key: 'tuition', label: 'Tuition (yearly)', numeric: true, format: (v) => (v == null ? '—' : `$${Number(v).toLocaleString()}`) },
  { key: 'acceptance_rate', label: 'Acceptance rate', numeric: true, format: (v) => (v == null ? '—' : `${Number(v)}%`) },
  { key: 'sat_range', label: 'SAT range', numeric: false, format: (v) => (v == null || v === '' ? '—' : String(v)) },
  { key: 'avg_gpa', label: 'Average GPA', numeric: true, format: (v) => (v == null ? '—' : String(Number(v))) },
];

export default function ProgramProfile() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [roster, setRoster] = useState<Coach[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!isConfigured || !id) return;
    getProgram(id)
      .then(async (p) => {
        setProgram(p);
        setRoster(await getProgramRoster(p.school, p.sport));
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(load, [load]);

  if (!isConfigured) return <NotConnected feature="program profiles" />;
  if (error) return <ErrorBox message={error} />;
  if (!program) return <Spinner />;

  function startEdit() {
    const p = program;
    if (!p) return;
    setDraft(Object.fromEntries(ACADEMIC_FIELDS.map((f) => [f.key, p[f.key] == null ? '' : String(p[f.key])])));
    setEditing(true);
  }

  async function save() {
    if (!id) return;
    setSaving(true);
    try {
      const fields: Partial<Program> = {};
      for (const f of ACADEMIC_FIELDS) {
        const raw = draft[f.key]?.trim() ?? '';
        (fields as Record<string, unknown>)[f.key] = raw === '' ? null : f.numeric ? Number(raw) : raw;
      }
      await updateProgram(id, fields);
      setEditing(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link to="/app/programs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Program Directory
      </Link>

      <Card className="p-6 mb-6">
        <h1 className="text-2xl font-bold">{program.school}</h1>
        <div className="text-gray-400 mt-1">
          {program.sport}
          {program.division ? ` · ${program.division}` : ''}
          {program.conference ? ` · ${program.conference}` : ''}
          {program.state ? ` · ${program.state}` : ''}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Academic Stats</h2>
            {editing ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-white" aria-label="Cancel">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={save} disabled={saving} className="text-[#FF6666] hover:text-white disabled:opacity-50" aria-label="Save">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={startEdit} className="text-gray-500 hover:text-white" aria-label="Edit stats">
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            {ACADEMIC_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4">
                <dt className="text-gray-500">{f.label}</dt>
                {editing ? (
                  <input
                    value={draft[f.key] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    className="w-40 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-2 py-1 text-right text-white focus:outline-none focus:border-[#FF0000]/60"
                  />
                ) : (
                  <dd className="text-gray-200">{f.format(program[f.key])}</dd>
                )}
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Current Coaching Staff</h2>
          {roster.length === 0 ? (
            <div className="text-sm text-gray-500">No active coaches on file for this program.</div>
          ) : (
            <ul className="space-y-2">
              {roster.map((c) => (
                <li key={c.id} className="flex items-center justify-between bg-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm">
                  <div>
                    <Link to={`/app/coaches/${c.id}`} className="text-white font-medium hover:text-[#FF6666]">
                      {c.first_name} {c.last_name}
                    </Link>
                    <div className="text-xs text-gray-500">{c.title ?? 'Coach'}</div>
                  </div>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
