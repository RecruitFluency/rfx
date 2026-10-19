// Club health: where the whole roster stands, and what college staff did lately.
import { useState } from "react";
import { Link } from "react-router-dom";
import { clubApi, type ClubAthlete } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { Empty, ErrorNote, PageHeader, Panel, PanelTitle, Segmented, Spinner, Stat, Table, td, th } from "../components/ui";
import { Bar, ClubStage, consentNote } from "./parts";

interface Health {
  totals: { athletes: number; on_vekt: number; coach_actions: number; programs_engaging: number; invites: number; interested: number; committed: number };
  weeks: { week: string; actions: number; interested: number }[];
  interest_by_division: Record<string, number>;
  athletes: ClubAthlete[];
}
const DIV_ORDER = ["D1", "D2", "D3", "NAIA", "NJCAA", "Other"];

export default function Health() {
  const { club } = useSession();
  const [days, setDays] = useState("30");
  const { data, error, loading } = useLoad(() => clubApi<Health>("health", { days: days === "all" ? null : Number(days) }), [days]);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const t = data.totals;
  const peak = Math.max(1, ...data.weeks.map((w) => w.actions));
  const divs = Object.entries(data.interest_by_division).sort((a, b) => DIV_ORDER.indexOf(a[0]) - DIV_ORDER.indexOf(b[0]));
  const divMax = Math.max(1, ...divs.map(([, n]) => n));

  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Club health" subtitle="Where every player stands, and what college staff did with their VEKT profiles."
        actions={<Segmented label="Period" value={days} onChange={setDays} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "all", label: "All time" }]} />} />

      <Panel className="p-6 sm:p-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-8 mb-8">
        <Stat label="Players" value={t.athletes} sub="Pursuing college" />
        <Stat label="On VEKT" value={t.on_vekt} sub="Family said yes to the club" />
        <Stat label="Programs engaging" value={t.programs_engaging} />
        <Stat label="Coach actions" value={t.coach_actions} sub="Views, film, saves" />
        <Stat label="Interested" value={t.interested} sub={`${t.invites} invites from programs`} />
        <Stat label="Committed" value={t.committed} />
      </Panel>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 mb-8">
        <Panel>
          <PanelTitle>College activity · last 12 weeks</PanelTitle>
          <div className="p-6">
            <div className="flex items-end gap-2 h-40" role="img" aria-label="Coach actions per week">
              {data.weeks.map((w) => (
                <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`Week ending ${w.week}: ${w.actions} actions, ${w.interested} Interested`}>
                  {w.interested > 0 && <span className="font-mono text-[10px] text-white">{w.interested}★</span>}
                  <span className="w-full bg-white rounded-sm" style={{ height: `${Math.round((w.actions / peak) * 100)}%`, minHeight: w.actions ? 3 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 font-mono text-[10px] text-vekt-grey"><span>{data.weeks[0]?.week}</span><span>This week</span></div>
            <p className="text-xs text-vekt-grey mt-4">Bars are profile views, film plays and watch-list saves. ★ marks Interested replies that week.</p>
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Interest by level</PanelTitle>
          <div className="p-6 flex flex-col gap-4">
            {divs.length ? divs.map(([d, n]) => <Bar key={d} label={d} value={n} max={divMax} />) : <p className="text-sm text-vekt-grey">No Interested replies yet.</p>}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle action={<Link to="/director/pipeline" className="text-xs text-vekt-grey hover:text-white">Pipeline</Link>}>Players</PanelTitle>
        {!data.athletes.length ? <Empty title="No players yet" hint="Add your roster to start." action={<Link to="/director/roster" className="text-white underline underline-offset-4">Add players</Link>} /> : (
          <Table>
            <thead><tr>{["Player", "Class", "Stage", "Programs", "Views", "Saves", "Invites", "Interested"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.athletes.map((a) => (
                <tr key={a.id}>
                  <td className={td}><div className="text-white">{a.full_name}</div><div className="text-xs text-vekt-grey">{[a.position, a.team].filter(Boolean).join(" · ")}</div></td>
                  <td className={td}>{a.grad_year ?? "·"}</td>
                  <td className={td}><ClubStage stage={a.stage} label={a.pending_parent ? "Waiting on family" : a.stage_label} /></td>
                  <td className={td}>{a.on_vekt ? a.programs_engaged : <span className="text-vekt-grey">·</span>}</td>
                  <td className={td}>{a.on_vekt ? a.views : <span className="text-vekt-grey">·</span>}</td>
                  <td className={td}>{a.on_vekt ? a.saves : <span className="text-vekt-grey">·</span>}</td>
                  <td className={td}>{a.on_vekt ? a.invites : <span className="text-vekt-grey">·</span>}</td>
                  <td className={td}>{a.on_vekt ? (a.interested ? <span className="text-white">{a.interested}<span className="block text-xs text-vekt-grey">{a.interested_programs.join(", ")}</span></span> : 0) : <span className="text-vekt-grey">·</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-6 py-4 text-xs text-vekt-grey">{consentNote}</p>
      </Panel>
    </div>
  );
}
