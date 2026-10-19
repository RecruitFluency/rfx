import { describe, expect, it } from "vitest";
import { forPositions, groupOf, sportFor, SPORTS } from "./sports.ts";
import { measurablesTable, skillsRead, systemsFit } from "./profile.ts";

describe("sport catalog", () => {
  it("has unique keys within each sport", () => {
    for (const s of SPORTS) {
      const keys = (xs: { key: string }[]) => new Set(xs.map((x) => x.key)).size === xs.length;
      expect(keys(s.positions), `${s.key} positions`).toBe(true);
      expect(keys(s.skills.flatMap((x) => x.skills)), `${s.key} skills`).toBe(true);
      expect(keys(s.measurables), `${s.key} measurables`).toBe(true);
      expect(keys(s.systems), `${s.key} systems`).toBe(true);
      const groups = new Set(s.positions.map((p) => p.group));
      for (const g of [...s.skills.flatMap((x) => x.groups ?? []), ...s.measurables.flatMap((x) => x.groups ?? []), ...s.attributes.flatMap((x) => x.groups ?? [])]) {
        expect(groups.has(g), `${s.key} group ${g}`).toBe(true);
      }
    }
  });
  it("finds sports from free text", () => {
    expect(sportFor("Soccer")?.key).toBe("soccer");
    expect(sportFor("Track & Field")?.key).toBe("track_field");
    expect(sportFor("hockey")?.key).toBe("ice_hockey");
    expect(sportFor("Swimming")?.key).toBe("swimming_diving");
    expect(sportFor("curling")).toBeNull();
  });
  it("narrows skills to the position", () => {
    const baseball = sportFor("baseball")!;
    expect(groupOf(baseball, "Catcher")).toBe("c");
    const pitcher = forPositions(baseball, ["Left-handed pitcher"]);
    expect(pitcher.skills.map((s) => s.label)).toEqual(["Pitching"]);
    expect(pitcher.measurables.map((m) => m.key)).toContain("fb_velo");
    expect(pitcher.measurables.map((m) => m.key)).not.toContain("pop_time");
  });
});

describe("hard-skills read", () => {
  const soccer = sportFor("soccer")!;
  it("compares the athlete's and director's levels", () => {
    const r = skillsRead(soccer, { primary_position: "Center back", skills: { first_touch: "strength", weak_foot: "solid", finishing: "developing" } },
      { skills: { first_touch: "strength", weak_foot: "developing", finishing: "solid", aerial_duels: "strength" } });
    expect(r).toMatchObject({ compared: 3, same: 1, athlete_higher: 1, director_higher: 1 });
    expect(r.rows.find((x) => x.key === "aerial_duels")?.verdict).toBe("director_only");
    expect(r.summary).toBe("Same read on 1 of 3 skills. Rates themselves higher on 1. Their director rates them higher on 1.");
  });
  it("checks systems against what the program runs", () => {
    const rows = systemsFit(soccer, { formation: ["4-3-3", "3-5-2"], style: ["High press"] },
      { systems: { formation: ["4-3-3"], style: ["Low block"] } }, { team_systems: { formation: ["4-3-3"] } });
    expect(rows.map((r) => r.verdict)).toEqual(["plays_yours", "new_to_them"]);
  });
  it("confirms measurables when the director's number matches", () => {
    const rows = measurablesTable(soccer, { measurables: { height: "73", sprint_30m: "4.10" } }, { measurables: { height: "73", sprint_30m: "4.40" } });
    expect(rows.map((r) => r.status)).toEqual(["confirmed", "differs"]);
  });
});

describe("cleaning profiles", () => {
  it("keeps only catalog values", async () => {
    const { cleanProfile } = await import("./profile.ts");
    const soccer = sportFor("soccer")!;
    const p = cleanProfile(soccer, {
      primary_position: "Center back", secondary_positions: ["Quarterback", "Fullback"],
      systems: { formation: ["4-3-3", "9-9-9"], made_up: ["x"] }, skills: { first_touch: "strength", weak_foot: 9, fake: "solid" },
      measurables: { height: 73, sprint_30m: "4.1 s<script>", nope: "1" }, attributes: { foot: "Left" },
      film_links: ["https://hudl.com/v/1", "javascript:alert(1)"], marks: [{ event: "100m", mark: "11.2" }],
    });
    expect(p).toMatchObject({
      primary_position: "Center back", secondary_positions: ["Fullback"], systems: { formation: ["4-3-3"] },
      skills: { first_touch: "strength" }, measurables: { height: "73", sprint_30m: "4.1" }, attributes: { foot: "Left" },
      film_links: ["https://hudl.com/v/1"], marks: [],
    });
  });
});
