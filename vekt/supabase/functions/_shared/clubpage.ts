// What a club's public page shows. Counts for everyone; names only for families who
// opted in (first name and last initial). Founding VEKT teams are teams with at least
// FOUNDING_TEAM families who said yes to the club. Pure function; callers do the lookups.
export const FOUNDING_TEAM = 3;

export interface PageRow { full_name: string; team: string | null; grad_year: number | null; status: string; committed_program: string | null; committed_division: string | null; family_approved_at: string | null; placement_public: boolean }

export const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
};

export function clubPageData(club: { name: string; state: string | null; sports: string[] }, rows: PageRow[]) {
  const committed = rows.filter((r) => r.status === "committed" && r.committed_program);
  const tally = (key: (r: PageRow) => string) => {
    const m: Record<string, number> = {};
    for (const r of committed) m[key(r)] = (m[key(r)] ?? 0) + 1;
    return m;
  };
  const teams = new Map<string, number>();
  for (const r of rows) if (r.family_approved_at && r.team) teams.set(r.team, (teams.get(r.team) ?? 0) + 1);
  return {
    club: { name: club.name, state: club.state, sports: club.sports },
    on_vekt: rows.filter((r) => r.family_approved_at).length,
    committed: committed.length,
    by_level: tally((r) => r.committed_division || "Other"),
    by_year: tally((r) => String(r.grad_year ?? "Other")),
    named: committed.filter((r) => r.placement_public && r.family_approved_at)
      .sort((a, b) => (b.grad_year ?? 0) - (a.grad_year ?? 0) || a.full_name.localeCompare(b.full_name))
      .map((r) => ({ name: shortName(r.full_name), grad_year: r.grad_year, program: r.committed_program, level: r.committed_division })),
    founding_teams: [...teams].filter(([, n]) => n >= FOUNDING_TEAM).map(([team]) => team).sort(),
  };
}
