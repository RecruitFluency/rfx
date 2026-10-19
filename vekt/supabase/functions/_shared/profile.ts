// The hard-skills side of a Fit Read, computed in code from the athlete's
// profile, the club director's evaluation and the program's systems. Same idea
// as self-awareness: does the athlete see their game the way their director does?
import { forPositions, SKILL_LEVELS, type SkillLevel, type Sport } from "./sports.ts";

export interface AthleteProfile {
  primary_position?: string | null;
  secondary_positions?: string[];
  systems?: Record<string, string[]>;
  skills?: Record<string, SkillLevel>;
  measurables?: Record<string, string>;
  attributes?: Record<string, string | string[]>;
  marks?: { event: string; mark: string; date?: string; meet?: string }[];
  film_links?: string[];
  intended_major?: string | null;
}
export interface ClubEvaluation {
  primary_position?: string | null;
  positions_played?: string[];
  systems_played?: Record<string, string[]>;
  team_systems?: Record<string, string[]>;
  skills?: Record<string, SkillLevel>;
  measurables?: Record<string, string>;
  notes?: string | null;
}

const RANK: Record<SkillLevel, number> = { strength: 3, solid: 2, developing: 1, not_yet: 0 };
const LEVEL_LABEL = Object.fromEntries(SKILL_LEVELS.map((l) => [l.key, l.label])) as Record<SkillLevel, string>;
export const isLevel = (v: unknown): v is SkillLevel => typeof v === "string" && v in RANK;

export type SkillVerdict = "same" | "athlete_higher" | "director_higher" | "athlete_only" | "director_only";
export interface SkillRow { key: string; label: string; set: string; athlete: string | null; director: string | null; verdict: SkillVerdict }
export interface SkillsRead { rows: SkillRow[]; compared: number; same: number; athlete_higher: number; director_higher: number; summary: string }

export function skillsRead(sport: Sport, a: AthleteProfile | null, d: ClubEvaluation | null): SkillsRead {
  const positions = [a?.primary_position, ...(a?.secondary_positions ?? []), d?.primary_position];
  const rows: SkillRow[] = [];
  for (const set of forPositions(sport, positions).skills) {
    for (const s of set.skills) {
      const av = a?.skills?.[s.key], dv = d?.skills?.[s.key];
      if (!isLevel(av) && !isLevel(dv)) continue;
      const verdict: SkillVerdict = !isLevel(dv) ? "athlete_only" : !isLevel(av) ? "director_only"
        : RANK[av] === RANK[dv] ? "same" : RANK[av] > RANK[dv] ? "athlete_higher" : "director_higher";
      rows.push({ key: s.key, label: s.label, set: set.label, athlete: isLevel(av) ? LEVEL_LABEL[av] : null, director: isLevel(dv) ? LEVEL_LABEL[dv] : null, verdict });
    }
  }
  const both = rows.filter((r) => r.athlete && r.director);
  const same = both.filter((r) => r.verdict === "same").length;
  const up = both.filter((r) => r.verdict === "athlete_higher").length;
  const down = both.filter((r) => r.verdict === "director_higher").length;
  const summary = !both.length ? (d ? "The athlete hasn't rated their skills yet." : "Waiting on the club director's evaluation.")
    : `Same read on ${same} of ${both.length} skills.${up ? ` Rates themselves higher on ${up}.` : ""}${down ? ` Their director rates them higher on ${down}.` : ""}`;
  return { rows, compared: both.length, same, athlete_higher: up, director_higher: down, summary };
}

export type SystemVerdict = "plays_yours" | "comfortable" | "new_to_them" | "unknown";
export interface SystemRow { group: string; label: string; program: string[]; athlete: string[]; director: string[]; overlap: string[]; verdict: SystemVerdict }

/** For each system group the program runs: has this athlete played it? */
export function systemsFit(sport: Sport, program: Record<string, string[]>, a: AthleteProfile | null, d: ClubEvaluation | null): SystemRow[] {
  return sport.systems.filter((g) => program[g.key]?.length).map((g) => {
    const prog = program[g.key] ?? [];
    const ath = a?.systems?.[g.key] ?? [];
    const dir = [...new Set([...(d?.systems_played?.[g.key] ?? []), ...(d?.team_systems?.[g.key] ?? [])])];
    const confirmed = prog.filter((x) => dir.includes(x));
    const claimed = prog.filter((x) => ath.includes(x));
    const verdict: SystemVerdict = confirmed.length ? "plays_yours" : claimed.length ? "comfortable" : ath.length || dir.length ? "new_to_them" : "unknown";
    return { group: g.key, label: g.label, program: prog, athlete: ath, director: dir, overlap: [...new Set([...confirmed, ...claimed])], verdict };
  });
}

export type MeasureStatus = "confirmed" | "differs" | "self_reported" | "director_only";
export interface MeasureRow { key: string; label: string; unit: string; athlete: string | null; director: string | null; status: MeasureStatus }

