// Side-by-Side: 2 to 4 recruits at one position, against your staff.
// Compared, never ranked: who to call first depends on what you need most.
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { FitReport, Match, SideBySideDetail, SideBySideRow } from "../lib/types";
import { Empty, ErrorNote, MatchMark, Panel, PageHeader, Spinner, Badge, ButtonLink } from "../components/ui";
import { date, firstName } from "../lib/format";
import { Decision, MustHaveMark, mustHaveState, Section } from "./FitRead";
import { TRAIT_ORDER } from "../lib/traits";

const NUM = ["", "One", "Two", "Three", "Four"];

export function SideBySideList() {
  const { program } = useSession();
  const { data, error, loading } = useLoad(() => api<{ side_by_sides: SideBySideRow[] }>("side_by_sides", { program_id: program!.id }), [program?.id]);
  return (
    <div>
      <PageHeader eyebrow="Compare" title="Side-by-Side" subtitle="Two to four recruits at the same position, against your staff. Not ranked. Pick them on the Recruits page."
        actions={<ButtonLink to="/recruits">Choose recruits</ButtonLink>} />
      {loading && !data ? <Spinner /> : error ? <ErrorNote message={error} /> : !data?.side_by_sides.length ? (
        <Panel><Empty title="No comparisons yet" hint="Select 2 to 4 recruits at one position on the Recruits page, then choose Side-by-Side." /></Panel>
      ) : (
        <div className="flex flex-col border-t border-white/[0.08]">
          {data.side_by_sides.map((s) => (
            <Link key={s.id} to={`/side-by-side/${s.id}`} className="flex flex-wrap items-center justify-between gap-4 py-5 border-b border-white/[0.08] hover:bg-white/[0.02] px-2">
              <div>
                <div className="vekt-display text-[24px]">{NUM[s.names.length]} {s.position ? `${s.position.toLowerCase()}s` : "recruits"}</div>
                <div className="text-sm text-vekt-grey mt-1">{s.names.join(" · ")}</div>
              </div>
              <div className="flex items-center gap-4"><span className="text-xs text-vekt-grey">{date(s.created_at)}</span><Badge tone={s.status === "ready" ? "done" : s.status === "error" ? "warn" : "progress"}>{s.status === "ready" ? "Ready" : s.status === "error" ? "Error" : "Writing"}</Badge></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const SA_DISPLAY: Record<string, string> = { high: "text-white", moderate: "text-white", low: "text-white", pending: "text-white/30" };

export default function SideBySidePage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useLoad(() => api<SideBySideDetail>("side_by_side_get", { id }), [id]);
  const pending = data?.side_by_side.status === "pending";
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [pending, reload]);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Not found."} />;
  const { side_by_side: sbs, athletes, staff } = data;
  const rep = sbs.report;
  const n = athletes.length;
  const pos = sbs.position ? `${sbs.position}s` : "recruits";
  const cols = `minmax(170px,1.1fr) repeat(${n}, minmax(180px,1fr))`;
  const reports = athletes.map((a) => a.report);
  const anyReport = reports.find(Boolean) as FitReport | undefined;
  const mustKeys = anyReport?.must_haves ?? [];

  const Row = ({ label, sub, cells }: { label: React.ReactNode; sub?: React.ReactNode; cells: React.ReactNode[] }) => (
    <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: cols }}>
      <div className="py-4 pr-5"><div className="text-white text-sm">{label}</div>{sub && <div className="text-xs text-vekt-grey mt-1 font-light">{sub}</div>}</div>
      {cells.map((c, i) => <div key={i} className="py-4 pr-5 text-sm">{c}</div>)}
    </div>
  );
  const Head = () => (
    <div className="grid border-b border-white/[0.1]" style={{ gridTemplateColumns: cols }}>
      <div />
      {athletes.map((a) => <div key={a.id} className="py-3 pr-5"><Link to={`/recruits/${a.id}/fit-read`} className="vekt-display text-[20px] hover:underline underline-offset-4">{a.recruit_name}</Link></div>)}
    </div>
  );
  const Grid = ({ children }: { children: React.ReactNode }) => <div className="overflow-x-auto"><div style={{ minWidth: 170 + n * 190 }}>{children}</div></div>;
  const none = <span className="text-vekt-grey">Not yet</span>;

  return (
    <article>
      <div className="no-print flex items-center justify-between gap-4">
        <Link to="/side-by-side" className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white"><ArrowLeft className="w-4 h-4" /> Side-by-Side</Link>
        <div className="flex items-center gap-5">
          <button onClick={async () => { await api("side_by_side_refresh", { id }); reload(); }} className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white"><RefreshCw className="w-4 h-4" /> Rewrite</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm text-vekt-grey hover:text-white"><Printer className="w-4 h-4" /> Print or save PDF</button>
        </div>
      </div>

      <header className="mt-10">
        <div className="vekt-label mb-5">Side-by-Side · Not ranked</div>
        <h1 className="vekt-display text-[48px] sm:text-[80px] lg:text-[96px] max-w-5xl">{NUM[n]} {pos.toLowerCase()} <span className="text-vekt-grey">and your staff</span></h1>
        <p className="text-vekt-grey mt-5 max-w-2xl font-light">Same position, same staff, side by side. VEKT doesn't pick for you. It shows where each recruit lines up with how your staff coaches, and what's still open.</p>
      </header>

      {pending && <div className="mt-10"><Panel className="p-6 flex items-center gap-4"><Spinner label="Writing the comparison" /></Panel></div>}
      {sbs.status === "error" && <div className="mt-10"><ErrorNote message="The comparison couldn't be written. Try Rewrite." /></div>}

      {/* Self-awareness per athlete */}
      <section className="print-break mt-14 border-t border-white/[0.1] pt-10">
        <div className="vekt-label mb-6">Self-awareness</div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${n === 3 ? "xl:grid-cols-3" : n === 4 ? "xl:grid-cols-4" : ""} gap-px bg-white/[0.08] border border-white/[0.08]`}>
          {athletes.map((a) => (
            <div key={a.id} className="bg-vekt-black p-5 sm:p-6 min-w-0">
              <div className="text-sm text-white truncate">{a.recruit_name}</div>
              <div className={`vekt-display text-[48px] sm:text-[52px] ${n === 4 ? "xl:text-[50px]" : "xl:text-[64px]"} mt-3 whitespace-nowrap ${SA_DISPLAY[a.self_awareness?.level ?? "pending"]}`}>{a.self_awareness?.label ?? "Pending"}</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-vekt-grey mt-3">
                {a.self_awareness && a.self_awareness.level !== "pending" ? `${a.self_awareness.same_story} of ${a.self_awareness.covered} the same` : a.report ? "Director not in yet" : "Conversation not done"}
              </div>
              {rep?.athletes.find((x) => x.recruit_id === a.id)?.one_line && <p className="text-sm text-white/75 mt-4 font-light">{rep.athletes.find((x) => x.recruit_id === a.id)!.one_line}</p>}
            </div>
          ))}
        </div>
      </section>

      {rep && !rep.waiting && (
        <Section n={1} title="Who to call first depends on what you need most">
          <div className="flex flex-col border-t border-white/[0.08]">
            {rep.who_first.map((w) => (
              <div key={w.need} className="grid md:grid-cols-[1fr_1fr_1.4fr] gap-3 md:gap-8 py-5 border-b border-white/[0.08]">
                <div className="vekt-display text-[22px]">If you need {w.need.charAt(0).toLowerCase() + w.need.slice(1)}</div>
                <div className="text-white">{w.athletes.join(", ")}</div>
                <p className="text-sm text-vekt-grey font-light">{w.why}</p>
              </div>
            ))}
          </div>
          {rep.tradeoff && <p className="text-white/85 mt-8 max-w-3xl font-light"><span className="vekt-label mr-3">The tradeoff</span>{rep.tradeoff}</p>}
        </Section>
      )}
      {rep?.waiting && <p className="text-vekt-grey mt-10">At least two recruits need a finished Fit Read before the comparison is written.</p>}

      <Section n={2} title="Must-haves" intro="Checked by VEKT against your program's must-haves. Misses are marked.">
        {mustKeys.length ? (
          <Grid>
            <Head />
            {mustKeys.map((m) => (
              <Row key={m.key} label={m.label} sub={m.need} cells={reports.map((r) => {
                const x = r?.must_haves.find((y) => y.key === m.key);
                return x ? <span className="flex flex-col gap-1"><span className="inline-flex items-center gap-2"><MustHaveMark m={x} /><span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${x.met === true ? "text-white" : "text-vekt-grey"}`}>{mustHaveState(x)}</span></span><span className="text-xs text-vekt-grey">{x.value}</span></span> : none;
              })} />
            ))}
          </Grid>
        ) : <p className="text-vekt-grey">No Fit Reads yet.</p>}
      </Section>

      <Section n={3} title="Your staff's standard, athlete by athlete">
        <Grid>
          <Head />
          {TRAIT_ORDER.map((t) => {
            const said = anyReport?.one_to_one.find((o) => o.trait === t)?.staff_said;
            return <Row key={t} label={t} sub={said} cells={reports.map((r) => {
              const o = r?.one_to_one.find((x) => x.trait === t);
              return o ? <span className="flex flex-col gap-1.5"><MatchMark match={o.match} />{o.note && <span className="text-xs text-vekt-grey font-light">{o.note}</span>}</span> : none;
            })} />;
          })}
        </Grid>
      </Section>

      <Section n={4} title="Their game" intro="Systems against yours, and how closely each athlete's hard-skills read matches their club director's.">
        <Grid>
          <Head />
          <Row label="Hard-skills read" sub="Athlete and club director, rated separately" cells={athletes.map((a) => a.player?.skills?.compared
            ? <span className="flex flex-col gap-1"><span className="vekt-display text-[20px]">{a.player.skills.same} of {a.player.skills.compared} the same</span><span className="text-xs text-vekt-grey font-light">{a.player.skills.athlete_higher ? `Rates self higher on ${a.player.skills.athlete_higher}` : "No inflated ratings"}</span></span> : none)} />
          {(athletes.find((a) => a.player?.systems?.length)?.player?.systems ?? []).map((g) => (
            <Row key={g.group} label={g.label} sub={`You run ${g.program.join(", ")}`} cells={athletes.map((a) => {
              const x = a.player?.systems?.find((y) => y.group === g.group);
              if (!x || x.verdict === "unknown") return none;
              const m = x.verdict === "plays_yours" ? "strong" : x.verdict === "comfortable" ? "match" : "gap";
              const label = x.verdict === "plays_yours" ? "Plays it" : x.verdict === "comfortable" ? "Says they know it" : "New to them";
              return <span className="flex flex-col gap-1.5"><span className="inline-flex items-center gap-2"><MatchMark match={m} label={false} /><span className="font-mono text-[11px] uppercase tracking-[0.1em]">{label}</span></span><span className="text-xs text-vekt-grey">{[...new Set([...x.athlete, ...x.director])].join(", ")}</span></span>;
            })} />
          ))}
          {(athletes.find((a) => a.player?.measurables?.length)?.player?.measurables ?? []).slice(0, 4).map((m) => (
            <Row key={m.key} label={m.label} sub={m.unit !== "time" ? m.unit : undefined} cells={athletes.map((a) => {
              const x = a.player?.measurables?.find((y) => y.key === m.key);
              return x ? <span className="flex flex-col gap-1"><span className="text-white">{x.athlete ?? x.director}</span><span className="text-xs text-vekt-grey">{x.status === "confirmed" ? "Confirmed by director" : x.status === "differs" ? `Director: ${x.director}` : x.status === "self_reported" ? "Self-reported" : "From director"}</span></span> : none;
            })} />
          ))}
        </Grid>
      </Section>

      <Section n={5} title="Each coach, each athlete">
        {staff.length ? (
          <Grid>
            <Head />
            {staff.map((c) => (
              <Row key={c.name} label={c.name} sub={[c.title, c.traits.join(", ")].filter(Boolean).join(" · ")} cells={reports.map((r) => {
                const x = r?.coaches.find((y) => y.name === c.name);
                return x ? <span className="flex flex-col gap-1.5"><MatchMark match={x.match as Match} /><span className="text-xs text-vekt-grey font-light">{x.tip}</span></span> : none;
              })} />
            ))}
          </Grid>
        ) : <p className="text-vekt-grey">Add your staff on the Staff & must-haves page.</p>}
      </Section>

      <Section n={6} title="Still open, athlete by athlete">
        <div className="grid gap-px bg-white/[0.08] border border-white/[0.08]" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}>
          {athletes.map((a) => (
            <div key={a.id} className="bg-vekt-black p-6">
              <div className="text-white mb-4">{a.recruit_name}</div>
              {a.report?.open_questions.length ? (
                <ul className="flex flex-col gap-4">
                  {a.report.open_questions.map((q) => <li key={q.title}><div className="vekt-display text-[19px]">{q.title}</div><div className="text-xs text-vekt-grey mt-1 font-light">Ask {firstName(a.recruit_name)}: {q.ask_athlete}</div></li>)}
                </ul>
              ) : <p className="text-sm text-vekt-grey">{a.report ? "Nothing open." : "Conversation not done."}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section n={7} title="Your move" intro="Interested replies wait for NCAA contact rules, and a parent is copied. Not a fit stays with your staff.">
        <div className="grid gap-px bg-white/[0.08] border border-white/[0.08]" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))` }}>
          {athletes.map((a) => (
            <div key={a.id} className="bg-vekt-black p-6">
              <div className="text-white mb-4">{a.recruit_name}</div>
              <Decision compact recruitId={a.id} name={a.recruit_name} decision={a.decision} onDone={reload} />
            </div>
          ))}
        </div>
      </Section>
    </article>
  );
}
