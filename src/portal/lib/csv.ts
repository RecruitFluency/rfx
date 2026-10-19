// CSV/XLSX prospect import: read the file, guess which column is which,
// normalize values the same way the database does, and flag problems before
// anything is sent to portal_import_prospects (which re-validates).
import * as XLSX from 'xlsx';

export type ImportField =
  | 'first_name' | 'last_name' | 'preferred_name' | 'mobile' | 'email' | 'grad_year' | 'dob' | 'positions'
  | 'high_school' | 'club_team' | 'club_level' | 'city' | 'state' | 'film_links' | 'gpa'
  | 'guardian_name' | 'guardian_mobile' | 'guardian_email' | 'guardian_relationship'
  | 'club_contact_name' | 'club_contact_role' | 'club_contact_mobile' | 'club_contact_email'
  | 'priority' | 'tags' | 'notes' | 'full_name';

export const FIELD_LABELS: Record<ImportField, string> = {
  first_name: 'First name', last_name: 'Last name', full_name: 'Full name (split)', preferred_name: 'Preferred name',
  mobile: 'Mobile', email: 'Email', grad_year: 'Grad year', dob: 'Date of birth', positions: 'Position(s)',
  high_school: 'High school', club_team: 'Club team', club_level: 'Club level / league', city: 'City', state: 'State',
  film_links: 'Film link(s)', gpa: 'GPA', guardian_name: 'Parent/guardian name', guardian_mobile: 'Parent/guardian mobile',
  guardian_email: 'Parent/guardian email', guardian_relationship: 'Guardian relationship',
  club_contact_name: 'Club coach/director name', club_contact_role: 'Club contact role',
  club_contact_mobile: 'Club contact mobile', club_contact_email: 'Club contact email',
  priority: 'Priority (A/B/C)', tags: 'Tags', notes: 'Notes',
};

// Header aliases, matched after lower-casing and stripping punctuation.
const ALIASES: [ImportField, string[]][] = [
  ['guardian_mobile', ['parentphone', 'parentmobile', 'parentcell', 'guardianphone', 'guardianmobile', 'guardiancell', 'momphone', 'dadphone']],
  ['guardian_email', ['parentemail', 'guardianemail', 'momemail', 'dademail']],
  ['guardian_name', ['parentname', 'guardianname', 'parent', 'guardian', 'parentguardian']],
  ['guardian_relationship', ['relationship', 'guardianrelationship']],
  ['club_contact_mobile', ['clubcoachphone', 'clubcoachmobile', 'clubcoachcell', 'clubdirectorphone', 'clubdirectormobile', 'directorphone', 'coachphone', 'clubcontactphone', 'clubcontactmobile']],
  ['club_contact_email', ['clubcoachemail', 'clubdirectoremail', 'directoremail', 'coachemail', 'clubcontactemail']],
  ['club_contact_name', ['clubcoach', 'clubcoachname', 'clubdirector', 'clubdirectorname', 'director', 'clubcontact', 'clubcontactname']],
  ['club_contact_role', ['clubcontactrole', 'clubrole']],
  ['first_name', ['firstname', 'first', 'fname', 'givenname']],
  ['last_name', ['lastname', 'last', 'lname', 'surname', 'familyname']],
  ['full_name', ['name', 'fullname', 'athlete', 'athletename', 'player', 'playername', 'prospect']],
  ['preferred_name', ['preferredname', 'nickname', 'goesby']],
  ['mobile', ['mobile', 'cell', 'cellphone', 'phone', 'phonenumber', 'mobilephone', 'athletephone', 'playerphone']],
  ['email', ['email', 'emailaddress', 'athleteemail', 'playeremail']],
  ['grad_year', ['gradyear', 'graduationyear', 'class', 'classof', 'hsgradyear', 'year']],
  ['dob', ['dob', 'dateofbirth', 'birthdate', 'birthday']],
  ['positions', ['position', 'positions', 'pos', 'primaryposition']],
  ['high_school', ['highschool', 'school', 'hs']],
  ['club_team', ['club', 'clubteam', 'team', 'clubname']],
  ['club_level', ['level', 'league', 'clublevel', 'clubleague']],
  ['city', ['city', 'hometown', 'town']],
  ['state', ['state', 'st', 'province']],
  ['film_links', ['film', 'filmlink', 'video', 'highlights', 'highlightvideo', 'hudl', 'filmlinks']],
  ['gpa', ['gpa', 'unweightedgpa', 'cumulativegpa']],
  ['priority', ['priority', 'tier', 'rank']],
  ['tags', ['tags', 'tag', 'labels']],
  ['notes', ['notes', 'note', 'comments', 'comment']],
];

