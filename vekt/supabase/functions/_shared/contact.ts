// When NCAA electronic contact opens for a recruit, from the contact_rules rows.
// Pure (no Deno globals) so the coach API and tests share it.

export interface ContactRule { division: string; sport: string; gender: string; rule_kind: string; month: number | null; day: number | null; year_offset: number | null; rule_text: string }

export function normDivision(d: string | null | undefined) {
  const x = (d || "").toUpperCase().replace(/\s|DIVISION|-/g, "");
  if (["D1", "DI", "1", "I"].includes(x)) return "D1";
  if (["D2", "DII", "2", "II"].includes(x)) return "D2";
  if (["D3", "DIII", "3", "III"].includes(x)) return "D3";
  if (x.includes("NAIA")) return "NAIA";
  if (x.includes("NJCAA") || x.includes("JUCO")) return "NJCAA";
  return "";
}

function laborDayWednesday(year: number) {
  const d = new Date(Date.UTC(year, 8, 1));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCDate(d.getUTCDate() + 2);
  return d;
}

/** {open, date, text}: open now, or the date it opens; null date when unknown. */
export function contactOpens(rules: ContactRule[], division: string | null, sport: string | null, gender: string | null, gradYear: number | null, today = new Date()) {
  const div = normDivision(division);
  const sp = (sport || "").toLowerCase().replace(/_/g, " ");
  const g = (gender || "").startsWith("w") ? "women" : (gender || "").startsWith("m") ? "men" : "any";
  const mine = rules.filter((r) => r.division === div);
  const pick = mine.find((r) => r.sport === sp && r.gender === g) ?? mine.find((r) => r.sport === sp && r.gender === "any") ?? mine.find((r) => r.sport === "*");
  if (!pick) return { open: false, date: null as string | null, text: "Check with your compliance office." };
  if (pick.rule_kind === "anytime") return { open: true, date: null, text: pick.rule_text };
  if (!gradYear) return { open: false, date: null, text: `Grad year needed. ${pick.rule_text}.` };
  const y = gradYear + (pick.year_offset ?? 0);
  const d = pick.rule_kind === "wed_after_labor_day" ? laborDayWednesday(y) : new Date(Date.UTC(y, (pick.month ?? 1) - 1, pick.day ?? 1));
  const iso = d.toISOString().slice(0, 10);
  return { open: today.toISOString().slice(0, 10) >= iso, date: iso, text: pick.rule_text };
}
