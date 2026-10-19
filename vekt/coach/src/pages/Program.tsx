// Staff personalities ("how they'll respond to each coach") and must-haves.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { Staff } from "../lib/types";
import { Button, Drawer, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Segmented, Spinner, Textarea } from "../components/ui";
import { programName, usd } from "../lib/format";

interface ProgramData {
  program: { id: string; institution: string; sport: string; team_gender: "men" | "women" | null; must_haves: Record<string, any>; reminder_days: number[]; tactical_identity: string | null; profile_confirmed: boolean };
  staff: Staff[];
}

export default function ProgramPage() {
  const { me, program } = useSession();
  const { data, error, loading, reload } = useLoad(() => api<ProgramData>("program_get", { program_id: program!.id }), [program?.id]);
  const [editing, setEditing] = useState<Partial<Staff> | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const can = !!me?.can.settings;
  return (
    <div>
      <PageHeader eyebrow={programName(program)} title="Staff & must-haves"
        subtitle="Each Fit Read is written against your staff and your must-haves. Keep them current." />
      <div className="flex flex-col gap-8">
        <Panel>
          <PanelTitle action={can ? <Button onClick={() => setEditing({ traits: [], sort_order: data.staff.length })}>Add a coach</Button> : undefined}>Your staff</PanelTitle>
          {data.staff.length ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/[0.06]">
              {data.staff.map((s) => (
                <button key={s.id} disabled={!can} onClick={() => setEditing(s)} className="bg-vekt-panel text-left p-6 hover:bg-white/[0.03] disabled:hover:bg-vekt-panel">
                  <div className="vekt-display text-[24px]">{s.name}</div>
                  <div className="text-xs text-vekt-grey mt-1">{[s.title, s.focus].filter(Boolean).join(" · ")}</div>
                  {s.traits.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{s.traits.map((t) => <span key={t} className="border border-white/15 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-vekt-grey">{t}</span>)}</div>}
                  <dl className="mt-4 text-sm flex flex-col gap-2 font-light">
                    {s.feedback_style && <div><dt className="vekt-label inline mr-2">Corrects</dt><dd className="inline text-white/80">{s.feedback_style}</dd></div>}
                    {s.setbacks_style && <div><dt className="vekt-label inline mr-2">Setbacks</dt><dd className="inline text-white/80">{s.setbacks_style}</dd></div>}
                  </dl>
                </button>
              ))}
            </div>
          ) : <Empty title="No staff profiles yet" hint="Add each coach who works with recruits. The Fit Read shows how the athlete will likely respond to each one." />}
        </Panel>
        <MustHaves data={data} can={can} onSaved={reload} />
      </div>
      <StaffDrawer staff={editing} programId={program!.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
    </div>
  );
}

function MustHaves({ data, can, onSaved }: { data: ProgramData; can: boolean; onSaved: () => void }) {
  const m = data.program.must_haves || {};
  const [f, setF] = useState({
    positions: (m.positions || []).join(", "), min_grad_year: m.min_grad_year ?? "", max_grad_year: m.max_grad_year ?? "",
    club_levels: (m.club_levels || []).join(", "), min_gpa: m.min_gpa ?? "", max_family_cost: m.max_family_cost ?? "",
  });
  const [gender, setGender] = useState<"men" | "women">(data.program.team_gender ?? "men");
  const [days, setDays] = useState((data.program.reminder_days || [3, 7]).join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await api("program_save", { program_id: data.program.id, must_haves: f, team_gender: gender, reminder_days: days.split(",").map((d) => Number(d.trim())).filter(Boolean) });
      setMsg("Saved. New Fit Reads use these; open ones update on their next rewrite."); onSaved();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel>
      <PanelTitle>Must-haves and sending</PanelTitle>
      <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Field label="Positions you're recruiting" hint="Comma separated"><Input disabled={!can} value={f.positions} onChange={set("positions")} placeholder="Center back, Fullback" /></Field>
        <Field label="Grad year from"><Input disabled={!can} inputMode="numeric" value={f.min_grad_year} onChange={set("min_grad_year")} /></Field>
        <Field label="Grad year to"><Input disabled={!can} inputMode="numeric" value={f.max_grad_year} onChange={set("max_grad_year")} /></Field>
        <Field label="Club levels" hint="Comma separated"><Input disabled={!can} value={f.club_levels} onChange={set("club_levels")} placeholder="MLS NEXT, ECNL" /></Field>
        <Field label="Minimum GPA"><Input disabled={!can} inputMode="decimal" value={f.min_gpa} onChange={set("min_gpa")} /></Field>
        <Field label="Typical family cost after aid ($/yr)" hint={f.max_family_cost ? `Families who can cover about ${usd(Number(f.max_family_cost))} a year line up.` : "What a family usually pays here after aid."}>
          <Input disabled={!can} inputMode="numeric" value={f.max_family_cost} onChange={set("max_family_cost")} />
        </Field>
        <Field label="Team"><Segmented label="Team" value={gender} onChange={(v) => can && setGender(v)} options={[{ value: "men", label: "Men's" }, { value: "women", label: "Women's" }]} /></Field>
        <Field label="Reminder days after invite" hint="Up to three, e.g. 3, 7"><Input disabled={!can} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      </div>
      {can && <div className="px-6 pb-6 flex items-center gap-4"><Button onClick={save} loading={busy}>Save</Button>{msg && <span className="text-sm text-vekt-grey">{msg}</span>}</div>}
    </Panel>
  );
}

function StaffDrawer({ staff, programId, onClose, onSaved }: { staff: Partial<Staff> | null; programId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<Staff> & { traitsText?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setF(staff ? { ...staff, traitsText: (staff.traits || []).join(", ") } : {}); setError(null); }, [staff]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setError(null);
    try { await api("staff_save", { program_id: programId, staff: { ...f, traits: f.traitsText } }); onSaved(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => { if (!f.id || !confirm(`Remove ${f.name}?`)) return; await api("staff_delete", { program_id: programId, id: f.id }); onSaved(); };
  return (
    <Drawer open={!!staff} onClose={onClose} title={f.id ? f.name || "Coach" : "Add a coach"}
      footer={<div className="flex gap-3"><Button variant="primary" onClick={save} loading={busy}>Save</Button>{f.id && <Button variant="ghost" onClick={remove}>Remove</Button>}</div>}>
      <div className="flex flex-col gap-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Name"><Input value={f.name ?? ""} onChange={set("name")} /></Field>
          <Field label="Title"><Input value={f.title ?? ""} onChange={set("title")} placeholder="Assistant coach" /></Field>
        </div>
        <Field label="Works with"><Input value={f.focus ?? ""} onChange={set("focus")} placeholder="Defenders" /></Field>
        <Field label="Style in 2-3 words" hint="Shown on the coach's card. Comma separated."><Input value={f.traitsText ?? ""} onChange={set("traitsText")} placeholder="Direct, Film-first" /></Field>
        <Field label="How they correct a player"><Textarea value={f.feedback_style ?? ""} onChange={set("feedback_style")} /></Field>
        <Field label="How they get effort"><Textarea value={f.motivation_style ?? ""} onChange={set("motivation_style")} /></Field>
        <Field label="How close they get to players"><Textarea value={f.closeness_style ?? ""} onChange={set("closeness_style")} /></Field>
        <Field label="How they handle a benched starter"><Textarea value={f.setbacks_style ?? ""} onChange={set("setbacks_style")} /></Field>
        {error && <ErrorNote message={error} />}
      </div>
    </Drawer>
  );
}
