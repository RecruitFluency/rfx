import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sportFor } from "../../../../supabase/functions/_shared/sports.ts";
import { publicApi } from "../../lib/publicApi";
import { ErrorNote, Spinner } from "../../components/ui";
import { ProfileForm, type ProfileValue } from "../../components/ProfileForm";
import { PublicFrame, SaveBar } from "./PublicFrame";
import { firstName } from "../../lib/format";

interface Evaluation {
  team_name: string | null; team_level: string | null; primary_position: string | null; positions_played: string[];
  systems_played: Record<string, string[]>; team_systems: Record<string, string[]>; skills: Record<string, any>; measurables: Record<string, string>; notes: string | null; submitted_at: string | null;
}
interface Load {
  athlete_name: string; program: string | null; sport: string | null; coach_name: string | null;
  known: { position: string | null; grad_year: number | null; club: string | null };
  conversation_done: boolean; evaluation: Evaluation | null; previous_team_systems: Record<string, string[]> | null;
  others: { name: string; program: string | null; done: boolean }[];
}

// The form speaks "systems" and "secondary positions"; the evaluation stores what
// the athlete played for this director and what the team runs.
const toForm = (e: Evaluation | null, d: Load): ProfileValue => ({
  team_name: e?.team_name ?? d.known.club, team_level: e?.team_level ?? null,
  primary_position: e?.primary_position ?? d.known.position, secondary_positions: e?.positions_played ?? [],
  systems: e?.systems_played ?? {}, team_systems: e?.team_systems ?? d.previous_team_systems ?? {},
  skills: e?.skills ?? {}, measurables: e?.measurables ?? {}, notes: e?.notes ?? null,
});
const toEval = (v: ProfileValue) => ({
  team_name: v.team_name, team_level: v.team_level, primary_position: v.primary_position, positions_played: v.secondary_positions,
  systems_played: v.systems, team_systems: v.team_systems, skills: v.skills, measurables: v.measurables, notes: v.notes,
});

export default function ClubEval() {
  const { token = "" } = useParams();
  const [data, setData] = useState<Load | null>(null);
  const [value, setValue] = useState<ProfileValue>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linksSent, setLinksSent] = useState(false);

  useEffect(() => {
    publicApi<Load>("club_load", token).then((d) => { setData(d); setValue(toForm(d.evaluation, d)); setDone(!!d.evaluation?.submitted_at); }).catch((e) => setError(e.message));
  }, [token]);

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "save"); setNote(null);
    try { await publicApi("club_save", token, { evaluation: toEval(value), submit }); if (submit) { setDone(true); window.scrollTo({ top: 0 }); } else setNote("Saved. This link works any time."); }
    catch (e) { setNote((e as Error).message); } finally { setBusy(null); }
  };
  const links = async () => { try { await publicApi("club_links", token); setLinksSent(true); } catch (e) { setNote((e as Error).message); } };

  if (error) return <PublicFrame><ErrorNote message={error} /></PublicFrame>;
  if (!data) return <PublicFrame><Spinner /></PublicFrame>;
  const sport = sportFor(data.sport);
  if (!sport) return <PublicFrame><p className="text-vekt-grey">Evaluations for this sport aren't ready yet.</p></PublicFrame>;
  const first = firstName(data.athlete_name);

  return (
    <PublicFrame>
      <div className="vekt-label mb-4">Club director read · {sport.label}</div>
      <h1 className="vekt-display text-[44px] sm:text-[64px]">{data.athlete_name}'s game</h1>
      <p className="text-white/80 mt-5 font-light max-w-2xl">
        {data.program} is recruiting {first} and asked for your read on their hard skills, positions and the systems they've played in. About five minutes. {first} won't see what you say.
        {!data.conversation_done && " The short voice conversation from your other email is separate; both help."}
      </p>
      {done && <div className="mt-8 border border-white/30 rounded p-4 text-sm text-white">Sent to {data.program}. Thank you. You can change anything and send it again.</div>}

      {data.others.length > 0 && (
        <div className="mt-10 border border-white/[0.12] rounded p-5">
          <div className="vekt-label mb-3">Your other athletes on VEKT</div>
          <ul className="flex flex-col gap-2 text-sm">
            {data.others.map((o, i) => <li key={i} className="flex justify-between gap-4"><span className="text-white">{o.name}{o.program ? <span className="text-vekt-grey"> · {o.program}</span> : null}</span><span className="text-vekt-grey">{o.done ? "Done" : "Waiting on you"}</span></li>)}
          </ul>
          <button type="button" onClick={links} disabled={linksSent} className="mt-4 text-sm text-white underline underline-offset-4 disabled:no-underline disabled:text-vekt-grey">
            {linksSent ? "Sent. Check your email." : "Email me each athlete's link"}
          </button>
        </div>
      )}

      <ProfileForm sport={sport} value={value} onChange={setValue} mode="club" name={first} />
      <SaveBar onSave={() => save(false)} onSubmit={() => save(true)} busy={busy} note={note} submitLabel={done ? "Send update" : `Send to ${data.program ?? "the program"}`} />
    </PublicFrame>
  );
}
