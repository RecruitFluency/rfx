import { describe, expect, it } from "vitest";
import { fillsNeed, rosterPlan, type RosterPlayer } from "./roster.ts";

const roster: RosterPlayer[] = [
  { name: "A", position: "Center back", final_season: 2026, status: "returning" },       // gone by 2027
  { name: "B", position: "Center back", final_season: 2028, status: "returning" },
  { name: "C", position: "Center back", final_season: 2029, status: "transfer_risk" },
  { name: "D", position: "Goalkeeper", final_season: 2027, status: "leaving" },
  { name: "E", position: "Goalkeeper", final_season: 2029, status: "returning", designated: true },
  { name: "F", position: "Striker", final_season: 2030, status: "returning" },
];

describe("rosterPlan", () => {
  it("counts who's left for a season and the open spots under the limit", () => {
    const plan = rosterPlan(roster, 5, { "Center back": 4, Goalkeeper: 2 }, 2027, []);
    expect(plan).toMatchObject({ returning: 3, designated: 1, leaving: 2, at_risk: 1, open_spots: 2, over_limit: false, position_gaps: 3 });
    expect(plan.positions.find((p) => p.position === "Center back")).toMatchObject({ returning: 2, gap: 2, at_risk: 1 });
    expect(plan.positions.find((p) => p.position === "Goalkeeper")).toMatchObject({ returning: 1, gap: 1 });
    expect(plan.positions.find((p) => p.position === "Striker")?.gap).toBeNull();
  });
  it("matches incoming recruits to gaps by position and class", () => {
    const board = [
      { id: "1", recruit_name: "R1", position: "Center back", grad_year: 2027, decision: "interested" },
      { id: "2", recruit_name: "R2", position: "Center back", grad_year: 2028, decision: null },
      { id: "3", recruit_name: "R3", position: "Center back", grad_year: 2027, decision: "not_a_fit" },
    ];
    const plan = rosterPlan(roster, null, { "Center back": 4 }, 2027, board);
    expect(plan.positions[0]).toMatchObject({ position: "Center back", recruits: 1, interested: 1, covered: false });
    expect(plan.open_spots).toBeNull();
    expect(fillsNeed(plan, board[0])).toBe(true);
    expect(fillsNeed(plan, board[1])).toBe(false);
  });
});
