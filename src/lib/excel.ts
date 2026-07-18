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
  sportcode: 'sport',
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
  /** Sheets that contributed rows (multi-sheet vendor workbooks). */
  sheetsParsed: string[];
  /** Rows the vendor themselves marked as removed — skipped on import. */
  removedCount: number;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Finds the real header row: vendor workbooks often have banner/legal text
 * above the table. Looks for the first row (within the top 25) that maps at
 * least three known columns, including a name or unique-ID column.
 */
function findHeaderRow(grid: unknown[][]): number {
  for (let i = 0; i < Math.min(grid.length, 25); i++) {
    const cells = (grid[i] ?? []).map((c) => normalizeHeader(cellToString(c) ?? ''));
    const mapped = cells.filter((c) => c && HEADER_MAP[c]);
    const hasAnchor = cells.some((c) => HEADER_MAP[c] === 'first_name' || HEADER_MAP[c] === 'master_id');
    if (mapped.length >= 3 && hasAnchor) return i;
  }
  return -1;
}

/**
 * Parses an .xlsx/.xls/.csv vendor file into normalized staging rows.
 * Handles multi-sheet workbooks (e.g. one sheet per division): every sheet
 * with a recognizable coach table contributes rows; tutorial/info sheets are
 * skipped automatically. Rows the vendor marks in a "Removed" column are
 * excluded, and duplicate unique IDs keep their first occurrence.
 */
export async function parseVendorFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const rows: StagedRow[] = [];
  const mappedColumns: { header: string; field: Field }[] = [];
  const unmappedColumns: string[] = [];
  const sheetsParsed: string[] = [];
  const seenIds = new Set<string>();
  let missingIdCount = 0;
  let removedCount = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headerRow = findHeaderRow(grid);
    if (headerRow < 0) continue; // not a coach table (tutorial/info sheet)

    const headers = grid[headerRow].map((h) => cellToString(h) ?? '');
    const removedCol = headers.findIndex((h) => normalizeHeader(h).startsWith('removed'));
    const columnFields: (Field | null)[] = headers.map((h) => {
      const field = HEADER_MAP[normalizeHeader(h)] ?? null;
      if (h) {
        if (field && !mappedColumns.some((m) => m.field === field)) {
          mappedColumns.push({ header: h, field });
        } else if (!field && !unmappedColumns.includes(h)) {
          unmappedColumns.push(h);
        }
      }
      return field;
    });
    const seenFields = new Set(
      columnFields.filter((f): f is Field => f !== null)
    );
    sheetsParsed.push(sheetName);

    for (let i = headerRow + 1; i < grid.length; i++) {
      const raw = grid[i];
      if (!raw || raw.every((c) => cellToString(c) === null)) continue;

      if (removedCol >= 0 && cellToString(raw[removedCol])) {
        removedCount++;
        continue;
      }

      const row: StagedRow = {
        master_id: null, first_name: null, last_name: null, email: null, phone: null,
        school: null, sport: null, title: null, division: null, conference: null, state: null,
      };
      columnFields.forEach((field, col) => {
        if (field && row[field] === null) {
          const v = cellToString(raw[col]);
          row[field] = v === '-' ? null : v;
        }
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

      // Skip rows that carry no person at all (stray banner/legal lines).
      if (!row.master_id && !row.first_name && !row.last_name) continue;

      if (row.master_id) {
        if (seenIds.has(row.master_id)) continue;
        seenIds.add(row.master_id);
      } else {
        missingIdCount++;
      }
      if (row.email) row.email = row.email.toLowerCase();
      rows.push(row);
    }
  }

  if (sheetsParsed.length === 0) {
    throw new Error(
      'No coach table found in this file. The engine looks for a header row with columns like ' +
        '"First name", "Last name", "Unique ID", "Email address" on any sheet.'
    );
  }
  if (!mappedColumns.some((m) => m.field === 'master_id')) {
    throw new Error(
      'No unique ID column found. The file needs a column like "Coach ID" or "Unique ID" — ' +
        `columns seen: ${mappedColumns.map((m) => m.header).concat(unmappedColumns).join(', ')}`
    );
  }
  if (rows.length === 0) throw new Error('The file has no data rows.');

  return { rows, totalRows: rows.length, mappedColumns, unmappedColumns, missingIdCount, sheetsParsed, removedCount };
}
