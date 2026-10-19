// Team unlock: once enough teammates are on VEKT, each one's profile can fill in
// the systems their team plays from what the others said. Only aggregates are
// returned (an option shows only when at least MIN_AGREE teammates picked it), never
// who picked what. Pure functions; vekt-invites does the lookups.
import type { Sport } from "./sports.ts";

export const TEAM_UNLOCK_SIZE = 3;   // approved profiles on the team, including the athlete
export const MIN_AGREE = 2;          // teammates who must agree before an option is suggested

/** "Lakeshore F.C. " and "lakeshore fc" are the same club. */
export function normClub(club: string | null | undefined): string {
  return (club ?? "").toLowerCase().replace(/[.']/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\b(the|club)\b/g, " ").replace(/\s+/g, " ").trim();
}

export interface TeamMember { id: string; sport: string; team_gender: string | null; grad_year: number | null; club: string | null; parent_approved_at: string | null; profile?: { systems?: Record<string, string[]> } | null }

/** Same sport, same club, same boys'/girls' side, grad years within one of each other. */
export function isTeammate(a: TeamMember, b: TeamMember): boolean {
  if (a.id === b.id || a.sport !== b.sport) return false;
  const club = normClub(a.club);
  if (!club || club !== normClub(b.club)) return false;
  if (a.team_gender && b.team_gender && a.team_gender !== b.team_gender) return false;
  if (a.grad_year == null || b.grad_year == null) return false;
  return Math.abs(a.grad_year - b.grad_year) <= 1;
}

/** Options at least MIN_AGREE teammates picked, by system group, most picked first. */
export function teamSuggestions(sport: Sport, teammates: TeamMember[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const g of sport.systems) {
    const counts = new Map<string, number>();
    for (const t of teammates) for (const o of new Set(t.profile?.systems?.[g.key] ?? [])) if (g.options.includes(o)) counts.set(o, (counts.get(o) ?? 0) + 1);
    const picked = [...counts].filter(([, n]) => n >= MIN_AGREE).sort((x, y) => y[1] - x[1] || g.options.indexOf(x[0]) - g.options.indexOf(y[0])).map(([o]) => o);
    if (picked.length) out[g.key] = picked;
  }
  return out;
}

export interface TeamStatus { size: number; needed: number; unlocked: boolean; suggested: Record<string, string[]> }

/** Where the athlete's team stands. Suggestions only once the athlete's own profile is approved and the team is big enough. */
export function teamStatus(sport: Sport, me: TeamMember, others: TeamMember[]): TeamStatus | null {
  if (!normClub(me.club) || me.grad_year == null) return null;
  const mates = others.filter((o) => o.parent_approved_at && isTeammate(me, o));
  const size = mates.length + (me.parent_approved_at ? 1 : 0);
  const unlocked = !!me.parent_approved_at && size >= TEAM_UNLOCK_SIZE;
  return { size, needed: TEAM_UNLOCK_SIZE, unlocked, suggested: unlocked ? teamSuggestions(sport, mates) : {} };
}
