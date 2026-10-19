import { describe, expect, it } from "vitest";
import { guessMapping, mapRows, normalizePhone } from "./csv";

describe("csv import", () => {
  it("guesses common headers, most specific first", () => {
    expect(guessMapping(["Name", "Parent Phone", "Phone", "Club Director Email", "Class of"])).toEqual(["recruit_name", "parent_phone", "athlete_phone", "club_coach_email", "grad_year"]);
  });
  it("normalizes US numbers and flags bad values without dropping the row", () => {
    expect(normalizePhone("(202) 555-0101")).toBe("+12025550101");
    const [row] = mapRows({ headers: [], rows: [["Jordan", "Ellis", "nope", "2028", "Ohio"]] }, ["first_name", "last_name", "parent_email", "grad_year", "state"]);
    expect(row.values).toMatchObject({ recruit_name: "Jordan Ellis", grad_year: 2028 });
    expect(row.errors).toEqual([]);
    expect(row.warnings.join(" ")).toMatch(/isn't an email.*State/);
  });
  it("requires a name", () => {
    expect(mapRows({ headers: [], rows: [["x@example.com"]] }, ["athlete_email"])[0].errors).toEqual(["Missing name"]);
  });
});
