import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sportFor } from "../../../../supabase/functions/_shared/sports.ts";
import { publicApi } from "../../lib/publicApi";
import { Button, ErrorNote, Field, Input, Spinner, Toggle } from "../../components/ui";
import { ProfileForm, Section, type ProfileValue } from "../../components/ProfileForm";
import { VideoLinks, type VideoValue } from "../../components/VideoLinks";
import { PublicFrame, SaveBar } from "./PublicFrame";
import { date } from "../../lib/format";
import { ShareButton } from "../../components/ShareButton";

interface Load {
  athlete: { id: string; first_name: string; full_name: string; sport: string; grad_year: number | null; state: string | null; club: string | null; is_minor: boolean; parent_approved_at: string | null; feed_visible: boolean; profile: ProfileValue };
  videos: VideoValue[];
  programs: { recruit_id: string; program: string; status: "shared" | "declined"; last_synced_at: string | null }[];
  pending: { recruit_id: string; program: string }[];
  clubs: { id: string; club: string; allowed: boolean; text: string; placement: boolean; placement_text: string }[];
  share: { url: string; joined: number };
  team: { size: number; needed: number; unlocked: boolean; suggested: Record<string, string[]> } | null;
}

const shareText = (sport: string) => `I'm on VEKT, a free ${sport.toLowerCase()} recruiting profile that shows college coaches how you actually fit their program. Start yours:`;

