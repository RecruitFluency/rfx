import * as XLSX from 'xlsx';
import { StagedRow } from './types';

type Field = keyof StagedRow;

// Vendor files never agree on column names; headers are normalized
// (lowercased, non-alphanumerics stripped) before matching this map.
const HEADER_MAP: Record<string, Field> = {
  id: 'master_id',
  coachid: 'master_id',
  masterid: 'master_id',
  uniqueid: 'master_id',
  vendorid: 'master_id',
  personid: 'master_id',
  recordid: 'master_id',

  first: 'first_name',
  firstname: 'first_name',
  fname: 'first_name',

  last: 'last_name',
  lastname: 'last_name',
  lname: 'last_name',
  surname: 'last_name',

  email: 'email',
  emailaddress: 'email',
  coachemail: 'email',

  phone: 'phone',
  phonenumber: 'phone',
  telephone: 'phone',
  cell: 'phone',

  school: 'school',
  schoolname: 'school',
  institution: 'school',
  college: 'school',
  university: 'school',

  sport: 'sport',
  sportname: 'sport',
  team: 'sport',

  title: 'title',
  position: 'title',
  role: 'title',
  jobtitle: 'title',
  coachtitle: 'title',

  division: 'division',
  div: 'division',
  ncaadivision: 'division',

  conference: 'conference',
  conf: 'conference',
  league: 'conference',

  state: 'state',
  st: 'state',
};

export interface ParsedFile {
  rows: StagedRow[];
  totalRows: number;
  mappedColumns: { header: string; field: Field }[];
  unmappedColumns: string[];
  missingIdCount: number;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Parses an .xlsx/.xls/.csv vendor file into normalized staging rows. */
export async function parseVendorFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The file has no sheets.');

  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (grid.length < 2) throw new Error('The file has no data rows.');

  const headers = grid[0].map((h) => cellToString(h) ?? '');
  const mappedColumns: { header: string; field: Field }[] = [];
  const unmappedColumns: string[] = [];
  const columnFields: (Field | null)[] = headers.map((h) => {
    const field = HEADER_MAP[normalizeHeader(h)] ?? null;
    if (h) {
      if (field && !mappedColumns.some((m) => m.field === field)) {
        mappedColumns.push({ header: h, field });
      } else if (!field) {
        unmappedColumns.push(h);
      }
    }
    return field;
  });

  if (!mappedColumns.some((m) => m.field === 'master_id')) {
    throw new Error(
      'No unique ID column found. The file needs a column like "Coach ID" or "Unique ID" — ' +
        `columns seen: ${headers.filter(Boolean).join(', ')}`
    );
  }

  const seenFields = new Set(mappedColumns.map((m) => m.field));
  const rows: StagedRow[] = [];
  let missingIdCount = 0;

  for (let i = 1; i < grid.length; i++) {
    const raw = grid[i];
    if (!raw || raw.every((c) => cellToString(c) === null)) continue;

    const row: StagedRow = {
      master_id: null, first_name: null, last_name: null, email: null, phone: null,
      school: null, sport: null, title: null, division: null, conference: null, state: null,
    };
    columnFields.forEach((field, col) => {
      if (field && row[field] === null) row[field] = cellToString(raw[col]);
    });

    // Support a single "Name" column when first/last aren't present.
    if (!seenFields.has('first_name') && !seenFields.has('last_name')) {
      const nameCol = headers.findIndex((h) => ['name', 'coachname', 'fullname'].includes(normalizeHeader(h)));
      if (nameCol >= 0) {
        const full = cellToString(raw[nameCol]);
        if (full) {
          const parts = full.split(/\s+/);
          row.first_name = parts[0];
          row.last_name = parts.slice(1).join(' ') || null;
        }
      }
    }

    if (!row.master_id) missingIdCount++;
    rows.push(row);
  }

  return { rows, totalRows: rows.length, mappedColumns, unmappedColumns, missingIdCount };
}
