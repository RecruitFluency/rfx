import { describe, expect, it } from "vitest";
import { isTeammate, normClub, teamStatus, teamSuggestions, type TeamMember } from "./team";
import { sportFor } from "./sports";

const soccer = sportFor("soccer")!;
const m = (id: string, over: Partial<TeamMember> = {}): TeamMember => ({ id, sport: "soccer", team_gender: "men", grad_year: 2028, club: "Lakeshore FC", parent_approved_at: "2026-10-01", profile: {}, ...over });

describe("team unlock", () => {
  it("treats spelling variants of a club as one club", () => {
    expect(normClub("Lakeshore F.C. ")).toBe(normClub("lakeshore fc"));
    expect(normClub("The Metro Club")).toBe("metro");
  });
  it("matches teammates by sport, club, side and grad year within one", () => {
    expect(isTeammate(m("a"), m("b", { grad_year: 2029 }))).toBe(true);
    expect(isTeammate(m("a"), m("b", { grad_year: 2030 }))).toBe(false);
    expect(isTeammate(m("a"), m("b", { team_gender: "women" }))).toBe(false);
    expect(isTeammate(m("a"), m("b", { sport: "basketball" }))).toBe(false);
    expect(isTeammate(m("a"), m("b", { club: "Metro United" }))).toBe(false);
    expect(isTeammate(m("a"), m("a"))).toBe(false);
  });
  it("suggests only options at least two teammates picked", () => {
    const s = teamSuggestions(soccer, [
      m("b", { profile: { systems: { formation: ["4-3-3", "3-5-2"], style: ["High press"] } } }),
      m("c", { profile: { systems: { formation: ["4-3-3"], style: ["Not a real option"] } } }),
    ]);
    expect(s).toEqual({ formation: ["4-3-3"] });
  });
  it("unlocks at three approved profiles, the athlete included", () => {
    const me = m("a");
    expect(teamStatus(soccer, me, [m("b")])!.unlocked).toBe(false);
    const st = teamStatus(soccer, me, [m("b"), m("c"), m("d", { parent_approved_at: null })])!;
    expect(st.size).toBe(3);
    expect(st.unlocked).toBe(true);
  });
  it("stays locked until the athlete's own profile is approved, and needs a club and class", () => {
    expect(teamStatus(soccer, m("a", { parent_approved_at: null }), [m("b"), m("c")])!.unlocked).toBe(false);
    expect(teamStatus(soccer, m("a", { club: null }), [m("b"), m("c")])).toBeNull();
  });
});
