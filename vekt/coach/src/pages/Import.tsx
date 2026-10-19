import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { api } from "../lib/api";
import { useSession } from "../session";
import { FIELD_LABELS, guessMapping, mapRows, readSheet, TEMPLATE, type ImportField, type Sheet } from "../lib/csv";
import { Button, ErrorNote, PageHeader, Panel, PanelTitle, Select, Table, td, th } from "../components/ui";

export default function Import() {
  const { program } = useSession();
  const nav = useNavigate();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<(ImportField | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ added: number; skipped: { row: number; reason: string }[] } | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null); setDone(null);
    try { const s = await readSheet(file); setSheet(s); setMapping(guessMapping(s.headers)); }
    catch { setError("We couldn't read that file. Use a .csv or .xlsx with a header row."); }
  };
  const rows = sheet ? mapRows(sheet, mapping) : [];
  const good = rows.filter((r) => !r.errors.length);
  const run = async () => {
    setBusy(true); setError(null);
    try { setDone(await api("import_recruits", { program_id: program!.id, rows: good.map((r) => r.values) })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const template = () => {
    const blob = new Blob([TEMPLATE.join(",") + "\n"], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "vekt-recruits-template.csv"; a.click();
  };

  return (
    <div>
      <PageHeader eyebrow="Recruits" title="Import a list" subtitle="Upload a CSV or Excel file from your spreadsheet or recruiting system. Nothing is sent until you choose to invite."
        actions={<Button variant="ghost" onClick={template}>Download template</Button>} />
      {done ? (
        <Panel className="p-8">
          <div className="vekt-display text-[44px]">{done.added} added</div>
          {done.skipped.length > 0 && <p className="text-vekt-grey mt-2">{done.skipped.length} skipped (no name).</p>}
          <Button variant="primary" className="mt-8" onClick={() => nav("/recruits")}>Go to recruits</Button>
        </Panel>
      ) : (
        <div className="flex flex-col gap-8">
          <label className="border border-dashed border-white/25 rounded p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-white/50">
            <Upload className="w-6 h-6 text-vekt-grey" />
            <span className="text-white">{sheet ? `${sheet.rows.length} rows read. Choose another file` : "Choose a .csv or .xlsx file"}</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {error && <ErrorNote message={error} />}
          {sheet && (
            <>
              <Panel>
                <PanelTitle>Match your columns</PanelTitle>
                <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sheet.headers.map((h, i) => (
                    <label key={i} className="flex flex-col gap-2">
                      <span className="text-sm text-white truncate">{h || `Column ${i + 1}`}</span>
                      <Select value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => m.map((x, j) => (j === i ? ((e.target.value || null) as ImportField | null) : x)))}>
                        <option value="">Ignore</option>
                        {(Object.keys(FIELD_LABELS) as ImportField[]).map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                      </Select>
                    </label>
                  ))}
                </div>
              </Panel>
              <Panel>
                <PanelTitle action={<Button variant="primary" onClick={run} loading={busy} disabled={!good.length}>Add {good.length} recruits</Button>}>Check before adding</PanelTitle>
                <Table>
                  <thead><tr><th className={th}>Row</th><th className={th}>Name</th><th className={th}>Position</th><th className={th}>Class</th><th className={th}>Notes</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 300).map((r) => (
                      <tr key={r.index}>
                        <td className={`${td} text-vekt-grey`}>{r.index}</td>
                        <td className={`${td} ${r.errors.length ? "text-vekt-grey line-through" : "text-white"}`}>{String(r.values.recruit_name ?? "·")}</td>
                        <td className={td}>{String(r.values.position ?? "")}</td>
                        <td className={td}>{String(r.values.grad_year ?? "")}</td>
                        <td className={`${td} text-xs text-vekt-grey`}>{[...r.errors, ...r.warnings].join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
