// Roster plan: who's still here in a given season, open spots under the roster
// limit, gaps by position against the staff's targets, and how the board covers them.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import { Button, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Segmented, Select, Spinner, Table, Textarea, td, th, MatchMark, Stat } from "../components/ui";
import { programName, usd } from "../lib/format";

type Status = "returning" | "leaving" | "transfer_risk" | "undecided";
interface Player { id: string; name: string; position: string | null; final_season: number; status: Status; designated: boolean; aid_dollars: number | null; notes: string | null }
interface Plan {
  season: number; limit: number | null; returning: number; designated: number; leaving: number; at_risk: number; open_spots: number | null; over_limit: boolean; position_gaps: number; aid_leaving: number;
  positions: { position: string; target: number | null; returning: number; at_risk: number; gap: number | null; recruits: number; interested: number; covered: boolean | null }[];
}
interface RosterResp { plan: Plan; roster: Player[]; limit: number | null; targets: Record<string, number>; suggested_limit: number | null; suggested_source: string | null; positions: string[]; seasons: number[] }

const STATUS_LABEL: Record<Status, string> = { returning: "Returning", leaving: "Leaving", transfer_risk: "Transfer risk", undecided: "Undecided" };

export default function Roster() {
  const { me, program } = useSession();
  const [season, setSeason] = useState<number | null>(null);
  const { data, error, loading, reload } = useLoad(() => api<RosterResp>("roster_get", { program_id: program!.id, season }), [program?.id, season]);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const p = data.plan;
  const canEdit = !!me?.can.write;

  return (
    <div>
      <PageHeader eyebrow={programName(program)} title="Roster plan"
        subtitle="Who's still here, the open spots under your limit, and whether your board covers each position."
        actions={<Segmented label="Season" value={String(p.season)} onChange={(v) => setSeason(Number(v))} options={data.seasons.map((y) => ({ value: String(y), label: `Fall ${y}` }))} />} />

      <Panel className="p-6 sm:p-8 grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
        <Stat label="Open spots" value={p.open_spots ?? "·"} sub={p.limit ? `Limit ${p.limit}` : "Set your roster limit below"} />
        <Stat label="Counting toward limit" value={p.returning} sub={p.designated ? `${p.designated} designated, not counted` : undefined} />
        <Stat label="Gone by then" value={p.leaving} sub={p.aid_leaving ? `${usd(p.aid_leaving)} in aid freed` : undefined} />
        <Stat label="At risk" value={p.at_risk} sub="Transfer risk or undecided" />
        <Stat label="Position gaps" value={p.position_gaps} sub={`Against your targets, Fall ${p.season}`} />
      </Panel>
      {p.over_limit && <div className="mb-8"><ErrorNote message={`You're over your roster limit for Fall ${p.season} before adding anyone.`} /></div>}

      <Panel className="mb-8">
        <PanelTitle action={<Link to="/recruits" className="text-xs text-vekt-grey hover:text-white">Recruits</Link>}>By position · incoming class of {p.season}</PanelTitle>
        <Table>
          <thead><tr>{["Position", "Target", "Returning", "Open", "Class of " + p.season + " on board", "Interested", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {p.positions.map((r) => (
              <tr key={r.position}>
                <td className={`${td} text-white`}>{r.position}</td>
                <td className={td}>{r.target ?? <span className="text-vekt-grey">·</span>}</td>
                <td className={td}>{r.returning}{r.at_risk ? <span className="text-xs text-vekt-grey"> ({r.at_risk} at risk)</span> : null}</td>
                <td className={`${td} ${r.gap ? "text-white font-medium" : "text-vekt-grey"}`}>{r.gap ?? "·"}</td>
                <td className={td}>{r.recruits}</td>
                <td className={td}>{r.interested}</td>
                <td className={td}>{r.gap ? <MatchMark match={r.covered ? "strong" : r.interested ? "look_closer" : "gap"} label={false} /> : null}<span className="ml-2 text-xs text-vekt-grey">{r.gap ? (r.covered ? "Covered" : r.interested ? "Partly covered" : "Not covered") : ""}</span></td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="px-6 py-4 text-xs text-vekt-grey">Covered means you've marked enough Class of {p.season} recruits at that position Interested to fill the open spots. It's a planning view, not a commitment count.</p>
      </Panel>

      {me?.can.settings && <Settings data={data} onSaved={reload} />}
      <RosterTable data={data} canEdit={canEdit} onChange={reload} />
    </div>
  );
}

function Settings({ data, onSaved }: { data: RosterResp; onSaved: () => void }) {
  const { program } = useSession();
  const [limit, setLimit] = useState(data.limit != null ? String(data.limit) : "");
  const [targets, setTargets] = useState<Record<string, string>>(Object.fromEntries(data.positions.map((pos) => [pos, data.targets[pos] != null ? String(data.targets[pos]) : ""])));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await api("roster_settings_save", { program_id: program!.id, roster_limit: limit, targets }); setMsg("Saved."); onSaved(); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel className="mb-8">
      <PanelTitle>Limit and targets</PanelTitle>
      <div className="p-6 flex flex-col gap-6">
        <Field label="Roster limit" hint={data.suggested_limit ? `D1 limit for this sport: ${data.suggested_limit}. ${data.suggested_source}` : "Enter the limit your school or conference uses."}>
          <div className="flex gap-3 items-center"><Input className="!w-32" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
            {data.suggested_limit && String(data.suggested_limit) !== limit && <button type="button" className="text-xs text-white underline underline-offset-4" onClick={() => setLimit(String(data.suggested_limit))}>Use {data.suggested_limit}</button>}</div>
        </Field>
        <div>
          <div className="vekt-label mb-3">How many you want at each position</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.positions.map((pos) => <Field key={pos} label={pos}><Input inputMode="numeric" value={targets[pos] ?? ""} onChange={(e) => setTargets((t) => ({ ...t, [pos]: e.target.value }))} /></Field>)}
          </div>
        </div>
        <div className="flex items-center gap-4"><Button onClick={save} loading={busy}>Save</Button>{msg && <span className="text-sm text-vekt-grey">{msg}</span>}</div>
      </div>
    </Panel>
  );
}

function RosterTable({ data, canEdit, onChange }: { data: RosterResp; canEdit: boolean; onChange: () => void }) {
  const { program } = useSession();
  const blank = { name: "", position: data.positions[0] ?? "", final_season: String(data.seasons[0]), status: "returning" as Status, designated: false, aid_dollars: "" };
  const [row, setRow] = useState(blank);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [data]);
  const save = async (player: any) => { setError(null); try { await api("roster_player_save", { program_id: program!.id, player }); onChange(); } catch (e) { setError((e as Error).message); } };
  const add = async () => { await save(row); setRow(blank); };
  const importRows = async () => {
    const rows = paste.split("\n").map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((x) => x[0]).map(([name, position, final_season]) => ({ name, position, final_season }));
    setError(null);
    try { await api("roster_import", { program_id: program!.id, rows }); setPaste(""); onChange(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <Panel>
      <PanelTitle>Current roster ({data.roster.length})</PanelTitle>
      <Table>
        <thead><tr>{["Player", "Position", "Last season", "Status", "Designated", "Aid / yr", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {data.roster.map((pl) => (
            <tr key={pl.id} className={pl.final_season < data.plan.season || pl.status === "leaving" ? "opacity-50" : ""}>
              <td className={`${td} text-white`}>{pl.name}</td>
              <td className={td}>{canEdit ? <Select className="!min-h-[36px]" value={pl.position ?? ""} onChange={(e) => save({ ...pl, position: e.target.value })}>{data.positions.map((x) => <option key={x}>{x}</option>)}</Select> : pl.position}</td>
              <td className={td}>{canEdit ? <Input className="!min-h-[36px] !w-24" inputMode="numeric" defaultValue={pl.final_season} onBlur={(e) => Number(e.target.value) !== pl.final_season && save({ ...pl, final_season: e.target.value })} /> : pl.final_season}</td>
              <td className={td}>{canEdit ? <Select className="!min-h-[36px]" value={pl.status} onChange={(e) => save({ ...pl, status: e.target.value })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select> : STATUS_LABEL[pl.status]}</td>
              <td className={td}><input type="checkbox" className="w-4 h-4 accent-white" disabled={!canEdit} checked={pl.designated} onChange={(e) => save({ ...pl, designated: e.target.checked })} aria-label={`${pl.name} designated`} /></td>
              <td className={`${td} text-white/80`}>{pl.aid_dollars ? usd(pl.aid_dollars) : <span className="text-vekt-grey">·</span>}</td>
              <td className={td}>{canEdit && <button aria-label={`Remove ${pl.name}`} className="text-vekt-grey hover:text-white" onClick={async () => { await api("roster_player_delete", { program_id: program!.id, id: pl.id }); onChange(); }}><Trash2 className="w-4 h-4" /></button>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {canEdit && (
        <div className="p-6 border-t border-white/[0.08] flex flex-col gap-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1.2fr_1fr_auto] gap-3 items-end">
            <Field label="Player"><Input value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} /></Field>
            <Field label="Position"><Select value={row.position} onChange={(e) => setRow({ ...row, position: e.target.value })}>{data.positions.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Last season"><Input inputMode="numeric" value={row.final_season} onChange={(e) => setRow({ ...row, final_season: e.target.value })} /></Field>
            <Field label="Status"><Select value={row.status} onChange={(e) => setRow({ ...row, status: e.target.value as Status })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Aid / yr (optional)"><Input inputMode="numeric" value={row.aid_dollars} onChange={(e) => setRow({ ...row, aid_dollars: e.target.value })} /></Field>
            <Button onClick={add} disabled={!row.name}>Add</Button>
          </div>
          <Field label="Or paste your roster" hint="One player per line: Name, Position, Last season (e.g. Owen Hale, Goalkeeper, 2027)"><Textarea value={paste} onChange={(e) => setPaste(e.target.value)} /></Field>
          {paste.trim() && <Button className="self-start" onClick={importRows}>Add these players</Button>}
          {error && <ErrorNote message={error} />}
        </div>
      )}
    </Panel>
  );
}