const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Best-guess field for each header; null when unrecognized. Each field is used once. */
export function guessMapping(headers: string[]): (ImportField | null)[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const k = key(h);
    for (const [field, aliases] of ALIASES) {
      if (!used.has(field) && aliases.includes(k)) {
        used.add(field);
        return field;
      }
    }
    return null;
  });
}

/** Mirrors portal_normalize_phone(): US-first E.164, null when unsure. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15 && digits[0] !== '0' ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return null;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null;
}

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export async function readSheet(file: File): Promise<ParsedSheet> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  const [headers = [], ...rows] = data.map((r) => r.map((c) => String(c ?? '').trim()));
  return { headers, rows: rows.filter((r) => r.some((c) => c !== '')) };
}

export interface MappedRow {
  index: number;
  values: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

const LIST_FIELDS: ImportField[] = ['positions', 'film_links', 'tags'];

/** Applies a column mapping and validates each row client-side. */
export function mapRows(sheet: ParsedSheet, mapping: (ImportField | null)[]): MappedRow[] {
  const thisYear = new Date().getFullYear();
  return sheet.rows.map((row, i) => {
    const values: Record<string, unknown> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    mapping.forEach((field, col) => {
      if (!field) return;
      const raw = (row[col] ?? '').trim();
      if (!raw) return;
      if (field === 'full_name') {
        const parts = raw.split(/\s+/);
        values.first_name ??= parts[0];
        values.last_name ??= parts.slice(1).join(' ');
      } else if (LIST_FIELDS.includes(field)) {
        values[field] = raw.split(/[;,|/]/).map((s) => s.trim()).filter(Boolean);
      } else {
        values[field] = raw;
      }
    });

    if (!values.first_name || !values.last_name) errors.push('Missing first or last name');
    for (const f of ['mobile', 'guardian_mobile', 'club_contact_mobile'] as const) {
      if (values[f]) {
        const n = normalizePhone(String(values[f]));
        if (!n) errors.push(`${FIELD_LABELS[f]} "${values[f]}" isn't a valid phone number`);
        else values[f] = n;
      }
    }
    for (const f of ['email', 'guardian_email', 'club_contact_email'] as const) {
      if (values[f]) {
        const n = normalizeEmail(String(values[f]));
        if (!n) errors.push(`${FIELD_LABELS[f]} "${values[f]}" isn't a valid email`);
        else values[f] = n;
      }
    }
    if (!values.mobile && !values.email) errors.push('Needs a mobile number or email');
    if (values.grad_year) {
      const y = Number(String(values.grad_year).replace(/\D/g, '').slice(-4));
      if (!y || y < 2000 || y > 2100) errors.push(`Grad year "${values.grad_year}" isn't a year`);
      else values.grad_year = y;
    }
    if (values.dob) {
      const d = new Date(String(values.dob));
      if (Number.isNaN(d.getTime())) errors.push(`Date of birth "${values.dob}" isn't a date`);
      else values.dob = d.toISOString().slice(0, 10);
    }
    if (values.gpa && Number.isNaN(Number(values.gpa))) {
      warnings.push(`GPA "${values.gpa}" ignored`);
      delete values.gpa;
    }
    if (values.priority && !['A', 'B', 'C'].includes(String(values.priority).toUpperCase())) {
      warnings.push(`Priority "${values.priority}" set to B`);
      values.priority = 'B';
    }
    const minor = values.dob
      ? new Date(String(values.dob)) > new Date(thisYear - 18, new Date().getMonth(), new Date().getDate())
      : !values.grad_year || Number(values.grad_year) >= thisYear;
    if (minor && !values.guardian_mobile && !values.guardian_email) {
      warnings.push('Likely a minor with no parent/guardian contact; invites will be blocked until one is added');
    }
    return { index: i + 1, values, errors, warnings };
  });
}

export const CSV_TEMPLATE_HEADERS = [
  'First Name', 'Last Name', 'Mobile', 'Email', 'Grad Year', 'Position', 'High School', 'Club Team', 'State',
  'Film Link', 'Parent Name', 'Parent Phone', 'Parent Email', 'Club Director', 'Club Director Phone',
  'Club Director Email', 'Priority', 'Notes',
];
