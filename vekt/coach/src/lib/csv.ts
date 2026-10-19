// CSV/XLSX recruit import: read the file, guess which column is which, and flag
// problems before anything is sent. vekt-coach re-validates every row.
import * as XLSX from "xlsx";

export type ImportField =
  | "recruit_name" | "first_name" | "last_name" | "position" | "grad_year" | "club_or_school" | "club_level" | "state" | "gpa"
  | "athlete_email" | "athlete_phone" | "parent_name" | "parent_email" | "parent_phone"
  | "club_coach_name" | "club_coach_email" | "club_coach_phone" | "priority" | "notes";

export const FIELD_LABELS: Record<ImportField, string> = {
  recruit_name: "Full name", first_name: "First name", last_name: "Last name", position: "Position", grad_year: "Grad year",
  club_or_school: "Club team", club_level: "Club level", state: "State", gpa: "GPA",
  athlete_email: "Athlete email", athlete_phone: "Athlete mobile", parent_name: "Parent name", parent_email: "Parent email", parent_phone: "Parent mobile",
  club_coach_name: "Club director", club_coach_email: "Club director email", club_coach_phone: "Club director mobile", priority: "Priority", notes: "Notes",
};

// Header aliases, matched after lower-casing and stripping punctuation. Most specific first.
const ALIASES: [ImportField, string[]][] = [
  ["parent_phone", ["parentphone", "parentmobile", "parentcell", "guardianphone", "guardianmobile", "guardiancell"]],
  ["parent_email", ["parentemail", "guardianemail"]],
  ["parent_name", ["parentname", "guardianname", "parent", "guardian", "parentguardian"]],
  ["club_coach_phone", ["clubcoachphone", "clubcoachmobile", "clubdirectorphone", "clubdirectormobile", "directorphone", "coachphone"]],
  ["club_coach_email", ["clubcoachemail", "clubdirectoremail", "directoremail", "coachemail"]],
  ["club_coach_name", ["clubcoach", "clubcoachname", "clubdirector", "clubdirectorname", "director", "coach"]],
  ["first_name", ["firstname", "first", "fname"]],
  ["last_name", ["lastname", "last", "lname", "surname"]],
  ["recruit_name", ["name", "fullname", "athlete", "athletename", "player", "playername", "recruit", "recruitname"]],
  ["athlete_phone", ["mobile", "cell", "phone", "phonenumber", "athletephone", "athletemobile", "playerphone"]],
  ["athlete_email", ["email", "emailaddress", "athleteemail", "playeremail"]],
  ["grad_year", ["gradyear", "graduationyear", "class", "classof", "year"]],
  ["position", ["position", "positions", "pos", "primaryposition"]],
  ["club_or_school", ["club", "clubteam", "team", "clubname", "school", "highschool"]],
  ["club_level", ["level", "league", "clublevel"]],
  ["state", ["state", "st"]],
  ["gpa", ["gpa"]],
  ["priority", ["priority", "tier"]],
  ["notes", ["notes", "note", "comments"]],
];
const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export function guessMapping(headers: string[]): (ImportField | null)[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const k = key(h);
    for (const [field, aliases] of ALIASES) if (!used.has(field) && aliases.includes(k)) { used.add(field); return field; }
    return null;
  });
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  return null;
}
export const normalizeEmail = (raw: string) => { const v = raw.trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null; };

export interface Sheet { headers: string[]; rows: string[][] }
export async function readSheet(file: File): Promise<Sheet> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
  const data = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: false, blankrows: false });
  const [headers = [], ...rows] = data.map((r) => r.map((c) => String(c ?? "").trim()));
  return { headers, rows: rows.filter((r) => r.some(Boolean)) };
}

export interface MappedRow { index: number; values: Record<string, string | number>; errors: string[]; warnings: string[] }

export function mapRows(sheet: Sheet, mapping: (ImportField | null)[]): MappedRow[] {
  return sheet.rows.map((row, i) => {
    const v: Record<string, string | number> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    mapping.forEach((f, col) => { const raw = (row[col] ?? "").trim(); if (f && raw) v[f] = raw; });
    if (!v.recruit_name && (v.first_name || v.last_name)) v.recruit_name = `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim();
    delete v.first_name; delete v.last_name;
    if (!v.recruit_name) errors.push("Missing name");
    for (const f of ["athlete_phone", "parent_phone", "club_coach_phone"] as const) {
      if (v[f]) { const n = normalizePhone(String(v[f])); if (n) v[f] = n; else { warnings.push(`${FIELD_LABELS[f]} "${v[f]}" isn't a phone number; skipped`); delete v[f]; } }
    }
    for (const f of ["athlete_email", "parent_email", "club_coach_email"] as const) {
      if (v[f]) { const n = normalizeEmail(String(v[f])); if (n) v[f] = n; else { warnings.push(`${FIELD_LABELS[f]} "${v[f]}" isn't an email; skipped`); delete v[f]; } }
    }
    if (v.grad_year) { const y = Number(String(v.grad_year).replace(/\D/g, "").slice(-4)); if (y >= 2024 && y <= 2040) v.grad_year = y; else { warnings.push(`Grad year "${v.grad_year}" skipped`); delete v.grad_year; } }
    if (v.gpa && Number.isNaN(Number(v.gpa))) { warnings.push(`GPA "${v.gpa}" skipped`); delete v.gpa; }
    if (v.state && !/^[A-Za-z]{2}$/.test(String(v.state))) { warnings.push(`State "${v.state}" should be two letters; skipped`); delete v.state; }
    if (!v.parent_email && !v.parent_phone) warnings.push("No parent contact: can't invite until one is added");
    if (!v.club_coach_email && !v.club_coach_phone) warnings.push("No club director contact: self-awareness will stay Pending");
    return { index: i + 1, values: v, errors, warnings };
  });
}

export const TEMPLATE = ["Name", "Position", "Grad Year", "Club", "Club Level", "State", "GPA", "Email", "Mobile", "Parent Name", "Parent Email", "Parent Phone", "Club Director", "Club Director Email", "Club Director Phone", "Priority", "Notes"];
