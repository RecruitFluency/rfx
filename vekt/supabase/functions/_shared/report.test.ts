import { describe, expect, it } from "vitest";
import { mustHaves, normalizeReport, normalizeSideBySide, selfAwareness, strongestCoach, TRAITS, type TraitRead } from "./report.ts";
import { nextSendTime, zoneForState } from "./quiet.ts";

const traits = (verdicts: TraitRead["verdict"][]): TraitRead[] =>
  verdicts.map((v, i) => ({ trait: TRAITS[i].trait, athlete_says: "a", director_says: "d", verdict: v }));

describe("selfAwareness", () => {
  it("is pending until the club director answers", () => {
    expect(selfAwareness(traits(Array(8).fill("same_story")), false).level).toBe("pending");
  });
  it("is high when 8 of 8 tell the same story", () => {
    const sa = selfAwareness(traits(Array(8).fill("same_story")), true);
    expect(sa).toMatchObject({ level: "high", label: "High", same_story: 8, covered: 8, contradictions: 0 });
  });
  it("is moderate with one contradiction", () => {
    expect(selfAwareness(traits(["same_story", "same_story", "same_story", "same_story", "same_story", "look_closer", "contradiction", "same_story"]), true).level).toBe("moderate");
  });
  it("shows two contradictions as Big gaps, never a harsher word", () => {
    const sa = selfAwareness(traits(["same_story", "contradiction", "contradiction", "same_story", "same_story", "same_story", "same_story", "same_story"]), true);
    expect(sa.level).toBe("low");
    expect(sa.label).toBe("Big gaps");
  });
  it("ignores traits nobody covered", () => {
    const sa = selfAwareness(traits(["same_story", "same_story", "same_story", "not_covered", "not_covered", "not_covered", "not_covered", "not_covered"]), true);
    expect(sa).toMatchObject({ level: "high", covered: 3 });
  });
});

describe("mustHaves", () => {
  const need = { positions: ["Center back"], min_grad_year: 2028, max_grad_year: 2029, club_levels: ["MLS NEXT"], min_gpa: 3.0, max_family_cost: 25000 };
  it("checks all six in code", () => {
    const m = mustHaves(need, { position: "Center Back", grad_year: 2028, club_level: "mls next", club_or_school: "FC Dallas", gpa: 3.6, family_cost_min: 20000, family_cost_max: 30000 });
    expect(m.map((x) => x.key)).toEqual(["position", "grad_year", "club_level", "club_team", "gpa", "affordability"]);
    expect(m.every((x) => x.met === true)).toBe(true);
    expect(m.find((x) => x.key === "affordability")?.value).toBe("Family budget $20k to $30k a year");
  });
  it("marks misses and unknowns separately", () => {
    const m = mustHaves(need, { position: "Winger", grad_year: 2031, gpa: null });
    expect(m.find((x) => x.key === "position")?.met).toBe(false);
    expect(m.find((x) => x.key === "grad_year")?.met).toBe(false);
    expect(m.find((x) => x.key === "gpa")?.met).toBeNull();
    expect(m.find((x) => x.key === "affordability")?.value).toBe("Not shared yet");
  });
});

describe("normalizeReport", () => {
  const raw = {
    short_answer: { headline: "Jordan fits how you coach.", summary: "s", cards: [{ title: "Plays your system", match: "strong", text: "t" }, { title: "Bad", match: "nonsense", text: "x" }] },
    self_awareness: { summary: "Same story.", traits: TRAITS.map((t) => ({ trait: t.trait.toLowerCase(), athlete_says: "a", director_says: "d", verdict: "same_story" })) },
    one_to_one: [{ trait: "Accountability", staff_said: "own it", athlete_evidence: "owns it", director_evidence: "yes", match: "strong", note: "n" }],
    coaches: [{ name: "Sam Reyes", title: "Head coach", traits: ["Direct"], match: "strong", response: "r", tip: "t" }, { name: "Made Up", match: "gap" }],
    open_questions: [{ title: "Q1", watch_for: "w", ask_athlete: "a", ask_director: "d" }],
  };
  it("always returns all eight traits and drops coaches not on staff", () => {
    const r = normalizeReport(raw, { hasDirector: true, mustHaves: [], staffNames: ["Sam Reyes"], now: "2026-10-19T00:00:00Z" });
    expect(r.self_awareness.traits).toHaveLength(8);
    expect(r.self_awareness.level).toBe("high");
    expect(r.one_to_one).toHaveLength(8);
    expect(r.one_to_one.find((x) => x.trait === "Accountability")?.match).toBe("strong");
    expect(r.one_to_one.find((x) => x.trait === "Academics")?.match).toBe("not_covered");
    expect(r.coaches.map((c) => c.name)).toEqual(["Sam Reyes"]);
    expect(r.short_answer.cards[1].match).toBe("not_covered");
  });
  it("blanks director evidence and verdicts when there is no director", () => {
    const r = normalizeReport(raw, { hasDirector: false, mustHaves: [], staffNames: [] });
    expect(r.self_awareness.level).toBe("pending");
    expect(r.self_awareness.traits.every((t) => t.director_says === null && t.verdict === "not_covered")).toBe(true);
    expect(r.one_to_one.every((t) => t.director_evidence === null)).toBe(true);
  });
});

describe("side-by-side", () => {
  it("resolves names and picks the strongest coach", () => {
    const report = normalizeReport({ coaches: [{ name: "A", match: "gap" }, { name: "B", match: "strong" }] }, { hasDirector: false, mustHaves: [], staffNames: [] });
    expect(strongestCoach(report)).toBe("B");
    const athletes = ["Jordan Ellis", "Marcus Hill"].map((name, i) => ({ recruit_id: String(i), name, grad_year: 2028, club: null, self_awareness: "high" as const, self_awareness_label: "High", strongest_coach: null, one_line: "" }));
    const s = normalizeSideBySide({ who_first: [{ need: "A starter now", athletes: ["Jordan", "Nobody"], why: "w" }, { need: "Empty", athletes: [] }], tradeoff: "t" }, athletes, "Center back");
    expect(s.who_first).toEqual([{ need: "A starter now", athletes: ["Jordan Ellis"], why: "w" }]);
  });
});

describe("quiet hours", () => {
  it("maps states to zones with an Eastern fallback", () => {
    expect(zoneForState("ca")).toBe("America/Los_Angeles");
    expect(zoneForState(null)).toBe("America/New_York");
  });
  it("holds a 6am Pacific text until 9am Pacific", () => {
    const t = nextSendTime(new Date("2026-10-19T13:30:00Z"), "America/Los_Angeles"); // 6:30am PDT
    expect(t.toISOString()).toBe("2026-10-19T16:00:00.000Z");
  });
  it("sends right away inside the window and rolls late texts to the next morning", () => {
    const noon = new Date("2026-10-19T16:00:00Z"); // noon EDT
    expect(nextSendTime(noon, "America/New_York")).toBe(noon);
    expect(nextSendTime(new Date("2026-10-20T01:30:00Z"), "America/New_York").toISOString()).toBe("2026-10-20T13:00:00.000Z");
  });
});
