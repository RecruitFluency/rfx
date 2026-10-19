import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useSession } from "../session";
import type { RecruitDetail } from "../lib/types";
import { Button, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Textarea } from "../components/ui";

const EMPTY: Record<string, string> = {
  recruit_name: "", position: "", grad_year: "", club_or_school: "", club_level: "", state: "", gpa: "",
  athlete_email: "", athlete_phone: "", parent_name: "", parent_email: "", parent_phone: "",
  club_coach_name: "", club_coach_email: "", club_coach_phone: "", family_cost_min: "", family_cost_max: "",
  priority: "B", notes: "", coach_open_question: "",
};

export default function RecruitForm() {
  const { id } = useParams();
  const { program } = useSession();
  const nav = useNavigate();
  const [f, setF] = useState(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    api<RecruitDetail>("recruit", { id }).then((d) => {
      setF(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, d.recruit[k] == null ? "" : String(d.recruit[k])])));
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const out = await api<{ id: string }>("save_recruit", { program_id: program!.id, recruit: { ...f, id } });
      nav(`/recruits/${out.id}`);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  if (loading) return <Spinner />;
  const I = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) =>
    <Field label={label} hint={hint}><Input value={f[k]} onChange={set(k)} {...props} /></Field>;

  return (
    <form onSubmit={save}>
      <PageHeader eyebrow={id ? "Edit recruit" : "Add a recruit"} title={id ? f.recruit_name || "Recruit" : "New recruit"}
        subtitle="Only the name is required to save. To invite, add a parent's email or phone, and the club director's contact for the blind read." />
      <div className="flex flex-col gap-8 max-w-4xl">
        <Panel>
          <PanelTitle>Athlete</PanelTitle>
          <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {I("recruit_name", "Full name", { required: true, autoFocus: !id })}
            {I("position", "Position", { placeholder: "Center back" })}
            {I("grad_year", "Grad year", { inputMode: "numeric", placeholder: "2028" })}
            {I("club_or_school", "Club team")}
            {I("club_level", "Club level", { placeholder: "MLS NEXT, ECNL, Regional..." })}
            {I("state", "State", { maxLength: 2, placeholder: "OH" }, "Sets their time zone for texts.")}
            {I("gpa", "GPA", { inputMode: "decimal" })}
            {I("athlete_email", "Athlete email", { type: "email" })}
            {I("athlete_phone", "Athlete mobile", { type: "tel" })}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Parent or guardian</PanelTitle>
          <div className="p-6 grid sm:grid-cols-3 gap-5">
            {I("parent_name", "Name")}
            {I("parent_email", "Email", { type: "email" })}
            {I("parent_phone", "Mobile", { type: "tel" }, "Texted only if they opt in when approving.")}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Club director or coach</PanelTitle>
          <div className="p-6 grid sm:grid-cols-3 gap-5">
            {I("club_coach_name", "Name")}
            {I("club_coach_email", "Email", { type: "email" })}
            {I("club_coach_phone", "Mobile", { type: "tel" })}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Your notes</PanelTitle>
          <div className="p-6 grid sm:grid-cols-3 gap-5">
            {I("family_cost_min", "Family budget from ($/yr)", { inputMode: "numeric" }, "Only what the family has told you.")}
            {I("family_cost_max", "Family budget up to ($/yr)", { inputMode: "numeric" })}
            <Field label="Priority"><Select value={f.priority} onChange={set("priority")}><option value="A">A</option><option value="B">B</option><option value="C">C</option></Select></Field>
            <Field label="The question you want answered" className="sm:col-span-3"><Input value={f.coach_open_question} onChange={set("coach_open_question")} placeholder="Can he lead a back four as a sophomore?" /></Field>
            <Field label="Notes" className="sm:col-span-3"><Textarea value={f.notes} onChange={set("notes")} /></Field>
          </div>
        </Panel>
        {error && <ErrorNote message={error} />}
        <div className="flex gap-3">
          <Button variant="primary" type="submit" loading={busy}>{id ? "Save changes" : "Add recruit"}</Button>
          <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
        </div>
      </div>
    </form>
  );
}
