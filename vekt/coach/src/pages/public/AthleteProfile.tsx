import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sportFor } from "../../../../supabase/functions/_shared/sports.ts";
import { publicApi } from "../../lib/publicApi";
import { ErrorNote, Spinner } from "../../components/ui";
import { ProfileForm, type ProfileValue } from "../../components/ProfileForm";
import { PublicFrame, SaveBar } from "./PublicFrame";
import { VideoLinks, type VideoValue } from "../../components/VideoLinks";
import { Button, Toggle } from "../../components/ui";

interface Load {
  status: "ready" | "needs_consent"; athlete_first_name: string; program: string | null; sport: string | null;
  known?: { position: string | null; grad_year: number | null; club: string | null };
  profile?: (ProfileValue & { submitted_at: string | null }) | null;
  share_prompt?: boolean; shared?: boolean; other_programs?: number; videos?: VideoValue[];
}

export default function AthleteProfile() {
  const { token = "" } = useParams();
  const [data, setData] = useState<Load | null>(null);
  const [value, setValue] = useState<ProfileValue>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [videos, setVideos] = useState<VideoValue[]>([]);
  const [updateAll, setUpdateAll] = useState(true);
  const [justShared, setJustShared] = useState(false);

  const load = () => publicApi<Load>("profile_load", token).then((d) => {
    setData(d);
    setValue(d.profile ?? { primary_position: d.known?.position ?? null });
    setVideos(d.videos ?? []);
    setDone(!!d.profile?.submitted_at);
  }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = async (yes: boolean) => {
    try { await publicApi("profile_share", token, { share: yes }); setJustShared(yes); await load(); } catch (e) { setError((e as Error).message); }
  };

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "save"); setNote(null);
    try { await publicApi("profile_save", token, { profile: value, submit, videos: videos.filter((v) => v.url.trim()), update_all: updateAll }); if (submit) { setDone(true); window.scrollTo({ top: 0 }); } else setNote("Saved. Come back to this link any time."); }
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
      {data.share_prompt && (
        <div className="mt-10 border border-white/30 rounded p-6">
          <h2 className="vekt-display text-[28px] sm:text-[34px]">You already have a VEKT profile</h2>
          <p className="text-white/80 mt-3 font-light">Share it with {data.program}? It loads in automatically, then you can check whether anything needs updating.</p>
          <div className="flex flex-wrap gap-3 mt-5"><Button variant="primary" onClick={() => decide(true)}>Yes, share it</Button><Button variant="ghost" onClick={() => decide(false)}>No, start fresh for {data.program}</Button></div>
        </div>
      )}
      {justShared && <div className="mt-8 border border-white/30 rounded p-4 text-sm text-white">Shared with {data.program}. Does anything need updating? Change it below and send; it can update every program you share with.</div>}
      {done && !justShared && <div className="mt-8 border border-white/30 rounded p-4 text-sm text-white">Sent to {data.program}. You can still change anything below and send it again.</div>}
      {!data.share_prompt && <>
      <VideoLinks sport={sport} value={videos} onChange={setVideos} />
      <ProfileForm sport={sport} value={value} onChange={setValue} mode="athlete" name={data.athlete_first_name} />
      {data.shared && (data.other_programs ?? 0) > 0 && <div className="mt-10"><Toggle checked={updateAll} onChange={setUpdateAll} label={`Also update the ${data.other_programs} other ${data.other_programs === 1 ? "program" : "programs"} you share with`} /></div>}
      </>}
      {!data.share_prompt && <SaveBar onSave={() => save(false)} onSubmit={() => save(true)} busy={busy} note={note} submitLabel={done ? "Send update" : `Send to ${data.program ?? "the program"}`} />}
    </PublicFrame>
  );
}
