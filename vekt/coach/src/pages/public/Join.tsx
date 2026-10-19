import { useState } from "react";
import { SPORTS } from "../../../../supabase/functions/_shared/sports.ts";
import { publicApi } from "../../lib/publicApi";
import { Button, ErrorNote, Field, Input, Select, Segmented } from "../../components/ui";
import { PublicFrame } from "./PublicFrame";

// Start a VEKT profile without an invite: underclassmen and early starters.
// Under 18, a parent's email is required and nothing is visible until they approve.
export default function Join() {
  const [minor, setMinor] = useState<"yes" | "no">("yes");
  const [f, setF] = useState({ full_name: "", sport: "soccer", team_gender: "", grad_year: "", state: "", club: "", athlete_email: "", parent_name: "", parent_email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await publicApi("join", "", { is_minor: minor === "yes", athlete: { full_name: f.full_name, sport: f.sport, team_gender: f.team_gender, grad_year: f.grad_year, state: f.state, club: f.club, athlete_email: f.athlete_email }, parent: { name: f.parent_name, email: f.parent_email } });
      setDone(true);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  if (done) return (
    <PublicFrame>
      <h1 className="vekt-display text-[44px] sm:text-[60px] mb-5">Check your email</h1>
      <p className="text-white/80 font-light max-w-xl">{minor === "yes" ? "We sent the parent or guardian a link to approve the profile, and a private link to build it. Nothing is visible to anyone until a parent approves." : "We sent you a private link to build your profile."}</p>
    </PublicFrame>
  );
  return (
    <PublicFrame>
      <div className="vekt-label mb-4">Start your VEKT profile</div>
      <h1 className="vekt-display text-[44px] sm:text-[64px]">Your game, your profile</h1>
      <p className="text-white/80 mt-5 font-light max-w-2xl">One profile you control: positions, the systems you play, honest skills, your numbers and video. You choose which college programs see it. Free, always.</p>
      <form onSubmit={submit} className="mt-10 flex flex-col gap-5">
        <Field label="Is the athlete under 18?"><Segmented label="Under 18" value={minor} onChange={setMinor} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No, 18 or older" }]} /></Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Athlete's full name"><Input required value={f.full_name} onChange={set("full_name")} /></Field>
          <Field label="Sport"><Select value={f.sport} onChange={set("sport")}>{SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <Field label="Team"><Select value={f.team_gender} onChange={set("team_gender")}><option value="">Choose</option><option value="men">Men's / boys'</option><option value="women">Women's / girls'</option></Select></Field>
          <Field label="High school grad year"><Input inputMode="numeric" value={f.grad_year} onChange={set("grad_year")} placeholder="2030" /></Field>
          <Field label="Club or school team"><Input value={f.club} onChange={set("club")} /></Field>
          <Field label="State"><Input maxLength={2} value={f.state} onChange={set("state")} placeholder="TX" /></Field>
          <Field label={minor === "yes" ? "Athlete email (optional)" : "Your email"}><Input type="email" required={minor === "no"} value={f.athlete_email} onChange={set("athlete_email")} /></Field>
        </div>
        {minor === "yes" && (
          <div className="grid sm:grid-cols-2 gap-5 border-t border-white/[0.1] pt-5">
            <Field label="Parent or guardian name"><Input required value={f.parent_name} onChange={set("parent_name")} /></Field>
            <Field label="Parent or guardian email" hint="They approve the profile before anything is shared."><Input type="email" required value={f.parent_email} onChange={set("parent_email")} /></Field>
          </div>
        )}
        {error && <ErrorNote message={error} />}
        <Button variant="primary" type="submit" loading={busy} className="self-start">Start the profile</Button>
      </form>
    </PublicFrame>
  );
}
