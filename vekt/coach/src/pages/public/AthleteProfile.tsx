import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sportFor } from "../../../../supabase/functions/_shared/sports.ts";
import { publicApi } from "../../lib/publicApi";
import { ErrorNote, Spinner } from "../../components/ui";
import { ProfileForm, type ProfileValue } from "../../components/ProfileForm";
import { PublicFrame, SaveBar } from "./PublicFrame";

interface Load {
  status: "ready" | "needs_consent"; athlete_first_name: string; program: string | null; sport: string | null;
  known?: { position: string | null; grad_year: number | null; club: string | null };
  profile?: (ProfileValue & { submitted_at: string | null }) | null;
}

export default function AthleteProfile() {
  const { token = "" } = useParams();
  const [data, setData] = useState<Load | null>(null);
  const [value, setValue] = useState<ProfileValue>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    publicApi<Load>("profile_load", token).then((d) => {
      setData(d);
      setValue(d.profile ?? { primary_position: d.known?.position ?? null });
      setDone(!!d.profile?.submitted_at);
    }).catch((e) => setError(e.message));
  }, [token]);

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "save"); setNote(null);
    try { await publicApi("profile_save", token, { profile: value, submit }); if (submit) { setDone(true); window.scrollTo({ top: 0 }); } else setNote("Saved. Come back to this link any time."); }
    catch (e) { setNote((e as Error).message); } finally { setBusy(null); }
  };

  if (error) return <PublicFrame><ErrorNote message={error} /></PublicFrame>;
  if (!data) return <PublicFrame><Spinner /></PublicFrame>;
  if (data.status === "needs_consent") {
    return (
      <PublicFrame>
        <h1 className="vekt-display text-[44px] sm:text-[56px] mb-5">Almost there, {data.athlete_first_name}</h1>
        <p className="text-white/80 font-light">A parent or guardian needs to approve first. We sent them a link. Once they approve, this page opens.</p>
      </PublicFrame>
    );
  }
  const sport = sportFor(data.sport);
  if (!sport) return <PublicFrame><p className="text-vekt-grey">Profiles for this sport aren't ready yet.</p></PublicFrame>;

  return (
    <PublicFrame>
      <div className="vekt-label mb-4">Player profile · {sport.label}</div>
      <h1 className="vekt-display text-[44px] sm:text-[64px]">Your game, {data.athlete_first_name}</h1>
      <p className="text-white/80 mt-5 font-light max-w-2xl">
        {data.program} asked for this. It's about ten minutes. Tell them where you play, the systems you know, and an honest read of your skills. Honest beats impressive: coaches compare it with what your club director says.
      </p>
      {done && <div className="mt-8 border border-white/30 rounded p-4 text-sm text-white">Sent to {data.program}. You can still change anything below and send it again.</div>}
      <ProfileForm sport={sport} value={value} onChange={setValue} mode="athlete" name={data.athlete_first_name} />
      <SaveBar onSave={() => save(false)} onSubmit={() => save(true)} busy={busy} note={note} submitLabel={done ? "Send update" : `Send to ${data.program ?? "the program"}`} />
    </PublicFrame>
  );
}
