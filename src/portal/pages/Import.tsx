import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import { CSV_TEMPLATE_HEADERS, FIELD_LABELS, guessMapping, mapRows, readSheet, type ImportField, type ParsedSheet } from '../lib/csv';
import type { ImportResult } from '../lib/types';
import { downloadCsv, programName } from '../lib/format';
import { Badge, Button, Empty, ErrorNote, Field, PageHeader, Panel, PanelTitle, Select, Table, td, th } from '../components/ui';

export default function Import() {
  const { editablePrograms, programId } = usePortal();
  const [target, setTarget] = useState(() =>
    programId && editablePrograms.some((p) => p.id === programId) ? programId : editablePrograms[0]?.id ?? '');
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<(ImportField | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const rows = useMemo(() => (sheet ? mapRows(sheet, mapping) : []), [sheet, mapping]);
  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  if (editablePrograms.length === 0) return <Empty title="Only coaching staff can import prospects" />;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null); setResult(null);
    try {
      const parsed = await readSheet(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) throw new Error('That file has no rows to import.');
      if (parsed.rows.length > 2000) throw new Error('Import at most 2,000 rows at a time. Split the file and try again.');
      setFileName(file.name);
      setSheet(parsed);
      setMapping(guessMapping(parsed.headers));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runImport() {
    setImporting(true); setError(null);
    try {
      setResult(await api.importProspects(target, valid.map((r) => r.values)));
      setSheet(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const template = () => downloadCsv('vekt-prospect-template.csv', [Object.fromEntries(CSV_TEMPLATE_HEADERS.map((h) => [h, '']))]);

  return (
    <div>
      <PageHeader eyebrow="Prospects" title="Import"
        subtitle="Upload a CSV or Excel export of your recruiting board. We'll match the columns, check every phone number and email, and skip anyone already in the program." />

      {result && (
        <Panel className="mb-6">
          <PanelTitle>Import complete</PanelTitle>
          <div className="p-6 flex flex-wrap gap-10 items-end">
            <Count label="Imported" value={result.imported} />
            <Count label="Already in program" value={result.duplicates} />
            <Count label="Rejected" value={result.errors} />
            <Link to="/portal/prospects" className="text-white underline ml-auto">View prospects</Link>
          </div>
          {result.errors > 0 && (
            <ul className="px-6 pb-6 text-sm text-vekt-grey">
              {result.rows.filter((r) => r.status === 'error').map((r) => <li key={r.row}>Row {r.row}: {r.error}</li>)}
            </ul>
          )}
        </Panel>
      )}

      {!sheet && (
        <Panel>
          <div className="p-6 flex flex-col gap-6">
            {editablePrograms.length > 1 && (
              <Field label="Import into" className="max-w-sm">
                <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {editablePrograms.map((p) => <option key={p.id} value={p.id}>{programName(p)}</option>)}
                </Select>
              </Field>
            )}
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}
              className={`flex flex-col items-center justify-center text-center gap-3 border border-dashed rounded-lg px-6 py-16 cursor-pointer transition
                          ${dragging ? 'border-white bg-white/[0.04]' : 'border-white/25 hover:border-white/50'}`}>
              <UploadCloud className="w-8 h-8 text-vekt-grey" />
              <span className="text-white">Drop a .csv or .xlsx file, or click to choose</span>
              <span className="text-sm text-vekt-grey">Up to 2,000 rows. Include parent and club director contacts if you have them.</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button onClick={template} className="self-start text-sm text-vekt-grey hover:text-white underline">Download a blank template</button>
            {error && <ErrorNote message={error} />}
          </div>
        </Panel>
      )}

      {sheet && (
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelTitle action={<button onClick={() => setSheet(null)} className="text-sm text-vekt-grey hover:text-white underline">Choose another file</button>}>
              Match columns · {fileName}
            </PanelTitle>
            <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sheet.headers.map((h, i) => (
                <Field key={`${h}${i}`} label={h || `Column ${i + 1}`} hint={sheet.rows[0]?.[i] ? `e.g. ${sheet.rows[0][i]}` : undefined}>
                  <Select value={mapping[i] ?? ''} onChange={(e) => setMapping((m) => m.map((x, j) => (j === i ? (e.target.value || null) as ImportField | null : x)))}>
                    <option value="">Don't import</option>
                    {(Object.keys(FIELD_LABELS) as ImportField[]).map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Check · {valid.length} ready, {invalid.length} need fixing</PanelTitle>
            <Table>
              <thead><tr><th className={th}>Row</th><th className={th}>Name</th><th className={th}>Mobile</th><th className={th}>Email</th><th className={th}>Class</th><th className={th}>Issues</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.index}>
                    <td className={`${td} text-vekt-grey`}>{r.index}</td>
                    <td className={`${td} text-white`}>{String(r.values.first_name ?? '')} {String(r.values.last_name ?? '')}</td>
                    <td className={`${td} text-vekt-grey`}>{String(r.values.mobile ?? '—')}</td>
                    <td className={`${td} text-vekt-grey`}>{String(r.values.email ?? '—')}</td>
                    <td className={`${td} text-vekt-grey`}>{String(r.values.grad_year ?? '—')}</td>
                    <td className={td}>
                      {r.errors.length === 0 && r.warnings.length === 0 && <Badge tone="progress">Ready</Badge>}
                      {r.errors.map((e) => <div key={e} className="text-white text-xs">✕ {e}</div>)}
                      {r.warnings.map((w) => <div key={w} className="text-vekt-grey text-xs">{w}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {rows.length > 200 && <p className="px-6 py-3 text-xs text-vekt-grey">Showing the first 200 of {rows.length} rows.</p>}
          </Panel>

          {!mapping.includes('first_name') && !mapping.includes('full_name') && <ErrorNote message="Match a column to First name (or Full name) to continue." />}
          {error && <ErrorNote message={error} />}
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" onClick={runImport} loading={importing} disabled={valid.length === 0}>
              Import {valid.length} prospect{valid.length === 1 ? '' : 's'}
            </Button>
            {invalid.length > 0 && <span className="text-sm text-vekt-grey">{invalid.length} row{invalid.length === 1 ? '' : 's'} with problems will be skipped.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="vekt-label mb-2">{label}</div>
      <div className="vekt-display text-[44px]">{value}</div>
    </div>
  );
}
