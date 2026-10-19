// Roster planning: who's still here in a given season, open spots under the
// limit, gaps by position against the staff's targets, and which recruits on the
// board fill them. Pure TypeScript, shared by the API and the app.

export interface RosterPlayer { id?: string; name: string; position: string | null; final_season: number; status: "returning" | "leaving" | "transfer_risk" | "undecided"; designated?: boolean; aid_dollars?: number | null }
export interface BoardRecruit { id: string; recruit_name: string; position: string | null; grad_year: number | null; decision: string | null }

/** D1 roster limits for schools that opted in to the House settlement (from July 1, 2025). Sourced; others are left to the school. */
export const D1_HOUSE_LIMITS: Record<string, number> = { football: 105, baseball: 34, basketball: 15, soccer: 28, softball: 25 };
export const LIMITS_SOURCE = "NCAA DI Board of Directors, roster limits adopted June 2025 (schools that opted in to the House settlement).";

const norm = (s: string | null | undefined) => (s || "").toLowerCase().replace(/[^a-z]/g, "");

export function rosterPlan(roster: RosterPlayer[], limit: number | null, targets: Record<string, number>, season: number, board: BoardRecruit[]) {
  const here = roster.filter((p) => p.final_season >= season && p.status !== "leaving");
  const counted = here.filter((p) => !p.designated);
  const leaving = roster.filter((p) => !(p.final_season >= season && p.status !== "leaving"));
  const positions = [...new Set([...Object.keys(targets), ...roster.map((p) => p.position).filter((x): x is string => !!x)])];
  const rows = positions.map((pos) => {
    const ret = here.filter((p) => norm(p.position) === norm(pos));
    const risk = ret.filter((p) => p.status === "transfer_risk" || p.status === "undecided").length;
    const target = targets[pos] ?? null;
    const gap = target == null ? null : Math.max(0, target - ret.length);
    const recruits = board.filter((r) => norm(r.position) === norm(pos) && r.grad_year === season && r.decision !== "not_a_fit");
    return {
      position: pos, target, returning: ret.length, at_risk: risk, gap,
      recruits: recruits.length, interested: recruits.filter((r) => r.decision === "interested").length,
      covered: gap == null ? null : recruits.filter((r) => r.decision === "interested").length >= gap,
    };
  }).sort((a, b) => (b.gap ?? -1) - (a.gap ?? -1) || a.position.localeCompare(b.position));
  const totalGap = rows.reduce((t, r) => t + (r.gap ?? 0), 0);
  return {
    season,
    limit,
    returning: counted.length,
    designated: here.length - counted.length,
    leaving: leaving.length,
    at_risk: here.filter((p) => p.status === "transfer_risk" || p.status === "undecided").length,
    open_spots: limit == null ? null : Math.max(0, limit - counted.length),
    over_limit: limit != null && counted.length > limit,
    position_gaps: totalGap,
    positions: rows,
    aid_leaving: leaving.reduce((t, p) => t + (p.aid_dollars ?? 0), 0),
  };
}

/** Does this recruit fill an open need in the plan's season? */
export function fillsNeed(plan: ReturnType<typeof rosterPlan>, r: { position: string | null; grad_year: number | null }) {
  if (r.grad_year !== plan.season) return false;
  return plan.positions.some((p) => norm(p.position) === norm(r.position) && (p.gap ?? 0) > 0);
}
