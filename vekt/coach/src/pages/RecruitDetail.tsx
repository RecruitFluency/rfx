import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { RecruitDetail as Detail, RecruitRow } from "../lib/types";
import { Badge, Button, ButtonLink, ErrorNote, Field, PageHeader, Panel, PanelTitle, Segmented, Spinner, StageBadge, Textarea, Toggle, Input } from "../components/ui";
import { date, dateTime, eventLabel, firstName, roleTo, usd } from "../lib/format";
import { InviteDrawer } from "./Recruits";
import { PlayerGame } from "../components/PlayerGame";
import { VideoPlayer } from "./Feed";

const STEPS = [
  { key: "invited", label: "Invited" },
  { key: "parent", label: "Parent approved" },
  { key: "athlete", label: "Athlete finished" },
  { key: "director", label: "Director finished" },
  { key: "read", label: "Fit Read" },
];

export default function RecruitDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { me } = useSession();
  const { data, error, loading, reload } = useLoad(() => api<Detail>("recruit", { id }), [id]);
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Not found."} />;
  const r = data.recruit;
  const done: Record<string, boolean> = {
    invited: !!r.athlete_invited_at, parent: r.consented, athlete: r.athlete_done, director: r.club_coach_done, read: !!data.fit_read?.report,
  };
  const row = { id: r.id, recruit_name: r.recruit_name, stage: r.stage } as RecruitRow;
  const sa = data.fit_read?.report?.self_awareness;

  const remove = async () => {
    if (!confirm(`Remove ${r.recruit_name} from your board? Their contact details are deleted.`)) return;
    try { await api("delete_recruit", { id: r.id }); nav("/recruits"); } catch (e) { setMsg((e as Error).message); }
  };
  const refresh = async () => { try { await api("refresh_read", { recruit_id: r.id }); setMsg("Rewriting the Fit Read. Refresh in a minute."); } catch (e) { setMsg((e as Error).message); } };

  return (
    <div>
      <Link to="/recruits" className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white mb-8"><ArrowLeft className="w-4 h-4" /> Recruits</Link>
      <PageHeader eyebrow={[r.position, r.grad_year && `Class of ${r.grad_year}`, r.club_or_school].filter(Boolean).join(" · ")} title={r.recruit_name}
        subtitle={<StageBadge stage={r.stage} />}
        actions={<>
          {data.fit_read?.report && <ButtonLink to={`/recruits/${r.id}/fit-read`} variant="primary">Open the Fit Read</ButtonLink>}
          {me?.can.write && <Button onClick={() => setInviting(true)}>{r.athlete_invited_at ? "Resend invites" : "Send invites"}</Button>}
          {me?.can.write && <ButtonLink to={`/recruits/${r.id}/edit`}>Edit</ButtonLink>}
        </>} />
      {msg && <div className="mb-6"><ErrorNote message={msg} /></div>}

      <Panel className="p-6 mb-8">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded flex items-center justify-center font-mono text-xs border ${done[s.key] ? "bg-white text-vekt-black border-white" : "border-white/20 text-vekt-grey"}`}>{i + 1}</span>
              <span className={`text-sm ${done[s.key] ? "text-white" : "text-vekt-grey"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
        {r.contact_status === "hold" && <p className="text-sm text-white mt-5">Held: {r.contact_rule_text}</p>}
        {!r.club_coach_email && !r.club_coach_phone && <p className="text-sm text-vekt-grey mt-5">No club director contact. Add one: self-awareness needs their blind read.</p>}
      </Panel>

      <div className="grid xl:grid-cols-[1fr_1fr] gap-8">
        <div className="flex flex-col gap-8">
          {sa && (
            <Panel className="p-6">
              <div className="vekt-label">Self-awareness</div>
              <div className={`vekt-display text-[72px] mt-2 ${sa.level === "pending" ? "text-white/30" : ""}`}>{sa.label}</div>
              <p className="text-sm text-vekt-grey">{sa.level === "pending" ? "Waiting on the club director." : `${sa.same_story} of ${sa.covered} traits told the same way`}</p>
              <p className="text-white/85 mt-4 font-light">{data.fit_read?.report?.short_answer.headline}</p>
              {me?.can.write && <button onClick={refresh} className="text-xs text-vekt-grey hover:text-white mt-4">Rewrite the Fit Read</button>}
            </Panel>
          )}
          <Panel>
            <PanelTitle>Contacts</PanelTitle>
            <dl className="px-6 py-4 grid sm:grid-cols-3 gap-6 text-sm">
              {[
                ["Athlete", r.recruit_name, r.athlete_email, r.athlete_phone],
                ["Parent or guardian", r.parent_name, r.parent_email, r.parent_phone],
                ["Club director", r.club_coach_name, r.club_coach_email, r.club_coach_phone],
              ].map(([label, name, e, p]) => (
                <div key={label as string}>
                  <dt className="vekt-label mb-2">{label}</dt>
                  <dd className="text-white">{name || <span className="text-vekt-grey">Not added</span>}</dd>
                  <dd className="text-vekt-grey break-all">{e}</dd>
                  <dd className="text-vekt-grey">{p}</dd>
                </div>
              ))}
            </dl>
            <dl className="px-6 pb-6 grid sm:grid-cols-4 gap-6 text-sm border-t border-white/[0.06] pt-4">
              <div><dt className="vekt-label mb-1">Club level</dt><dd className="text-white">{r.club_level || "·"}</dd></div>
              <div><dt className="vekt-label mb-1">GPA</dt><dd className="text-white">{r.gpa ?? "·"}</dd></div>
              <div><dt className="vekt-label mb-1">State</dt><dd className="text-white">{r.state || "·"}</dd></div>
              <div><dt className="vekt-label mb-1">Family budget</dt><dd className="text-white">{r.family_cost_max != null ? `${r.family_cost_min != null ? `${usd(r.family_cost_min)}–` : ""}${usd(r.family_cost_max)}/yr` : "·"}</dd></div>
            </dl>
            {(r.notes || r.coach_open_question) && <div className="px-6 pb-6 text-sm text-white/80 font-light">{r.coach_open_question && <p><span className="vekt-label mr-2">Your question</span>{r.coach_open_question}</p>}{r.notes && <p className="mt-2"><span className="vekt-label mr-2">Notes</span>{r.notes}</p>}</div>}
          </Panel>
          {data.videos.length > 0 && (
            <Panel>
              <PanelTitle>Video</PanelTitle>
              <div className="p-6 grid sm:grid-cols-2 gap-6">
                {data.videos.map((v, i) => <div key={i}><div className="vekt-label mb-2">{v.kind.replace(/_/g, " ")}{v.title ? ` · ${v.title}` : ""}{v.notes ? ` · ${v.notes}` : ""}</div><VideoPlayer v={v} /></div>)}
              </div>
            </Panel>
          )}
          {!data.fit_read?.report && (
            <Panel>
              <PanelTitle>Their game</PanelTitle>
              <div className="p-6"><PlayerGame player={data.player} first={firstName(r.recruit_name)} /></div>
            </Panel>
          )}
          {data.fit_read?.report && <SeasonCheck recruitId={r.id} name={r.recruit_name} checks={data.season_checks} onSaved={reload} />}
          {me?.can.write && !r.athlete_id && <button onClick={remove} className="self-start text-xs text-vekt-grey hover:text-white">Remove from board</button>}
        </div>
        <Panel>
          <PanelTitle>Message log</PanelTitle>
          {data.events.length ? (
            <ul className="px-6 py-2">
              {data.events.map((e) => (
                <li key={e.id} className="py-3 border-b border-white/[0.06] last:border-0 text-sm flex justify-between gap-4">
                  <span>
                    <span className="text-white">{roleTo[e.recipient_role ?? ""] ?? "·"}</span>
                    <span className="text-vekt-grey"> · {e.channel === "sms" ? "Text" : e.channel === "email" ? "Email" : "·"}</span>
                    {e.detail && <span className="block text-xs text-vekt-grey mt-0.5 break-words">{e.detail}</span>}
                  </span>
                  <span className="text-right whitespace-nowrap"><Badge tone={["delivered", "opened", "clicked", "sent"].includes(e.status) ? "done" : ["failed", "error", "bounced", "blocked", "opted_out"].includes(e.status) ? "warn" : "neutral"}>{eventLabel[e.status] ?? e.status}</Badge><span className="block text-xs text-vekt-grey mt-1">{dateTime(e.created_at)}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="px-6 py-8 text-sm text-vekt-grey">Nothing sent yet.</p>}
        </Panel>
      </div>
      <InviteDrawer open={inviting} onClose={() => setInviting(false)} recruits={[row]} onSent={reload} />
    </div>
  );
}

// Season-one check: did the read hold up? It's how VEKT learns which club directors' reads to trust.
function SeasonCheck({ recruitId, name, checks, onSaved }: { recruitId: string; name: string; checks: Detail["season_checks"]; onSaved: () => void }) {
  const { me } = useSession();
  const [held, setHeld] = useState<"yes" | "partly" | "no">("yes");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [onRoster, setOnRoster] = useState(true);
  const [missed, setMissed] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api("season_check_save", { recruit_id: recruitId, read_held_up: held, season, still_on_roster: onRoster, what_we_missed: missed }); setMissed(""); onSaved(); }
    finally { setBusy(false); }
  };
  return (
    <Panel>
      <PanelTitle>Season-one check</PanelTitle>
      <div className="px-6 py-5">
        {checks.map((c) => <p key={c.id} className="text-sm text-white mb-2">{c.season}: read held up <strong className="font-medium">{c.read_held_up}</strong>{c.still_on_roster === false ? " · left the roster" : ""} <span className="text-vekt-grey">({date(c.created_at)})</span></p>)}
        {me?.can.write && (
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-sm text-vekt-grey font-light">After {firstName(name)}'s first season with you: did the Fit Read hold up?</p>
            <Segmented label="Read held up" value={held} onChange={setHeld} options={[{ value: "yes", label: "Yes" }, { value: "partly", label: "Partly" }, { value: "no", label: "No" }]} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Season"><Input value={season} onChange={(e) => setSeason(e.target.value)} /></Field>
              <div className="pt-6"><Toggle checked={onRoster} onChange={setOnRoster} label="Still on the roster" /></div>
            </div>
            <Field label="What the read missed (optional)"><Textarea value={missed} onChange={(e) => setMissed(e.target.value)} /></Field>
            <Button className="self-start" onClick={save} loading={busy}>Save check</Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
