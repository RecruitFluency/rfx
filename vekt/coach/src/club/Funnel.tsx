// Recruiting funnel: how far the roster has come, step by step, and by class.
import { clubApi } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { ErrorNote, PageHeader, Panel, PanelTitle, Spinner, Table, td, th } from "../components/ui";
import { Bar, consentNote } from "./parts";

interface Resp { total: number; steps: { key: string; label: string; count: number }[]; by_year: ({ grad_year: number; athletes: number } & Record<string, number>)[] }

export default function Funnel() {
  const { club } = useSession();
  const { data, error, loading } = useLoad(() => clubApi<Resp>("funnel"), []);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Recruiting funnel" subtitle={`${data.total} players pursuing college. Each step counts the players who have reached it.`} />
      <Panel className="mb-8">
        <PanelTitle>All classes</PanelTitle>
        <div className="p-6 flex flex-col gap-4">
          {data.steps.map((s) => <Bar key={s.key} label={s.label} value={s.count} max={data.total} sub={`of ${data.total}`} />)}
        </div>
        <p className="px-6 pb-5 text-xs text-vekt-grey">Committed is what families tell you, on VEKT or not. The other steps count what happened on VEKT. {consentNote}</p>
      </Panel>
      <Panel>
        <PanelTitle>By class</PanelTitle>
        <Table>
          <thead><tr><th className={th}>Class</th><th className={th}>Players</th>{data.steps.map((s) => <th key={s.key} className={th}>{s.label}</th>)}</tr></thead>
          <tbody>
            {data.by_year.map((y) => (
              <tr key={y.grad_year}>
                <td className={`${td} text-white`}>{y.grad_year}</td><td className={td}>{y.athletes}</td>
                {data.steps.map((s) => <td key={s.key} className={`${td} ${y[s.key] ? "text-white" : "text-vekt-grey"}`}>{y[s.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
