// Coach engagement: which college programs are doing something with the club's players.
import { clubApi } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { Empty, ErrorNote, PageHeader, Panel, PanelTitle, Spinner, Table, td, th } from "../components/ui";
import { Bar, consentNote } from "./parts";

interface Resp {
  programs: { program: string; sport: string | null; division: string | null; views: number; saves: number; invites: number; interested: number; athletes: number }[];
  divisions: Record<string, { programs: number; interested: number }>;
}

export default function Engagement() {
  const { club } = useSession();
  const { data, error, loading } = useLoad(() => clubApi<Resp>("engagement"), []);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const divs = Object.entries(data.divisions);
  const max = Math.max(1, ...divs.map(([, v]) => v.programs));
  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Coach engagement" subtitle="College programs that viewed, played film, saved, invited or replied Interested on your players." />
      <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
        <Panel>
          <PanelTitle>Programs by level</PanelTitle>
          <div className="p-6 flex flex-col gap-4">
            {divs.length ? divs.map(([d, v]) => <Bar key={d} label={d} value={v.programs} max={max} sub={v.interested ? `· ${v.interested}★` : undefined} />) : <p className="text-sm text-vekt-grey">Nothing yet.</p>}
            <p className="text-xs text-vekt-grey">★ Interested replies.</p>
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Programs</PanelTitle>
          {!data.programs.length ? <Empty title="No college activity yet" hint="Activity appears once families put their VEKT profiles in front of coaches." /> : (
            <Table>
              <thead><tr>{["Program", "Level", "Players", "Views", "Saves", "Invites", "Interested"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.programs.map((p, i) => (
                  <tr key={i}>
                    <td className={`${td} text-white`}>{p.program}<div className="text-xs text-vekt-grey capitalize">{p.sport?.replace(/_/g, " ")}</div></td>
                    <td className={td}>{p.division ?? "·"}</td>
                    <td className={td}>{p.athletes}</td>
                    <td className={td}>{p.views}</td>
                    <td className={td}>{p.saves}</td>
                    <td className={td}>{p.invites}</td>
                    <td className={`${td} ${p.interested ? "text-white" : ""}`}>{p.interested}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="px-6 py-4 text-xs text-vekt-grey">{consentNote} Coaches using VEKT only; activity elsewhere isn't counted.</p>
        </Panel>
      </div>
    </div>
  );
}
