// The Fit Read: one athlete and your staff. Self-awareness leads, because how
// well an athlete knows themselves (checked blind against their club director)
// is the strongest single signal in the read.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { FitReport, MustHave, RecruitDetail } from "../lib/types";
import { Button, ErrorNote, MatchMark, Spinner, Textarea, VerdictMark } from "../components/ui";
import { date, firstName, programName } from "../lib/format";

export default function FitReadPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLoad(() => api<RecruitDetail>("recruit", { id }), [id]);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Not found."} />;
  const report = data.fit_read?.report;
  if (!report) {
    return (
      <div>
        <Back id={data.recruit.id} />
        <h1 className="vekt-display text-[44px] sm:text-[64px] mt-8 mb-4">{data.recruit.recruit_name}</h1>
        <p className="text-vekt-grey max-w-xl">The Fit Read is written when {firstName(data.recruit.recruit_name)} finishes their conversation. Status: {data.recruit.stage.label}.</p>
      </div>
    );
  }
  return <FitReadView detail={data} report={report} onDecided={reload} />;
}

function Back({ id }: { id: string }) {
  return (
    <div className="no-print flex items-center justify-between gap-4">
      <Link to={`/recruits/${id}`} className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white"><ArrowLeft className="w-4 h-4" /> Recruit</Link>
      <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white"><Printer className="w-4 h-4" /> Print or save PDF</button>
    </div>
  );
}

export function Section({ n, title, intro, children }: { n: number; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="print-break border-t border-white/[0.1] pt-10 mt-16">
      <div className="flex items-baseline gap-4 mb-3">
        <span className="font-mono text-[11px] text-vekt-grey">{String(n).padStart(2, "0")}</span>
        <h2 className="vekt-display text-[30px] sm:text-[38px]">{title}</h2>
      </div>
      {intro && <p className="text-vekt-grey max-w-2xl mb-8 font-light">{intro}</p>}
      {children}
    </section>
  );
}

export function MustHaveMark({ m }: { m: MustHave }) {
  return <MatchMark match={m.met === true ? "strong" : m.met === false ? "gap" : "look_closer"} label={false} />;
}
export const mustHaveState = (m: MustHave) => (m.met === true ? "Lines up" : m.met === false ? "Miss" : "Not known yet");

