// Commitments: who has committed where, and the players closest to a decision.
import { useState } from "react";
import { clubApi, type ClubAthlete } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { Empty, ErrorNote, PageHeader, Panel, PanelTitle, Spinner, Stat, Table, td, th } from "../components/ui";
import { date } from "../lib/format";
import { StatusDrawer } from "./StatusDrawer";

interface Resp { committed: ClubAthlete[]; close: ClubAthlete[]; by_year: Record<string, number>; by_division: Record<string, number>; active: number }

export default function Commitments() {
  const { club } = useSession();
  const { data, error, loading, reload } = useLoad(() => clubApi<Resp>("commitments"), []);
  const [open, setOpen] = useState<ClubAthlete | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Commitments" subtitle="Your placement record, as families report it, plus the players with programs Interested right now." />
      <Panel className="p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <Stat label="Committed" value={data.committed.length} />
        <Stat label="Still recruiting" value={data.active} />
        <div className="flex flex-col gap-2"><span className="vekt-label">By class</span>{Object.entries(data.by_year).map(([y, n]) => <span key={y} className="text-sm text-white">{y} <span className="text-vekt-grey">· {n}</span></span>)}{!Object.keys(data.by_year).length && <span className="text-vekt-grey text-sm">·</span>}</div>
        <div className="flex flex-col gap-2"><span className="vekt-label">By level</span>{Object.entries(data.by_division).map(([d, n]) => <span key={d} className="text-sm text-white">{d} <span className="text-vekt-grey">· {n}</span></span>)}{!Object.keys(data.by_division).length && <span className="text-vekt-grey text-sm">·</span>}</div>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-8">
        <Panel>
          <PanelTitle>Committed</PanelTitle>
          {!data.committed.length ? <Empty title="No commitments recorded" hint="Record one from a player in the pipeline." /> : (
            <Table>
              <thead><tr>{["Player", "Program", "Level", "Date"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{data.committed.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setOpen(a)}>
                  <td className={td}><div className="text-white">{a.full_name}</div><div className="text-xs text-vekt-grey">{[a.grad_year, a.position].filter(Boolean).join(" · ")}</div></td>
                  <td className={`${td} text-white`}>{a.committed_program}</td><td className={td}>{a.committed_division ?? "·"}</td><td className={`${td} whitespace-nowrap`}>{date(a.committed_at)}</td>
                </tr>))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel>
          <PanelTitle>Closest to a decision</PanelTitle>
          {!data.close.length ? <Empty title="No programs Interested yet" /> : (
            <Table>
              <thead><tr>{["Player", "Interested", "Programs engaged"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{data.close.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setOpen(a)}>
                  <td className={td}><div className="text-white">{a.full_name}</div><div className="text-xs text-vekt-grey">{[a.grad_year, a.position].filter(Boolean).join(" · ")}</div></td>
                  <td className={td}><span className="text-white">{a.interested}</span><div className="text-xs text-vekt-grey">{a.interested_programs.join(", ")}</div></td>
                  <td className={td}>{a.programs_engaged}</td>
                </tr>))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
      <StatusDrawer athlete={open} onClose={() => setOpen(null)} onSaved={reload} />
    </div>
  );
}
