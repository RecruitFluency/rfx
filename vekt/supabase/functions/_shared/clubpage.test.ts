import { describe, expect, it } from "vitest";
import { clubPageData, shortName, type PageRow } from "./clubpage";

const r = (o: Partial<PageRow>): PageRow => ({ full_name: "Sam Lee", team: "U17", grad_year: 2027, status: "active", committed_program: null, committed_division: null, family_approved_at: "2026-10-01", placement_public: false, ...o });

describe("club public page", () => {
  it("shortens names to first name and last initial", () => {
    expect(shortName("Ryan  Cole")).toBe("Ryan C.");
    expect(shortName("Ana María de la Cruz")).toBe("Ana C.");
    expect(shortName("Pele")).toBe("Pele");
  });
  it("names only families who opted in and said yes to the club; counts everyone", () => {
    const d = clubPageData({ name: "X", state: null, sports: [] }, [
      r({ full_name: "Ryan Cole", status: "committed", committed_program: "Harbor Point College", committed_division: "D3", placement_public: true }),
      r({ full_name: "Diego Santos", status: "committed", committed_program: "Eastlake University", committed_division: "D2" }),
      r({ full_name: "Off Vekt", status: "committed", committed_program: "Somewhere", committed_division: "D3", placement_public: true, family_approved_at: null }),
    ]);
    expect(d.committed).toBe(3);
    expect(d.by_level).toEqual({ D3: 2, D2: 1 });
    expect(d.named).toEqual([{ name: "Ryan C.", grad_year: 2027, program: "Harbor Point College", level: "D3" }]);
    expect(JSON.stringify(d)).not.toContain("Santos");
  });
  it("lists teams with three or more families on VEKT as founding teams", () => {
    const d = clubPageData({ name: "X", state: null, sports: [] }, [r({}), r({}), r({}), r({ team: "U15" }), r({ team: "U15", family_approved_at: null })]);
    expect(d.founding_teams).toEqual(["U17"]);
    expect(d.on_vekt).toBe(4);
  });
});