/** Measurables, marked confirmed when the director gives the same number. */
export function measurablesTable(sport: Sport, a: AthleteProfile | null, d: ClubEvaluation | null): MeasureRow[] {
  const ms = forPositions(sport, [a?.primary_position, ...(a?.secondary_positions ?? []), d?.primary_position]).measurables;
  const num = (v: string) => Number(v.replace(/[^\d.:]/g, "").split(":").reduce((t, x) => t * 60 + Number(x), 0));
  return ms.flatMap((m) => {
    const av = a?.measurables?.[m.key]?.trim() || null, dv = d?.measurables?.[m.key]?.trim() || null;
    if (!av && !dv) return [];
    let status: MeasureStatus = !dv ? "self_reported" : !av ? "director_only" : "differs";
    if (av && dv) {
      const x = num(av), y = num(dv);
      status = av === dv || (x > 0 && y > 0 && Math.abs(x - y) / Math.max(x, y) <= 0.02) ? "confirmed" : "differs";
    }
    return [{ key: m.key, label: m.label, unit: m.unit, athlete: av, director: dv, status }];
  });
}

// ---- Cleaning what the athlete and director send -----------------------------
// Only values from the sport catalog are kept, so stored profiles always line up
// with the program's settings and nobody can stuff free text into a level.

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function cleanPositions(sport: Sport, v: unknown, max = 3) {
  const labels = sport.positions.map((x) => x.label);
  return [...new Set(list(v).filter((x) => labels.includes(x)))].slice(0, max);
}
function cleanSystems(sport: Sport, v: unknown) {
  const out: Record<string, string[]> = {};
  const raw = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  for (const g of sport.systems) {
    const picked = [...new Set(list(raw[g.key]).filter((x) => g.options.includes(x)))];
    if (picked.length) out[g.key] = picked;
  }
  return out;
}
function cleanSkills(sport: Sport, v: unknown) {
  const keys = new Set(sport.skills.flatMap((s) => s.skills.map((x) => x.key)));
  const out: Record<string, SkillLevel> = {};
  for (const [k, lv] of Object.entries((v && typeof v === "object" ? v : {}) as Record<string, unknown>)) if (keys.has(k) && isLevel(lv)) out[k] = lv;
  return out;
}
function cleanMeasurables(sport: Sport, v: unknown) {
  const keys = new Set(sport.measurables.map((m) => m.key));
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries((v && typeof v === "object" ? v : {}) as Record<string, unknown>)) {
    const t = str(typeof val === "number" ? String(val) : val, 20).replace(/[^\d.:'" -]/g, "").trim();
    if (keys.has(k) && /\d/.test(t)) out[k] = t;
  }
  return out;
}

export function cleanProfile(sport: Sport, raw: Record<string, unknown>) {
  const positions = cleanPositions(sport, [raw.primary_position, ...list(raw.secondary_positions)], 4);
  const attributes: Record<string, string | string[]> = {};
  const rawAttr = (raw.attributes && typeof raw.attributes === "object" ? raw.attributes : {}) as Record<string, unknown>;
  for (const a of sport.attributes) {
    const v = rawAttr[a.key];
    if (a.multi) { const picked = list(v).filter((x) => a.options.includes(x)); if (picked.length) attributes[a.key] = picked; }
    else if (typeof v === "string" && a.options.includes(v)) attributes[a.key] = v;
  }
  const events = new Set((sport.events ?? []).map((e) => e.key));
  const marks = (Array.isArray(raw.marks) ? raw.marks : []).slice(0, 30)
    .map((m: any) => ({ event: str(m?.event, 20), mark: str(m?.mark, 20), date: str(m?.date, 10) || undefined, meet: str(m?.meet, 80) || undefined }))
    .filter((m) => events.has(m.event) && /\d/.test(m.mark));
  const film_links = list(raw.film_links).map((u) => u.trim()).filter((u) => /^https:\/\/[^\s]+$/.test(u) && u.length <= 300).slice(0, 5);
  return {
    sport: sport.key,
    primary_position: positions[0] ?? null,
    secondary_positions: positions.slice(1),
    systems: cleanSystems(sport, raw.systems),
    skills: cleanSkills(sport, raw.skills),
    measurables: cleanMeasurables(sport, raw.measurables),
    attributes, marks, film_links,
    intended_major: str(raw.intended_major, 80) || null,
  };
}

export function cleanEvaluation(sport: Sport, raw: Record<string, unknown>) {
  const played = cleanPositions(sport, [raw.primary_position, ...list(raw.positions_played)], 4);
  return {
    team_name: str(raw.team_name, 120) || null,
    team_level: str(raw.team_level, 80) || null,
    primary_position: played[0] ?? null,
    positions_played: played.slice(1),
    systems_played: cleanSystems(sport, raw.systems_played),
    team_systems: cleanSystems(sport, raw.team_systems),
    skills: cleanSkills(sport, raw.skills),
    measurables: cleanMeasurables(sport, raw.measurables),
    notes: str(raw.notes, 600) || null,
  };
}
