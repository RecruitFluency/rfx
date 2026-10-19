// The structured Fit Read and Side-by-Side. The model writes the words; the
// facts a coach would check (self-awareness level, trait counts, must-haves)
// are computed here from the data, so they are consistent and auditable.
// Plain TypeScript (no Deno globals) so it is unit-tested under Node.

export const REPORT_VERSION = 1;

export type Match = "strong" | "match" | "look_closer" | "gap" | "not_covered";
export type Verdict = "same_story" | "look_closer" | "contradiction" | "not_covered";
export type SelfAwarenessLevel = "high" | "moderate" | "low" | "pending";

/** The eight traits every Fit Read covers, in order. */
export const TRAITS: { trait: string; group: "on_field" | "off_field" }[] = [
  { trait: "Tactical identity", group: "on_field" },
  { trait: "Coaching in training", group: "on_field" },
  { trait: "Game-day leadership", group: "on_field" },
  { trait: "Physical demands", group: "on_field" },
  { trait: "Film and preparation", group: "off_field" },
  { trait: "Accountability", group: "off_field" },
  { trait: "Connecting with coaches", group: "off_field" },
  { trait: "Academics", group: "off_field" },
];

/** What coaches see. "low" is shown as "Big gaps": these are minors. */
export const SELF_AWARENESS_LABEL: Record<SelfAwarenessLevel, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Big gaps",
  pending: "Pending",
};

export interface TraitRead {
  trait: string;
  athlete_says: string;
  director_says: string | null;
  verdict: Verdict;
}

export interface SelfAwareness {
  level: SelfAwarenessLevel;
  label: string;
  same_story: number;
  covered: number;
  contradictions: number;
  summary: string;
  traits: TraitRead[];
}

export interface MustHave {
  key: string;
  label: string;
  need: string;
  value: string;
  met: boolean | null; // null = not enough information
}

export interface OneToOne {
  group: "on_field" | "off_field";
  trait: string;
  staff_said: string;
  athlete_evidence: string;
  director_evidence: string | null;
  match: Match;
  note: string;
}

export interface CoachRead {
  name: string;
  title: string | null;
  traits: string[];
  match: Match;
  response: string;
  tip: string;
}

export interface OpenQuestion {
  title: string;
  watch_for: string;
  ask_athlete: string;
  ask_director: string;
}

export interface FitReport {
  version: number;
  short_answer: { headline: string; summary: string; cards: { title: string; match: Match; text: string }[] };
  self_awareness: SelfAwareness;
  must_haves: MustHave[];
  one_to_one: OneToOne[];
  coaches: CoachRead[];
  open_questions: OpenQuestion[];
  generated_at: string;
}

const MATCHES: Match[] = ["strong", "match", "look_closer", "gap", "not_covered"];
const VERDICTS: Verdict[] = ["same_story", "look_closer", "contradiction", "not_covered"];
const asMatch = (v: unknown): Match => (MATCHES.includes(v as Match) ? (v as Match) : "not_covered");
const asVerdict = (v: unknown): Verdict => (VERDICTS.includes(v as Verdict) ? (v as Verdict) : "not_covered");
const text = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Self-awareness from the trait comparison.
 * pending  - the club director hasn't given a read yet
 * high     - no contradictions and at least 3 in 4 covered traits tell the same story
 * low      - two or more contradictions, or fewer than half tell the same story
 * moderate - everything in between
 */
export function selfAwareness(traits: TraitRead[], hasDirector: boolean, summary = ""): SelfAwareness {
  const covered = traits.filter((t) => t.verdict !== "not_covered");
  const same = covered.filter((t) => t.verdict === "same_story").length;
  const contra = covered.filter((t) => t.verdict === "contradiction").length;
  let level: SelfAwarenessLevel;
  if (!hasDirector || covered.length === 0) level = "pending";
  else if (contra === 0 && same >= Math.ceil(covered.length * 0.75)) level = "high";
  else if (contra >= 2 || same < covered.length / 2) level = "low";
  else level = "moderate";
  return {
    level, label: SELF_AWARENESS_LABEL[level], same_story: same, covered: covered.length, contradictions: contra,
    summary, traits,
  };
}

export interface ProgramMustHaves {
  positions?: string[];
  min_grad_year?: number;
  max_grad_year?: number;
  club_levels?: string[];
  min_gpa?: number;
  max_family_cost?: number; // what a family pays per year here after typical aid
}

