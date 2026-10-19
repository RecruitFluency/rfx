import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { Button, ErrorNote, Spinner, Toggle } from "../../components/ui";
import { PublicFrame } from "./PublicFrame";

interface ClubLink { id: string; club: string; allowed: boolean; text: string }
interface Load { clubs: ClubLink[]; athlete_first_name: string; sport: string; grad_year: number | null; parent_approved_at: string | null; feed_visible: boolean; consent_text: string; feed_text: string }

// Parent approval: the profile itself, and separately, the coach-only film feed.
export default function Parent() {
  const { token = "" } = useParams();
  const [d, setD] = useState<Load | null>(null);
  const [approve, setApprove] = useState(false);
  const [feed, setFeed] = useState(false);
  const [clubs, setClubs] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { publicApi<Load>("parent_load", token).then((x) => { setD(x); setApprove(!!x.parent_approved_at); setFeed(x.feed_visible); setClubs(Object.fromEntries(x.clubs.map((c) => [c.id, c.allowed]))); }).catch((e) => setError(e.message)); }, [token]);
  const save = async () => {
    setBusy(true); setError(null);
    try { await publicApi("parent_save", token, { approve, feed_visible: feed, clubs }); setSaved(true); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  if (error && !d) return <PublicFrame><ErrorNote message={error} /></PublicFrame>;
  if (!d) return <PublicFrame><Spinner /></PublicFrame>;
  return (
    <PublicFrame>
      <div className="vekt-label mb-4">Parent or guardian</div>
      <h1 className="vekt-display text-[44px] sm:text-[60px]">{d.athlete_first_name}'s VEKT profile</h1>
      <p className="text-white/80 mt-5 font-light max-w-2xl">{d.athlete_first_name} started a recruiting profile. You decide each of these separately, and you can change any of them later from this link.</p>
      <div className="mt-10 flex flex-col gap-6">
        <div className="border border-white/[0.16] rounded p-5">
          <Toggle checked={approve} onChange={setApprove} disabled={!!d.parent_approved_at} label="Approve the profile" hint={d.consent_text} />
        </div>
        <div className="border border-white/[0.16] rounded p-5">
          <Toggle checked={feed} onChange={setFeed} label="Let verified college coaches see their videos" hint={d.feed_text} />
          <p className="text-xs text-vekt-grey mt-3">College coaches can't contact underclassmen before NCAA dates. In the feed they can only watch and save {d.athlete_first_name} for later.</p>
        </div>
        {d.clubs.map((c) => (
          <div key={c.id} className="border border-white/[0.16] rounded p-5">
            <Toggle checked={!!clubs[c.id]} onChange={(v) => setClubs((x) => ({ ...x, [c.id]: v }))} label={`Let ${c.club} see which college programs engage`} hint={c.text} />
          </div>
        ))}
        {error && <ErrorNote message={error} />}
        {saved && <p className="text-sm text-white">Saved. {feed ? "Their videos now show in the coach feed." : "Their videos stay private."}</p>}
        <Button variant="primary" className="self-start" onClick={save} loading={busy} disabled={!approve}>Save</Button>
      </div>
    </PublicFrame>
  );
}
