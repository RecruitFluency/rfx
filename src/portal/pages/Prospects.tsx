import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import type { ProspectOverview, QueueResult } from '../lib/types';
import { downloadCsv, formatPhone, programName, relativeTime } from '../lib/format';
import { Button, ButtonLink, Empty, ErrorNote, Input, PageHeader, Panel, Select, Spinner, Table, td, th } from '../components/ui';
import ReadStatus from '../components/ReadStatus';
import InviteComposer from '../components/InviteComposer';

type Stage = 'all' | 'not_invited' | 'invited' | 'in_progress' | 'brief_ready' | 'attention';

const stageOf = (p: ProspectOverview): Exclude<Stage, 'all'> => {
  if (p.brief_status === 'ready') return 'brief_ready';
  if (p.last_invite_status && ['failed', 'opted_out', 'blocked'].includes(p.last_invite_status)) return 'attention';
  if (p.athlete_status === 'in_progress' || p.athlete_status === 'complete' || p.brief_status === 'in_progress') return 'in_progress';
  if (p.last_invite_status && p.last_invite_status !== 'cancelled') return 'invited';
  return 'not_invited';
};

export default function Prospects() {
  const { scopeProgramIds, programs, can } = usePortal();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProspectOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<Stage>('all');
  const [grad, setGrad] = useState('');
  const [position, setPosition] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composer, setComposer] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(() => {
    api.listProspects(scopeProgramIds).then(setRows).catch((e) => setError(e.message));
  }, [scopeProgramIds]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const grads = useMemo(() => [...new Set((rows ?? []).map((r) => r.grad_year).filter(Boolean))].sort(), [rows]);
  const positions = useMemo(() => [...new Set((rows ?? []).flatMap((r) => r.positions))].sort(), [rows]);
  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, programName(p)])), [programs]);

  const filtered = useMemo(() => (rows ?? []).filter((r) => {
    const text = `${r.first_name} ${r.last_name} ${r.preferred_name ?? ''} ${r.club_team ?? ''} ${r.high_school ?? ''} ${r.email ?? ''} ${r.mobile ?? ''}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase()))
      && (stage === 'all' || stageOf(r) === stage)
      && (!grad || String(r.grad_year) === grad)
      && (!position || r.positions.includes(position))
      && (!priority || r.priority === priority);
  }), [rows, q, stage, grad, position, priority]);

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { all: 0, not_invited: 0, invited: 0, in_progress: 0, brief_ready: 0, attention: 0 };
    (rows ?? []).forEach((r) => { c.all++; c[stageOf(r)]++; });
    return c;
  }, [rows]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const onSent = (r: QueueResult) => {
    setFlash(`${r.queued} invitation${r.queued === 1 ? '' : 's'} ${r.results.some((x) => x.status === 'pending_approval') ? 'sent to compliance for approval' : 'on the way'}${r.blocked ? ` · ${r.blocked} blocked` : ''}.`);
    setSelected(new Set());
    load();
  };

  const exportRows = () => downloadCsv('vekt-prospects.csv', filtered.map((r) => ({
    first_name: r.first_name, last_name: r.last_name, program: programMap.get(r.program_id), grad_year: r.grad_year,
    positions: r.positions, mobile: r.mobile, email: r.email, club_team: r.club_team, state: r.state, priority: r.priority,
    last_invite_status: r.last_invite_status, brief_status: r.brief_status,
  })));

  const stages: { key: Stage; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'not_invited', label: 'Not invited' }, { key: 'invited', label: 'Invited' },
    { key: 'in_progress', label: 'In progress' }, { key: 'brief_ready', label: 'Brief ready' }, { key: 'attention', label: 'Needs attention' },
  ];

  return (
    <div>
      <PageHeader eyebrow="Recruiting board" title="Prospects"
        subtitle="Everyone your staff is recruiting. Select prospects to invite them, and their club directors, to VEKT."
        actions={can('invite') ? <>
          <ButtonLink to="/portal/import">Import CSV</ButtonLink>
          <ButtonLink to="/portal/prospects/new">Add prospect</ButtonLink>
        </> : undefined} />

      {flash && <div role="status" className="mb-6 border border-white/30 rounded px-4 py-3 text-sm text-white">{flash}</div>}

      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Stage">
        {stages.map((s) => (
          <button key={s.key} role="tab" aria-selected={stage === s.key} onClick={() => setStage(s.key)}
            className={`px-3 min-h-[40px] rounded text-sm border ${stage === s.key ? 'bg-white text-vekt-black border-white' : 'border-white/[0.16] text-vekt-grey hover:text-white'}`}>
            {s.label} <span className="opacity-60 ml-1">{counts[s.key]}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/[0.08]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-vekt-grey absolute left-3 top-1/2 -translate-y-1/2" />
            <Input aria-label="Search prospects" className="pl-9" placeholder="Search name, club, school, email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Grad year" className="!w-auto" value={grad} onChange={(e) => setGrad(e.target.value)}>
            <option value="">All classes</option>
            {grads.map((g) => <option key={g} value={String(g)}>Class of {g}</option>)}
          </Select>
          <Select aria-label="Position" className="!w-auto" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">All positions</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select aria-label="Priority" className="!w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Any priority</option>
            <option value="A">Priority A</option><option value="B">Priority B</option><option value="C">Priority C</option>
          </Select>
          <Button variant="ghost" onClick={exportRows} disabled={filtered.length === 0}>Export</Button>
        </div>

        {selected.size > 0 && can('invite') && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
            <span className="text-sm text-white">{selected.size} selected</span>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button variant="primary" onClick={() => setComposer(true)}>Invite {selected.size} to VEKT</Button>
            </div>
          </div>
        )}

        {error && <div className="p-4"><ErrorNote message={error} /></div>}
        {!rows && !error && <Spinner />}
        {rows && filtered.length === 0 && (
          <Empty title={rows.length === 0 ? 'No prospects yet' : 'No prospects match these filters'}
            hint={rows.length === 0 ? 'Add prospects one at a time or import your recruiting board from a spreadsheet.' : undefined}
            action={rows.length === 0 && can('invite') ? <ButtonLink to="/portal/import">Import CSV</ButtonLink> : undefined} />
        )}
        {rows && filtered.length > 0 && (
          <Table>
            <thead>
              <tr>
                {can('invite') && <th className={`${th} w-10`}><input type="checkbox" aria-label="Select all" className="w-4 h-4 accent-white" checked={allSelected} onChange={toggleAll} /></th>}
                <th className={th}>Prospect</th>
                <th className={th}>Class</th>
                <th className={th}>Position</th>
                <th className={th}>Club</th>
                <th className={th}>Contact</th>
                <th className={th}>VEKT status</th>
                <th className={th}>Last invite</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => navigate(`/portal/prospects/${r.id}`)}>
                  {can('invite') && (
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${r.first_name} ${r.last_name}`} className="w-4 h-4 accent-white"
                        checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>
                  )}
                  <td className={td}>
                    <Link to={`/portal/prospects/${r.id}`} className="text-white hover:underline" onClick={(e) => e.stopPropagation()}>
                      {r.preferred_name ?? r.first_name} {r.last_name}
                    </Link>
                    <div className="text-xs text-vekt-grey">
                      {scopeProgramIds.length > 1 ? programMap.get(r.program_id) : `Priority ${r.priority}`}{r.state ? ` · ${r.state}` : ''}
                    </div>
                  </td>
                  <td className={`${td} text-white`}>{r.grad_year ?? '—'}</td>
                  <td className={`${td} text-vekt-grey`}>{r.positions.join(', ') || '—'}</td>
                  <td className={`${td} text-vekt-grey`}>{r.club_team ?? '—'}{r.club_contacts > 0 && <div className="text-xs">{r.club_contacts} club contact{r.club_contacts > 1 ? 's' : ''}</div>}</td>
                  <td className={`${td} text-vekt-grey whitespace-nowrap`}>{formatPhone(r.mobile)}<div className="text-xs truncate max-w-[200px]">{r.email ?? ''}</div></td>
                  <td className={td}><ReadStatus p={r} /></td>
                  <td className={`${td} text-vekt-grey whitespace-nowrap`}>{relativeTime(r.last_invited_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <InviteComposer open={composer} onClose={() => setComposer(false)} prospectIds={[...selected]}
        prospectLabel={`${selected.size} prospect${selected.size === 1 ? '' : 's'}`} onSent={onSent} />
    </div>
  );
}