export interface RecruitFacts {
  position?: string | null;
  grad_year?: number | null;
  club_level?: string | null;
  club_or_school?: string | null;
  gpa?: number | null;
  family_cost_min?: number | null;
  family_cost_max?: number | null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const usd = (n: number) => `$${Math.round(n / 1000)}k`;

/** The program's must-haves checked against what we know about the recruit. */
export function mustHaves(need: ProgramMustHaves, r: RecruitFacts): MustHave[] {
  const out: MustHave[] = [];
  if (need.positions?.length) {
    out.push({
      key: "position", label: "Position", need: need.positions.join(" or "), value: r.position || "Not given",
      met: r.position ? need.positions.some((p) => norm(p) === norm(r.position!) || norm(r.position!).includes(norm(p))) : null,
    });
  }
  if (need.min_grad_year || need.max_grad_year) {
    const lo = need.min_grad_year, hi = need.max_grad_year;
    const needText = lo && hi ? (lo === hi ? `Class of ${lo}` : `Class of ${lo}–${hi}`) : lo ? `${lo} or later` : `${hi} or earlier`;
    out.push({
      key: "grad_year", label: "Grad year", need: needText, value: r.grad_year ? `Class of ${r.grad_year}` : "Not given",
      met: r.grad_year ? (!lo || r.grad_year >= lo) && (!hi || r.grad_year <= hi) : null,
    });
  }
  if (need.club_levels?.length) {
    out.push({
      key: "club_level", label: "Club level", need: need.club_levels.join(", "), value: r.club_level || "Not given",
      met: r.club_level ? need.club_levels.some((l) => norm(l) === norm(r.club_level!)) : null,
    });
  }
  out.push({ key: "club_team", label: "Club team", need: "Any club", value: r.club_or_school || "Not given", met: r.club_or_school ? true : null });
  if (need.min_gpa) {
    out.push({
      key: "gpa", label: "GPA", need: `${need.min_gpa.toFixed(1)} or higher`, value: r.gpa != null ? r.gpa.toFixed(1) : "Not given",
      met: r.gpa != null ? r.gpa >= need.min_gpa : null,
    });
  }
  if (need.max_family_cost) {
    const has = r.family_cost_max != null;
    const range = has ? (r.family_cost_min != null && r.family_cost_min !== r.family_cost_max
      ? `Family budget ${usd(r.family_cost_min)} to ${usd(r.family_cost_max!)} a year` : `Family budget ${usd(r.family_cost_max!)} a year`) : "Not shared yet";
    out.push({
      key: "affordability", label: "Affordability", need: `About ${usd(need.max_family_cost)} a year after aid`, value: range,
      met: has ? r.family_cost_max! >= need.max_family_cost : null,
    });
  }
  return out;
}

/** Validates and normalizes the model's JSON into the report shape. */
export function normalizeReport(raw: Record<string, unknown>, opts: {
  hasDirector: boolean; mustHaves: MustHave[]; staffNames: string[]; now?: string;
}): FitReport {
  const sa = (raw.self_awareness ?? {}) as Record<string, unknown>;
  const rawTraits = Array.isArray(sa.traits) ? (sa.traits as Record<string, unknown>[]) : [];
  const traits: TraitRead[] = TRAITS.map(({ trait }) => {
    const t = rawTraits.find((x) => norm(text(x.trait)) === norm(trait)) ?? {};
    const director = opts.hasDirector ? text(t.director_says) || null : null;
    // A verdict needs both sides; without the director's read it is not covered.
    const verdict = director ? asVerdict(t.verdict) : "not_covered";
    return { trait, athlete_says: text(t.athlete_says) || "Not covered yet.", director_says: director, verdict };
  });

  const sh = (raw.short_answer ?? {}) as Record<string, unknown>;
  const cards = (Array.isArray(sh.cards) ? (sh.cards as Record<string, unknown>[]) : []).slice(0, 4)
    .map((c) => ({ title: text(c.title, 80), match: asMatch(c.match), text: text(c.text, 300) }))
    .filter((c) => c.title);

  const rawRows = Array.isArray(raw.one_to_one) ? (raw.one_to_one as Record<string, unknown>[]) : [];
  const one_to_one: OneToOne[] = TRAITS.map(({ trait, group }) => {
    const r = rawRows.find((x) => norm(text(x.trait)) === norm(trait)) ?? {};
    return {
      group, trait,
      staff_said: text(r.staff_said) || "Not covered in your staff's profile yet.",
      athlete_evidence: text(r.athlete_evidence) || "Not covered yet.",
      director_evidence: opts.hasDirector ? text(r.director_evidence) || null : null,
      match: asMatch(r.match),
      note: text(r.note, 400),
    };
  });

  const coaches = (Array.isArray(raw.coaches) ? (raw.coaches as Record<string, unknown>[]) : [])
    .filter((c) => opts.staffNames.length === 0 || opts.staffNames.some((n) => norm(n) === norm(text(c.name))))
    .slice(0, 6)
    .map((c) => ({
      name: text(c.name, 80), title: text(c.title, 120) || null,
      traits: (Array.isArray(c.traits) ? c.traits : []).map((x) => text(x, 30)).filter(Boolean).slice(0, 4),
      match: asMatch(c.match), response: text(c.response, 400), tip: text(c.tip, 300),
    }));

  const open_questions = (Array.isArray(raw.open_questions) ? (raw.open_questions as Record<string, unknown>[]) : [])
    .slice(0, 3)
    .map((q) => ({ title: text(q.title, 80), watch_for: text(q.watch_for, 300), ask_athlete: text(q.ask_athlete, 300), ask_director: text(q.ask_director, 300) }))
    .filter((q) => q.title);

  return {
    version: REPORT_VERSION,
    short_answer: { headline: text(sh.headline, 200), summary: text(sh.summary, 700), cards },
    self_awareness: selfAwareness(traits, opts.hasDirector, text(sa.summary, 500)),
    must_haves: opts.mustHaves,
    one_to_one, coaches, open_questions,
    generated_at: opts.now ?? new Date().toISOString(),
  };
}

/** JSON the model must return for a Fit Read (appended to the existing prompt). */
export function reportPromptSpec(staff: { name: string; title: string | null }[], hasDirector: boolean): string {
  const traitList = TRAITS.map((t) => `"${t.trait}"`).join(", ");
  const staffList = staff.length ? staff.map((s) => `${s.name}${s.title ? ` (${s.title})` : ""}`).join("; ") : "(no staff profiles yet: return an empty list)";
  return `"report": {
    "short_answer": { "headline": "One sentence, under 20 words, that a coach reads first, e.g. 'Jordan matches how your staff coaches. He's built for your back line and your film room.' Use the athlete's first name. Be honest if the fit is weak.",
      "summary": "2-3 sentences.",
      "cards": [ { "title": "3-5 words, e.g. 'Plays your system'", "match": "strong|match|look_closer|gap", "text": "one sentence" } ] },
    "self_awareness": { "summary": "2 sentences on whether the athlete sees themselves the way their club director does.${hasDirector ? "" : " The director has not answered yet: say so."}",
      "traits": [ { "trait": one of ${traitList}, "athlete_says": "short paraphrase of how the athlete describes themselves", "director_says": ${hasDirector ? "\"short paraphrase of the club director's blind read\"" : "null"}, "verdict": "same_story|look_closer|contradiction|not_covered" } ] },
    "one_to_one": [ { "trait": one of ${traitList}, "staff_said": "paraphrase of what this staff wants (from the program profile)", "athlete_evidence": "what the athlete showed", "director_evidence": ${hasDirector ? "\"what the director saw\"" : "null"}, "match": "strong|match|look_closer|gap|not_covered", "note": "one sentence on the match" } ],
    "coaches": [ { "name": exactly one of: ${staffList}, "title": "their title", "traits": ["2-3 one-word style labels, e.g. Direct"], "match": "strong|match|look_closer|gap", "response": "how this athlete will likely respond to this coach's style, 1-2 sentences", "tip": "one practical tip for this coach" } ],
    "open_questions": [ { "title": "the thing to check yourself before an offer, 3-6 words", "watch_for": "what to look for in person", "ask_athlete": "a question to ask the athlete", "ask_director": "a question to ask the club director" } ]
  }
Report rules: cover all eight traits in self_awareness.traits and one_to_one, using "not_covered" when the answers don't touch a trait; never invent evidence. Two open questions at most three. Paraphrase; never quote a minor's words verbatim.`;
}

// ---- Side-by-Side --------------------------------------------------------------

export interface SideBySideAthlete {
  recruit_id: string;
  name: string;
  grad_year: number | null;
  club: string | null;
  self_awareness: SelfAwarenessLevel;
  self_awareness_label: string;
  strongest_coach: string | null;
  one_line: string;
}

export interface SideBySideReport {
  version: number;
  position: string | null;
  athletes: SideBySideAthlete[];
  who_first: { need: string; athletes: string[]; why: string }[];
  tradeoff: string;
  generated_at: string;
}

const MATCH_RANK: Record<Match, number> = { strong: 4, match: 3, look_closer: 2, gap: 1, not_covered: 0 };

/** The coach on staff this athlete is likely to respond to best. */
export function strongestCoach(report: FitReport | null): string | null {
  if (!report?.coaches.length) return null;
  return [...report.coaches].sort((a, b) => MATCH_RANK[b.match] - MATCH_RANK[a.match])[0].name;
}

export function normalizeSideBySide(raw: Record<string, unknown>, athletes: SideBySideAthlete[], position: string | null, now?: string): SideBySideReport {
  const names = athletes.map((a) => a.name);
  const firstNames = new Map(athletes.map((a) => [norm(a.name.split(/\s+/)[0]), a.name]));
  const resolve = (n: string) => names.find((x) => norm(x) === norm(n)) ?? firstNames.get(norm(n.split(/\s+/)[0])) ?? null;
  const lines = (raw.one_lines ?? {}) as Record<string, unknown>;
  return {
    version: REPORT_VERSION,
    position,
    athletes: athletes.map((a) => ({ ...a, one_line: text(lines[a.name], 160) || a.one_line })),
    who_first: (Array.isArray(raw.who_first) ? (raw.who_first as Record<string, unknown>[]) : []).slice(0, 4).map((w) => ({
      need: text(w.need, 80),
      athletes: (Array.isArray(w.athletes) ? w.athletes : []).map((n) => resolve(text(n))).filter((n): n is string => !!n),
      why: text(w.why, 300),
    })).filter((w) => w.need && w.athletes.length),
    tradeoff: text(raw.tradeoff, 900),
    generated_at: now ?? new Date().toISOString(),
  };
}
