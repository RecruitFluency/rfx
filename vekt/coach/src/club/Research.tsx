// Program research: filter colleges by level, location, cost and academics. The
// list comes from a spreadsheet the club (or VEKT) loads; nothing here is scraped.
import { useEffect, useRef, useState } from "react";
import { clubApi } from "../lib/clubApi";
import { useSession } from "../session";
import { Button, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Table, td, th } from "../components/ui";
import { SPORTS } from "../../../supabase/functions/_shared/sports.ts";
import { usd } from "../lib/format";

interface Program { id: string; name: string; conference: string | null; division: string | null; city: string | null; state: string | null; control: string | null; avg_gpa: number | null; cost_per_year: number | null; acceptance_rate: number | null; enrollment: number | null; sports: string[]; staff_count: number | null; source: string | null }
const DIVISIONS = ["D1", "D2", "D3", "NAIA", "NJCAA"];
const blank = { q: "", division: "", state: "", control: "", max_cost: "", sport: "" };

// Spreadsheet headers we recognise, after lower-casing and dropping punctuation.
const ALIASES: [string, string[]][] = [
  ["name", ["name", "school", "schoolname", "institution", "college", "university"]],
  ["conference", ["conference", "conf"]],
  ["division", ["division", "level", "div"]],
  ["city", ["city", "town"]],
  ["state", ["state", "st"]],
  ["control", ["control", "type", "publicprivate", "schooltype"]],
  ["avg_gpa", ["avggpa", "averagegpa", "gpa"]],
  ["cost_per_year", ["costperyear", "cost", "tuition", "netcost", "costofattendance", "coa"]],
  ["acceptance_rate", ["acceptancerate", "acceptance", "admitrate", "admissionrate"]],
  ["enrollment", ["enrollment", "students", "undergrads", "undergraduateenrollment"]],
  ["sports", ["sports", "sportsoffered"]],
  ["staff_count", ["staffcount", "staff", "coaches"]],
  ["source", ["source", "datasource"]],
];
const keyFor = (h: string) => { const k = h.toLowerCase().replace(/[^a-z]/g, ""); return ALIASES.find(([, a]) => a.includes(k))?.[0] ?? null; };

export default function Research() {
  const { club } = useSession();
  const [f, setF] = useState(blank);
  const [applied, setApplied] = useState(blank);
  const [data, setData] = useState<{ programs: Program[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const body = (x: typeof blank) => ({ ...x, max_cost: x.max_cost ? Number(x.max_cost.replace(/[$,]/g, "")) : null });
  useEffect(() => { setData(null); clubApi("programs", body(applied)).then(setData).catch((e) => setError(e.message)); }, [applied]);
  const loadMore = async () => {
    if (!data) return; setMore(true);
    try { const n = await clubApi<{ programs: Program[]; total: number }>("programs", { ...body(applied), offset: data.programs.length }); setData({ ...data, programs: [...data.programs, ...n.programs] }); } finally { setMore(false); }
  };
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Program research" subtitle="Find programs by level, location, cost and academics, then point each player at the ones that fit." />
      <Panel className="mb-8">
        <form className="p-6 grid sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1.3fr_auto] gap-3 items-end" onSubmit={(e) => { e.preventDefault(); setApplied(f); }}>
          <Field label="School or conference"><Input value={f.q} onChange={set("q")} /></Field>
          <Field label="Level"><Select value={f.division} onChange={set("division")}><option value="">All</option>{DIVISIONS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
          <Field label="State"><Input value={f.state} onChange={set("state")} maxLength={2} placeholder="OH" /></Field>
          <Field label="Type"><Select value={f.control} onChange={set("control")}><option value="">All</option><option value="public">Public</option><option value="private">Private</option></Select></Field>
          <Field label="Max cost / yr"><Input inputMode="numeric" value={f.max_cost} onChange={set("max_cost")} /></Field>
          <Field label="Sport"><Select value={f.sport} onChange={set("sport")}><option value="">All</option>{SPORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
          <Button type="submit">Search</Button>
        </form>
      </Panel>
      {error ? <ErrorNote message={error} /> : !data ? <Spinner /> : (
        <Panel className="mb-8">
          <PanelTitle>{data.total} {data.total === 1 ? "program" : "programs"}</PanelTitle>
          <Table>
            <thead><tr>{["School", "Level", "Location", "Type", "Avg GPA", "Cost / yr", "Acceptance", "Enrollment", "Source"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.programs.map((p) => (
                <tr key={p.id}>
                  <td className={td}><div className="text-white">{p.name}</div><div className="text-xs text-vekt-grey">{p.conference}</div></td>
                  <td className={td}>{p.division ?? "·"}</td>
                  <td className={`${td} whitespace-nowrap`}>{[p.city, p.state].filter(Boolean).join(", ")}</td>
                  <td className={`${td} capitalize`}>{p.control ?? "·"}</td>
                  <td className={td}>{p.avg_gpa ?? "·"}</td>
                  <td className={td}>{p.cost_per_year != null ? usd(p.cost_per_year) : "·"}</td>
                  <td className={td}>{p.acceptance_rate != null ? `${Number(p.acceptance_rate)}%` : "·"}</td>
                  <td className={td}>{p.enrollment?.toLocaleString() ?? "·"}</td>
                  <td className={`${td} text-xs text-vekt-grey max-w-[180px]`}>{p.source}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.programs.length < data.total && <div className="p-6"><Button onClick={loadMore} loading={more}>Load more</Button></div>}
        </Panel>
      )}
      {club?.account.role === "director" && <ImportPrograms onDone={() => setApplied({ ...applied })} />}
    </div>
  );
}

function ImportPrograms({ onDone }: { onDone: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [cols, setCols] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const read = async (fl: File) => {
    setMsg(null);
    const { readSheet } = await import("../lib/csv");
    const sheet = await readSheet(fl);
    const keys = sheet.headers.map(keyFor);
    if (!keys.includes("name")) { setMsg("We couldn't find a school name column. Name it School or Name."); return; }
    setCols([...new Set(keys.filter(Boolean) as string[])]);
    setRows(sheet.rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]]).filter(([k]) => k))));
  };
  const send = async () => {
    setBusy(true); setMsg(null);
    try { const out = await clubApi<{ added: number }>("programs_import", { rows }); setMsg(`Added ${out.added} programs. Only your club sees them.`); setRows(null); onDone(); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel>
      <PanelTitle>Load programs from a spreadsheet</PanelTitle>
      <div className="p-6 flex flex-col gap-4">
        <p className="text-sm text-vekt-grey">CSV or Excel, one school per row. Columns we read: School, Conference, Division, City, State, Public/Private, Avg GPA, Cost per year, Acceptance rate, Enrollment, Sports, Staff, Source. Note where the numbers came from in Source.</p>
        <input ref={file} type="file" accept=".csv,.xlsx,.xls" className="text-sm text-vekt-grey file:mr-4 file:rounded file:border file:border-white/40 file:bg-transparent file:px-4 file:min-h-[40px] file:text-white" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        {rows && <p className="text-sm text-white">{rows.length} rows ready. Columns found: {cols.join(", ")}.</p>}
        {rows && <Button className="self-start" onClick={send} loading={busy}>Add {rows.length} programs</Button>}
        {msg && <p className="text-sm text-vekt-grey">{msg}</p>}
      </div>
    </Panel>
  );
}