function FitReadView({ detail, report, onDecided }: { detail: RecruitDetail; report: FitReport; onDecided: () => void }) {
  const r = detail.recruit;
  const first = firstName(r.recruit_name);
  const sa = report.self_awareness;
  const met = report.must_haves.filter((m) => m.met === true).length;
  const missed = report.must_haves.filter((m) => m.met === false).length;
  const mustTitle = missed === 0 && met === report.must_haves.length
    ? `All ${["", "one", "two", "three", "four", "five", "six"][met] ?? met} line up`
    : missed ? `${missed} ${missed === 1 ? "miss" : "misses"} to talk through` : `${met} of ${report.must_haves.length} line up so far`;
  const director = sa.level !== "pending";
  const groups = [{ key: "on_field", label: "On the field" }, { key: "off_field", label: "Off the field" }] as const;

  return (
    <article>
      <Back id={r.id} />

      <header className="mt-10">
        <div className="vekt-label mb-5">Fit Read · {detail.program.institution} {programName(detail.program as any)}</div>
        <h1 className="vekt-display text-[48px] sm:text-[80px] lg:text-[96px] max-w-5xl">{r.recruit_name} <span className="text-vekt-grey">and your staff</span></h1>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] uppercase tracking-[0.1em] text-vekt-grey">
          {r.position && <span>{r.position}</span>}
          {r.grad_year && <span>Class of {r.grad_year}</span>}
          {r.club_or_school && <span>{r.club_or_school}</span>}
          <span>{detail.fit_read?.verification_level === "self_reported" ? "Athlete only so far" : detail.fit_read?.verification_level === "proven" ? "Checked by a proven club director" : "Checked by their club director"}</span>
          <span>Updated {date(detail.fit_read?.updated_at)}</span>
        </div>
      </header>

      {/* 01 Self-awareness: the biggest number on the page */}
      <section className="print-break mt-14 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-end border-t border-white/[0.1] pt-10">
        <div>
          <div className="vekt-label mb-4">Self-awareness</div>
          <div className={`vekt-display text-[110px] sm:text-[170px] leading-[0.82] ${director ? "text-white" : "text-white/30"}`}>{sa.label}</div>
        </div>
        <div className="pb-2">
          {director ? (
            <>
              <p className="vekt-display text-[28px] sm:text-[34px]">{sa.same_story} of {sa.covered} traits told the same way</p>
              <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-vekt-grey mt-3">
                {sa.contradictions === 0 ? "No contradictions" : `${sa.contradictions} ${sa.contradictions === 1 ? "contradiction" : "contradictions"}`}
              </p>
            </>
          ) : <p className="vekt-display text-[28px] sm:text-[34px]">Waiting on the club director</p>}
          <p className="text-white/80 mt-5 max-w-lg font-light">{sa.summary || `How ${first} describes themselves, checked against what their club director said without seeing ${first}'s answers.`}</p>
        </div>
      </section>

      <Section n={2} title="The short answer">
        <p className="text-[22px] sm:text-[28px] leading-snug text-white max-w-4xl font-light">{report.short_answer.headline}</p>
        {report.short_answer.summary && <p className="text-vekt-grey mt-5 max-w-3xl font-light">{report.short_answer.summary}</p>}
        {report.short_answer.cards.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08] border border-white/[0.08] mt-10">
            {report.short_answer.cards.map((c) => (
              <div key={c.title} className="bg-vekt-black p-6 flex flex-col gap-4">
                <MatchMark match={c.match} />
                <div className="vekt-display text-[24px]">{c.title}</div>
                <p className="text-sm text-vekt-grey font-light">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section n={3} title="Does the athlete know themselves?"
        intro={director ? `What ${first} said about themselves, next to what their club director said blind. Same story means they see ${first} the same way.` : `The club director hasn't answered yet. Once they do, each trait shows whether their read matches ${first}'s.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm text-left">
            <thead><tr>
              {["Trait", `${first} says`, "Club director says", ""].map((h) => <th key={h} className="vekt-label font-normal py-3 pr-6 border-b border-white/[0.1]">{h}</th>)}
            </tr></thead>
            <tbody>
              {sa.traits.map((t) => (
                <tr key={t.trait} className="align-top">
                  <td className="py-4 pr-6 border-b border-white/[0.06] text-white whitespace-nowrap">{t.trait}</td>
                  <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80 font-light">{t.athlete_says}</td>
                  <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80 font-light">{t.director_says ?? <span className="text-vekt-grey">Not yet</span>}</td>
                  <td className="py-4 border-b border-white/[0.06]"><VerdictMark verdict={t.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n={4} title={`Must-haves: ${mustTitle}`} intro="Your program's must-haves, checked against what you entered about this recruit. Checked by VEKT, not guessed.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08]">
          {report.must_haves.map((m) => (
            <div key={m.key} className="bg-vekt-black p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="vekt-label">{m.label}</span>
                <span className="inline-flex items-center gap-2"><MustHaveMark m={m} /><span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${m.met === true ? "text-white" : "text-vekt-grey"}`}>{mustHaveState(m)}</span></span>
              </div>
              <div className="text-white mt-4">{m.value}</div>
              <div className="text-xs text-vekt-grey mt-1">You need: {m.need}</div>
            </div>
          ))}
        </div>
        {!report.must_haves.length && <p className="text-vekt-grey">Set your must-haves on the Staff & must-haves page.</p>}
      </Section>

      <Section n={5} title="One-to-one with your staff" intro={`What your staff said it wants, against what ${first} showed${director ? " and what their club director saw" : ""}.`}>
        {groups.map((g) => (
          <div key={g.key} className="mb-10">
            <div className="vekt-label mb-3">{g.label}</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm text-left">
                <thead><tr>
                  {["Trait", "Your staff said", first, "Club director", "Match"].map((h) => <th key={h} className="vekt-label font-normal py-3 pr-6 border-b border-white/[0.1]">{h}</th>)}
                </tr></thead>
                <tbody>
                  {report.one_to_one.filter((o) => o.group === g.key).map((o) => (
                    <tr key={o.trait} className="align-top">
                      <td className="py-4 pr-6 border-b border-white/[0.06] text-white whitespace-nowrap">{o.trait}</td>
                      <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80 font-light">{o.staff_said}</td>
                      <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80 font-light">{o.athlete_evidence}</td>
                      <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80 font-light">{o.director_evidence ?? <span className="text-vekt-grey">Not yet</span>}</td>
                      <td className="py-4 border-b border-white/[0.06]"><MatchMark match={o.match} />{o.note && <div className="text-xs text-vekt-grey mt-2 max-w-[220px] font-light">{o.note}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      <Section n={6} title={`How ${first} will respond to each coach`} intro="Based on how each coach on your staff corrects, motivates and handles setbacks.">
        {report.coaches.length ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08]">
            {report.coaches.map((c) => (
              <div key={c.name} className="bg-vekt-black p-6 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="vekt-display text-[26px]">{c.name}</div>
                    {c.title && <div className="text-xs text-vekt-grey mt-1">{c.title}</div>}
                  </div>
                  <MatchMark match={c.match} />
                </div>
                {c.traits.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{c.traits.map((t) => <span key={t} className="border border-white/15 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-vekt-grey">{t}</span>)}</div>}
                <p className="text-white/85 mt-5 font-light">{c.response}</p>
                {c.tip && <p className="text-sm mt-5 pt-4 border-t border-white/[0.08]"><span className="vekt-label mr-2">Tip</span><span className="text-white/80 font-light">{c.tip}</span></p>}
              </div>
            ))}
          </div>
        ) : <p className="text-vekt-grey">Add your staff on the Staff & must-haves page to see a read for each coach.</p>}
      </Section>

      <Section n={7} title={`${report.open_questions.length === 1 ? "One thing" : `${["", "One", "Two", "Three"][report.open_questions.length] ?? report.open_questions.length} things`} to check before an offer`}
        intro="What the conversations couldn't settle. Check these yourself.">
        <div className="grid lg:grid-cols-2 gap-px bg-white/[0.08] border border-white/[0.08]">
          {report.open_questions.map((q) => (
            <div key={q.title} className="bg-vekt-black p-6">
              <div className="vekt-display text-[26px] mb-5">{q.title}</div>
              <dl className="flex flex-col gap-4 text-sm">
                <div><dt className="vekt-label mb-1">Watch for</dt><dd className="text-white/85 font-light">{q.watch_for}</dd></div>
                <div><dt className="vekt-label mb-1">Ask {first}</dt><dd className="text-white/85 font-light">{q.ask_athlete}</dd></div>
                <div><dt className="vekt-label mb-1">Ask their club director</dt><dd className="text-white/85 font-light">{q.ask_director}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section n={8} title="Your move">
        <Decision recruitId={r.id} name={r.recruit_name} decision={r.decision} contactStatus={r.contact_status} clearDate={r.contact_clear_date} onDone={onDecided} />
      </Section>

      <footer className="mt-20 pt-6 border-t border-white/[0.08] text-xs text-vekt-grey max-w-3xl font-light">
        VEKT reads fit, not talent. No scores, no rankings. Everything here is paraphrased from the athlete's and club director's conversations; a minor's words are never shown verbatim. Self-awareness and must-haves are checked by VEKT from the answers and your settings.
      </footer>
    </article>
  );
}

export function Decision({ recruitId, name, decision, contactStatus, clearDate, onDone, compact }: {
  recruitId: string; name: string; decision: string | null; contactStatus?: string; clearDate?: string | null; onDone: () => void; compact?: boolean;
}) {
  const { me } = useSession();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = firstName(name);
  const decide = async (d: "interested" | "not_a_fit") => {
    setBusy(d); setError(null);
    try {
      const out = await api("decision", { recruit_id: recruitId, decision: d, message });
      setResult(d === "not_a_fit" ? "Recorded for your staff. Nothing is sent to the athlete." :
        out.status === "scheduled" ? `Queued. ${first} and a parent hear from you once NCAA contact opens (${date(out.not_before)}).` :
        out.status === "held" ? "Recorded. Contact isn't open yet, so nothing was sent." : `Sent to ${first}, with a parent copied.`);
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  if (!me?.can.write) return <p className="text-vekt-grey text-sm">{decision ? `Staff decision: ${decision === "interested" ? "Interested" : "Not a fit"}` : "No decision yet."}</p>;
  return (
    <div className={compact ? "" : "max-w-2xl"}>
      {decision && <p className="mb-5 text-white">Current decision: <strong className="font-medium">{decision === "interested" ? "Interested" : "Not a fit"}</strong></p>}
      {!compact && (
        <label className="block mb-5">
          <span className="vekt-label">Add a line from you (optional, goes with Interested)</span>
          <Textarea className="mt-2" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} placeholder="We'd like to see you at our ID camp this spring." />
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant={compact ? "secondary" : "primary"} loading={busy === "interested"} onClick={() => decide("interested")}>Interested</Button>
        <Button variant="secondary" loading={busy === "not_a_fit"} onClick={() => decide("not_a_fit")}>Not a fit</Button>
      </div>
      {!compact && (
        <p className="text-xs text-vekt-grey mt-4 font-light">
          Interested replies wait for NCAA contact rules{contactStatus === "hold" && clearDate ? ` (opens ${date(clearDate)})` : ""}, and a parent is copied. It's an invitation to keep talking, not an offer. Not a fit stays with your staff.
        </p>
      )}
      {result && <p className="text-sm text-white mt-4">{result}</p>}
      {error && <div className="mt-4"><ErrorNote message={error} /></div>}
    </div>
  );
}
