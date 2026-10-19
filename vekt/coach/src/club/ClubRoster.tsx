// Roster & export: the club's players, inviting families to VEKT, and the CSV.
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { clubApi, type ClubAthlete } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { Button, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Table, Textarea, td, th } from "../components/ui";
import { SPORTS } from "../../../supabase/functions/_shared/sports.ts";
import { downloadCsv } from "../lib/download";
import { date } from "../lib/format";
import { StatusDrawer } from "./StatusDrawer";

type Row = ClubAthlete & { athlete_email: string | null; parent_name: string | null; parent_email: string | null };
const STATUS: Record<Row["status"], string> = { active: "Recruiting", committed: "Committed", not_pursuing: "Not pursuing college" };

export default function ClubRoster() {
  const { club } = useSession();
  const canEdit = club?.account.role === "director";
  const { data, error, loading, reload } = useLoad(() => clubApi<{ athletes: Row[] }>("roster"), []);
  const [open, setOpen] = useState<Row | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const sport = club?.club.sports[0] ?? "";

  const invite = async (r: Row) => {
    setInviting(r.id); setMsg(null);
    try { await clubApi("athlete_invite", { id: r.id }); setMsg(`Invite sent to ${r.parent_email ? "the parent" : r.full_name}. Nothing shows here until the family says yes.`); reload(); }
    catch (e) { setMsg((e as Error).message); } finally { setInviting(null); }
  };
  const exportCsv = async () => { const { rows } = await clubApi<{ rows: Record<string, unknown>[] }>("export_roster"); downloadCsv(rows, "vekt-club-roster"); };
  const vektLabel = (r: Row) => r.on_vekt ? "On VEKT" : r.pending_parent ? `Invited ${date(r.invited_at)} · waiting on family` : "Not invited";

  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Roster & export" subtitle="Add your players, invite each family to start their own VEKT profile, and export everything for your records."
        actions={<Button variant="primary" onClick={exportCsv}>Export CSV</Button>} />
      {msg && <p className="text-sm text-white mb-5">{msg}</p>}
      <Panel className="mb-8">
        <PanelTitle>Players ({data.athletes.length})</PanelTitle>
        <Table>
          <thead><tr>{["Player", "Class", "Team", "Family contact", "VEKT", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.athletes.map((r) => (
              <tr key={r.id} className={r.status === "not_pursuing" ? "opacity-60" : ""}>
                <td className={td}><button className="text-white hover:underline underline-offset-4 text-left" onClick={() => setOpen(r)}>{r.full_name}</button><div className="text-xs text-vekt-grey">{r.position}</div></td>
                <td className={td}>{r.grad_year ?? "·"}</td>
                <td className={`${td} text-white/80`}>{r.team}</td>
                <td className={`${td} text-xs text-vekt-grey`}>{r.parent_name}{r.parent_email ? <div>{r.parent_email}</div> : null}{!r.parent_email && r.athlete_email ? <div>{r.athlete_email} (athlete)</div> : null}</td>
                <td className={`${td} text-xs ${r.on_vekt ? "text-white" : "text-vekt-grey"}`}>{vektLabel(r)}</td>
                <td className={`${td} text-xs`}>{STATUS[r.status]}{r.status === "committed" && <div className="text-vekt-grey">{r.committed_program}</div>}</td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  {canEdit && !r.on_vekt && r.status !== "not_pursuing" && <Button className="!min-h-[36px]" onClick={() => invite(r)} loading={inviting === r.id}>{r.pending_parent ? "Resend" : "Invite to VEKT"}</Button>}
                  {canEdit && <button aria-label={`Remove ${r.full_name}`} className="ml-3 text-vekt-grey hover:text-white align-middle" onClick={async () => { if (confirm(`Remove ${r.full_name} from the club roster? Their own VEKT profile stays theirs.`)) { await clubApi("athlete_delete", { id: r.id }); reload(); } }}><Trash2 className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="px-6 py-4 text-xs text-vekt-grey">Inviting sends the parent (or an athlete who is 18 or older) a link to approve the profile. They decide separately whether college coaches see video, and whether your club sees which programs engage.</p>
      </Panel>
      {canEdit && <AddPlayers sport={sport} onDone={reload} />}
      <StatusDrawer athlete={open} onClose={() => setOpen(null)} onSaved={reload} />
    </div>
  );
}

function AddPlayers({ sport, onDone }: { sport: string; onDone: () => void }) {
  const blank = { full_name: "", sport, team: "", grad_year: "", position: "", parent_name: "", parent_email: "", athlete_email: "" };
  const [row, setRow] = useState(blank);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const positions = SPORTS.find((s) => s.key === row.sport)?.positions.map((p) => p.label) ?? [];
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setRow({ ...row, [k]: e.target.value });
  const add = async () => { setError(null); try { await clubApi("athlete_save", { athlete: row }); setRow(blank); onDone(); } catch (e) { setError((e as Error).message); } };
  const importRows = async () => {
    const rows = paste.split("\n").map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((x) => x[0])
      .map(([full_name, grad_year, position, team, parent_name, parent_email]) => ({ full_name, grad_year, position, team, parent_name, parent_email, sport }));
    setError(null);
    try { await clubApi("athlete_import", { rows }); setPaste(""); onDone(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <Panel>
      <PanelTitle>Add players</PanelTitle>
      <div className="p-6 flex flex-col gap-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Player"><Input value={row.full_name} onChange={set("full_name")} /></Field>
          <Field label="Sport"><Select value={row.sport} onChange={set("sport")}>{SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <Field label="Class"><Input inputMode="numeric" value={row.grad_year} onChange={set("grad_year")} placeholder="2028" /></Field>
          <Field label="Position"><Select value={row.position} onChange={set("position")}><option value="">·</option>{positions.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Team"><Input value={row.team} onChange={set("team")} placeholder="U17" /></Field>
          <Field label="Parent name"><Input value={row.parent_name} onChange={set("parent_name")} /></Field>
          <Field label="Parent email" hint="Required for players under 18."><Input type="email" value={row.parent_email} onChange={set("parent_email")} /></Field>
          <Field label="Athlete email (18+)"><Input type="email" value={row.athlete_email} onChange={set("athlete_email")} /></Field>
        </div>
        <Button className="self-start" onClick={add} disabled={!row.full_name}>Add player</Button>
        <Field label="Or paste your roster" hint="One player per line: Name, Class, Position, Team, Parent name, Parent email"><Textarea value={paste} onChange={(e) => setPaste(e.target.value)} /></Field>
        {paste.trim() && <Button className="self-start" onClick={importRows}>Add these players</Button>}
        {error && <ErrorNote message={error} />}
      </div>
    </Panel>
  );
}
