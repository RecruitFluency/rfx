import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "../lib/api";
import { useLoad } from "../session";
import { Badge, Button, Empty, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Spinner, Table, td, th } from "../components/ui";
import { date, dateTime, eventLabel, roleTo } from "../lib/format";

interface Log {
  from: string; to: string;
  rows: { when: string; recruit: string; grad_year: number | null; team: string; to: string; channel: string; status: string; contact_rule: string | null; contact_clear_date: string | null; parent_approved: boolean; staff_attested_at: string | null }[];
  audit: { action: string; entity: string; entity_id: string | null; detail: Record<string, unknown>; created_at: string; by: string }[];
}

const csvCell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export default function Compliance() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState(range);
  const { data, error, loading } = useLoad(() => api<Log>("compliance_log", applied), [applied.from, applied.to]);
  const exportCsv = () => {
    if (!data) return;
    const head = ["When", "Recruit", "Class", "Team", "To", "Channel", "Status", "Contact rule", "Contact opens", "Parent approved", "Staff attested"];
    const lines = data.rows.map((r) => [r.when, r.recruit, r.grad_year, r.team, roleTo[r.to] ?? r.to, r.channel, eventLabel[r.status] ?? r.status, r.contact_rule, r.contact_clear_date, r.parent_approved ? "yes" : "no", r.staff_attested_at].map(csvCell).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vekt-contact-log-${data.from}-to-${data.to}.csv`; a.click();
  };
  return (
    <div>
      <PageHeader eyebrow="Compliance" title="Contact log" subtitle="Every message VEKT sent for your staff, with the NCAA contact rule checked, the parent's approval, and the staff attestation."
        actions={<Button onClick={exportCsv} disabled={!data?.rows.length}><Download className="w-4 h-4" /> Export CSV</Button>} />
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <Field label="From"><Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
        <Field label="To"><Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
        <Button onClick={() => setApplied(range)}>Apply</Button>
        {data && <span className="text-sm text-vekt-grey pb-3">{date(data.from)} to {date(data.to)}</span>}
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorNote message={error} /> : data && (
        <div className="flex flex-col gap-8">
          <Panel>
            <PanelTitle>Messages</PanelTitle>
            {!data.rows.length ? <Empty title="No messages in this range" /> : (
              <Table>
                <thead><tr>{["When", "Recruit", "Team", "To", "Status", "Contact rule", "Parent approved", "Attested"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{data.rows.map((r, i) => (
                  <tr key={i}>
                    <td className={`${td} whitespace-nowrap text-vekt-grey`}>{dateTime(r.when)}</td>
                    <td className={`${td} text-white`}>{r.recruit}<div className="text-xs text-vekt-grey">{r.grad_year && `Class of ${r.grad_year}`}</div></td>
                    <td className={td}>{r.team}</td>
                    <td className={td}>{roleTo[r.to] ?? r.to} · {r.channel === "sms" ? "Text" : r.channel === "email" ? "Email" : "·"}</td>
                    <td className={td}><Badge>{eventLabel[r.status] ?? r.status}</Badge></td>
                    <td className={`${td} text-xs text-vekt-grey max-w-[220px]`}>{r.contact_rule}{r.contact_clear_date && ` (opens ${r.contact_clear_date})`}</td>
                    <td className={td}>{r.parent_approved ? "Yes" : "Not yet"}</td>
                    <td className={`${td} text-xs text-vekt-grey whitespace-nowrap`}>{r.staff_attested_at ? date(r.staff_attested_at) : "·"}</td>
                  </tr>
                ))}</tbody>
              </Table>
            )}
          </Panel>
          <Panel>
            <PanelTitle>Staff actions</PanelTitle>
            {!data.audit.length ? <Empty title="No staff actions in this range" /> : (
              <Table>
                <thead><tr>{["When", "Who", "Action"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{data.audit.map((a, i) => (
                  <tr key={i}><td className={`${td} whitespace-nowrap text-vekt-grey`}>{dateTime(a.created_at)}</td><td className={td}>{a.by}</td>
                    <td className={td}>{a.action} {a.entity.replace("_", " ")}{a.detail?.attested ? " (attested NCAA contact clearance)" : ""}{a.detail?.decision ? `: ${a.detail.decision === "interested" ? "Interested" : "Not a fit"}` : ""}</td></tr>
                ))}</tbody>
              </Table>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
