import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { InviteEvent, RecruitRow } from "../lib/types";
import { ButtonLink, Empty, ErrorNote, PageHeader, Panel, PanelTitle, Spinner, Stat } from "../components/ui";
import { dateTime, eventLabel, programName, roleTo } from "../lib/format";

interface Dash {
  counts: { recruits: number; not_invited: number; held: number; in_progress: number; reads_ready: number; interested: number; not_a_fit: number };
  ready: RecruitRow[];
  activity: InviteEvent[];
}

export default function Overview() {
  const { me, program } = useSession();
  const { data, error, loading } = useLoad(() => api<Dash>("dashboard", { program_id: program!.id }), [program?.id]);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const c = data.counts;
  return (
    <div>
      <PageHeader eyebrow={`${program?.institution} · ${programName(program)}`} title={`Welcome, Coach ${me?.account.last_name}`}
        subtitle="Who you've invited, where each recruit is, and the Fit Reads that are ready."
        actions={me?.can.write ? <><ButtonLink to="/recruits/new" variant="primary">Add a recruit</ButtonLink><ButtonLink to="/recruits/import">Import a list</ButtonLink></> : undefined} />

      <Panel className="p-6 sm:p-8 grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
        <Stat label="On your board" value={c.recruits} />
        <Stat label="Not invited" value={c.not_invited} sub={c.held ? `${c.held} held for contact date` : undefined} />
        <Stat label="In progress" value={c.in_progress} sub="Parent, athlete or director" />
        <Stat label="Fit Reads ready" value={c.reads_ready} />
        <Stat label="Interested" value={c.interested} sub={c.not_a_fit ? `${c.not_a_fit} not a fit` : undefined} />
      </Panel>

      <div className="grid 2xl:grid-cols-[1.4fr_1fr] gap-8">
        <Panel>
          <PanelTitle action={<Link to="/recruits" className="text-xs text-vekt-grey hover:text-white">All recruits</Link>}>Fit Reads ready</PanelTitle>
          {data.ready.length ? (
            <ul>
              {data.ready.map((r) => (
                <li key={r.id} className="border-b border-white/[0.06] last:border-0">
                  <Link to={`/recruits/${r.id}/fit-read`} className="flex items-center justify-between gap-6 px-6 py-5 hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <div className="text-white">{r.recruit_name}</div>
                      <div className="text-sm text-vekt-grey truncate font-light mt-1">{r.headline}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="vekt-label">Self-awareness</div>
                      <div className={`vekt-display text-[26px] mt-1 ${r.self_awareness?.level === "pending" ? "text-white/30" : ""}`}>{r.self_awareness?.label}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty title="No Fit Reads yet" hint="A Fit Read is written as soon as an invited athlete finishes their conversation." />}
        </Panel>
        <Panel>
          <PanelTitle action={<Link to="/activity" className="text-xs text-vekt-grey hover:text-white">Full log</Link>}>Latest activity</PanelTitle>
          {data.activity.length ? (
            <ul className="px-6 py-2">
              {data.activity.slice(0, 12).map((e) => (
                <li key={e.id} className="py-3 border-b border-white/[0.06] last:border-0 text-sm flex justify-between gap-4">
                  <span><span className="text-white">{e.recruit_name}</span> <span className="text-vekt-grey">· {roleTo[e.recipient_role ?? ""] ?? e.recipient_role} · {e.channel === "sms" ? "Text" : e.channel === "email" ? "Email" : ""}</span></span>
                  <span className="text-right text-vekt-grey whitespace-nowrap">{eventLabel[e.status] ?? e.status}<br /><span className="text-xs">{dateTime(e.created_at)}</span></span>
                </li>
              ))}
            </ul>
          ) : <Empty title="Nothing sent yet" />}
        </Panel>
      </div>
    </div>
  );
}