// The athlete's own profile: one place to update, shared program by program.
export default function Me() {
  const { token = "" } = useParams();
  const [d, setD] = useState<Load | null>(null);
  const [value, setValue] = useState<ProfileValue>({});
  const [videos, setVideos] = useState<VideoValue[]>([]);
  const [info, setInfo] = useState({ grad_year: "", club: "", state: "" });
  const [feed, setFeed] = useState(false);
  const [clubs, setClubs] = useState<Record<string, boolean>>({});
  const [placements, setPlacements] = useState<Record<string, boolean>>({});
  const [updateAll, setUpdateAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = () => publicApi<Load>("me_load", token).then((x) => {
    setD(x); setValue(x.athlete.profile ?? {}); setVideos(x.videos); setFeed(x.athlete.feed_visible);
    setClubs(Object.fromEntries((x.clubs ?? []).map((c) => [c.id, c.allowed])));
    setPlacements(Object.fromEntries((x.clubs ?? []).map((c) => [c.id, c.placement])));
    setInfo({ grad_year: x.athlete.grad_year ? String(x.athlete.grad_year) : "", club: x.athlete.club ?? "", state: x.athlete.state ?? "" });
  }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "save"); setNote(null);
    try {
      const out = await publicApi<{ synced: number }>("me_save", token, { profile: value, videos: videos.filter((v) => v.url.trim()), ...info, feed_visible: feed, clubs, placements, update_all: submit ? updateAll : false });
      setNote(submit ? (out.synced ? `Saved and sent to ${out.synced} ${out.synced === 1 ? "program" : "programs"}.` : "Saved.") : "Saved.");
    } catch (e) { setNote((e as Error).message); } finally { setBusy(null); }
  };
  const share = async (recruit_id: string, yes: boolean) => { await publicApi("me_share", token, { recruit_id, share: yes }); load(); };

  if (error) return <PublicFrame><ErrorNote message={error} /></PublicFrame>;
  if (!d) return <PublicFrame><Spinner /></PublicFrame>;
  const sport = sportFor(d.athlete.sport);
  if (!sport) return <PublicFrame><p className="text-vekt-grey">This sport isn't set up yet.</p></PublicFrame>;
  const a = d.athlete;
  const shared = d.programs.filter((p) => p.status === "shared");
  const waiting = a.is_minor && !a.parent_approved_at;

  return (
    <PublicFrame>
      <div className="vekt-label mb-4">Your VEKT profile · {sport.label}</div>
      <h1 className="vekt-display text-[44px] sm:text-[64px]">{a.full_name}</h1>
      <p className="text-white/80 mt-5 font-light max-w-2xl">Update it here once. When a college program asks, you choose whether they see it, and later updates can go to every program you've said yes to.</p>
      {waiting && <div className="mt-8 border border-white/30 rounded p-4 text-sm text-white">Waiting on a parent or guardian to approve. You can build the profile now; nobody sees it until they do.</div>}

      {d.pending.length > 0 && (
        <Section title="Programs asking for your profile">
          <div className="flex flex-col gap-3">
            {d.pending.map((p) => (
              <div key={p.recruit_id} className="flex flex-wrap items-center justify-between gap-3 border border-white/[0.16] rounded p-4">
                <span className="text-white">Share your VEKT profile with <strong className="font-medium">{p.program}</strong>?</span>
                <div className="flex gap-2"><Button onClick={() => share(p.recruit_id, true)} disabled={waiting}>Yes, share it</Button><Button variant="ghost" onClick={() => share(p.recruit_id, false)}>No</Button></div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Who can see it">
        <div className="flex flex-col gap-3 text-sm">
          {shared.length ? shared.map((p) => (
            <div key={p.recruit_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <span className="text-white">{p.program}<span className="text-vekt-grey"> · last updated {date(p.last_synced_at)}</span></span>
              <button className="text-xs text-vekt-grey hover:text-white" onClick={() => share(p.recruit_id, false)}>Stop sharing</button>
            </div>
          )) : <p className="text-vekt-grey">No programs yet.</p>}
          <div className="pt-2">
            {a.is_minor
              ? <p className="text-vekt-grey">{a.feed_visible ? "Your videos show in the coach-only film feed (a parent turned this on)." : "Your videos are private. A parent can let verified college coaches see them from their link."}
                  {a.feed_visible && <button className="ml-2 text-white underline underline-offset-4" onClick={() => setFeed(false)}>Turn off</button>}</p>
              : <Toggle checked={feed} onChange={setFeed} label="Let verified college coaches see my videos" hint="They see your name, class, position, club, state, profile and videos, never your email or phone." />}
          </div>
          {d.clubs?.map((c) => (
            <div key={c.id} className="pt-2">
              {a.is_minor
                ? <p className="text-vekt-grey">{c.allowed ? `${c.club} can see which college programs engage with your profile (a parent turned this on).` : `${c.club} invited you. A parent decides whether the club sees which programs engage.`}
                    {c.allowed && clubs[c.id] && <button className="ml-2 text-white underline underline-offset-4" onClick={() => setClubs((x) => ({ ...x, [c.id]: false }))}>Turn off</button>}</p>
                : <div className="flex flex-col gap-3">
                    <Toggle checked={!!clubs[c.id]} onChange={(v) => setClubs((x) => ({ ...x, [c.id]: v }))} label={`Let ${c.club} see which college programs engage`} hint={c.text} />
                    <Toggle checked={!!placements[c.id]} onChange={(v) => setPlacements((x) => ({ ...x, [c.id]: v }))} label={`List my commitment on ${c.club}'s public page`} hint={c.placement_text} />
                  </div>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Bring your teammates">
        <div className="flex flex-col gap-4 border border-white/[0.16] rounded p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-white">{d.share.joined ? `${d.share.joined} ${d.share.joined === 1 ? "teammate has" : "teammates have"} joined from your link.` : "Know someone who should be on VEKT?"}</p>
              <p className="text-sm text-vekt-grey mt-1">Send your link. Each teammate builds their own profile, and a parent approves it if they're under 18. They never see yours.</p>
            </div>
            <ShareButton url={d.share.url} title="Join me on VEKT" text={shareText(sport.label)} label="Invite teammates" />
          </div>
          <TeamUnlock team={d.team} club={a.club} sport={sport} value={value} onUse={(systems) => setValue({ ...value, systems })} />
        </div>
      </Section>

      <Section title="The basics">
        <div className="grid sm:grid-cols-3 gap-5">
          <Field label="Grad year"><Input inputMode="numeric" value={info.grad_year} onChange={(e) => setInfo((x) => ({ ...x, grad_year: e.target.value }))} /></Field>
          <Field label="Club or team"><Input value={info.club} onChange={(e) => setInfo((x) => ({ ...x, club: e.target.value }))} /></Field>
          <Field label="State"><Input maxLength={2} value={info.state} onChange={(e) => setInfo((x) => ({ ...x, state: e.target.value }))} /></Field>
        </div>
      </Section>

      <VideoLinks sport={sport} value={videos} onChange={setVideos} />
      <ProfileForm sport={sport} value={value} onChange={setValue} mode="athlete" name={a.first_name} />

      {shared.length > 0 && <div className="mt-10"><Toggle checked={updateAll} onChange={setUpdateAll} label={`Send updates to all ${shared.length} ${shared.length === 1 ? "program" : "programs"} you share with`} hint="Turn off to keep this change to yourself for now." /></div>}
      <ShareButton floating url={d.share.url} title="Join me on VEKT" text={shareText(sport.label)} label="Invite teammates" className="hidden sm:block" />
      <SaveBar onSave={() => save(false)} onSubmit={() => save(true)} busy={busy} note={note} submitLabel={shared.length && updateAll ? "Save and update programs" : "Save profile"} />
    </PublicFrame>
  );
}

// Team unlock: once 3 teammates (same club and class, give or take a year) are on VEKT,
// the systems most of them say the team plays can be added to this profile in one tap.
function TeamUnlock({ team, club, sport, value, onUse }: { team: Load["team"]; club: string | null; sport: NonNullable<ReturnType<typeof sportFor>>; value: ProfileValue; onUse: (systems: Record<string, string[]>) => void }) {
  if (!team) return <p className="text-sm text-vekt-grey border-t border-white/[0.08] pt-4">Add your club and grad year under The basics to see how many teammates are on VEKT.</p>;
  const groups = sport.systems.filter((g) => team.suggested[g.key]?.length);
  const merged = { ...(value.systems ?? {}) };
  for (const g of groups) merged[g.key] = [...new Set([...(merged[g.key] ?? []), ...team.suggested[g.key]])];
  const already = groups.every((g) => team.suggested[g.key].every((o) => value.systems?.[g.key]?.includes(o)));
  return (
    <div className="border-t border-white/[0.08] pt-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex gap-1" aria-hidden="true">{Array.from({ length: team.needed }, (_, i) => <span key={i} className={`w-6 h-1.5 rounded-sm ${i < team.size ? "bg-white" : "bg-white/15"}`} />)}</div>
        <span className="text-sm text-white">{team.unlocked ? "Team unlocked" : `${Math.min(team.size, team.needed)} of ${team.needed} from ${club} on VEKT`}</span>
      </div>
      {!team.unlocked ? (
        <p className="text-sm text-vekt-grey">At {team.needed}, VEKT can fill in the systems your team plays from what your teammates say, so you don't have to.</p>
      ) : groups.length ? (
        <>
          <p className="text-sm text-white/85">Your teammates say your team plays: {groups.map((g) => `${team.suggested[g.key].join(", ")}`).join(" · ")}.</p>
          {already ? <p className="text-xs text-vekt-grey">Already on your profile.</p>
            : <button type="button" className="self-start text-sm text-white underline underline-offset-4" onClick={() => onUse(merged)}>Add these to my profile</button>}
        </>
      ) : <p className="text-sm text-vekt-grey">Once your teammates add the systems your team plays, they'll show up here.</p>}
    </div>
  );
}
