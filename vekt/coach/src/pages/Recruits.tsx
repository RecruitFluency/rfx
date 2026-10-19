import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { RecruitRow, StageKey } from "../lib/types";
import { Badge, Button, ButtonLink, Drawer, Empty, ErrorNote, Input, PageHeader, Panel, Select, Spinner, StageBadge, Toggle, td, th, Table } from "../components/ui";

const FILTERS: { value: string; label: string; keys: StageKey[] }[] = [
  { value: "all", label: "All", keys: [] },
  { value: "ready", label: "Fit Read ready", keys: ["read_ready", "read_partial"] },
  { value: "progress", label: "In progress", keys: ["waiting_parent", "approved", "writing", "waiting_director"] },
  { value: "not_invited", label: "Not invited", keys: ["not_invited", "held"] },
  { value: "decided", label: "Decided", keys: ["interested", "not_a_fit"] },
];
const norm = (s: string | null) => (s || "").toLowerCase().replace(/[^a-z]/g, "");

export default function Recruits() {
  const { me, program } = useSession();
  const nav = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api<{ recruits: RecruitRow[] }>("recruits", { program_id: program!.id }), [program?.id]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [position, setPosition] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.value === filter)!;
    return (data?.recruits ?? []).filter((r) =>
      (!f.keys.length || f.keys.includes(r.stage.key)) &&
      (!position || norm(r.position) === position) &&
      (!q || `${r.recruit_name} ${r.club_or_school ?? ""} ${r.club_coach_name ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  }, [data, q, filter, position]);
  const positions = [...new Map((data?.recruits ?? []).filter((r) => r.position).map((r) => [norm(r.position), r.position!])).entries()];
  const sel = (data?.recruits ?? []).filter((r) => picked.has(r.id));
  const samePosition = sel.length > 0 && new Set(sel.map((r) => norm(r.position))).size === 1 && !!sel[0].position;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // One CSV with the columns recruiting systems import, plus each recruit's VEKT Fit Read link.
  const exportCsv = async () => {
    const { rows } = await api<{ rows: Record<string, string | number>[] }>("export_board", { program_id: program!.id });
    if (!rows.length) return;
    const cell = (v: unknown) => { const t = v == null ? "" : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const head = Object.keys(rows[0]);
    const blob = new Blob([[head.join(","), ...rows.map((r) => head.map((h) => cell(r[h])).join(","))].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vekt-board-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const compare = async () => {
    setBusy(true); setError2(null);
    try { const out = await api<{ id: string }>("side_by_side_create", { program_id: program!.id, recruit_ids: [...picked] }); nav(`/side-by-side/${out.id}`); }
    catch (e) { setError2((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader eyebrow="Your board" title="Recruits" subtitle="Everyone you've added, their contacts, and where they are in the VEKT conversation."
        actions={<>{me?.can.write && <><ButtonLink to="/recruits/new" variant="primary">Add a recruit</ButtonLink><ButtonLink to="/recruits/import">Import a list</ButtonLink></>}<Button variant="ghost" onClick={exportCsv}>Export (Teamworks, Front Rush, Excel)</Button></>} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-vekt-grey absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Search name, club or director" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="!w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status">
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </Select>
        <Select className="!w-auto" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Position">
          <option value="">All positions</option>
          {positions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </Select>
      </div>

      {picked.size > 0 && me?.can.write && (
        <div className="sticky top-14 lg:top-0 z-10 bg-vekt-black border border-white/[0.16] rounded p-4 mb-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-white mr-auto">{picked.size} selected</span>
          <Button onClick={() => setInviting(true)}>Send invites</Button>
          <Button onClick={compare} loading={busy} disabled={picked.size < 2 || picked.size > 4 || !samePosition}
            title={!samePosition ? "Pick recruits at the same position" : undefined}>Side-by-Side{picked.size >= 2 && picked.size <= 4 && !samePosition ? " (same position only)" : ""}</Button>
          <Button variant="ghost" onClick={() => setPicked(new Set())}>Clear</Button>
          {error2 && <div className="w-full"><ErrorNote message={error2} /></div>}
        </div>
      )}

      <Panel>
        {loading && !data ? <Spinner /> : error ? <div className="p-6"><ErrorNote message={error} /></div> : !rows.length ? (
          <Empty title={data?.recruits.length ? "No recruits match" : "No recruits yet"} hint={data?.recruits.length ? undefined : "Add recruits one at a time or import your list. Add the club director's contact too: their blind read is what makes self-awareness possible."} />
        ) : (
          <Table>
            <thead><tr>
              {me?.can.write && <th className={`${th} w-10`}><span className="sr-only">Select</span></th>}
              <th className={th}>Recruit</th><th className={th}>Position</th><th className={th}>Class</th><th className={th}>Club</th>
              <th className={th}>Contacts</th><th className={th}>Status</th><th className={th}>Self-awareness</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  {me?.can.write && <td className={td}><input type="checkbox" className="w-4 h-4 accent-white mt-1" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.recruit_name}`} /></td>}
                  <td className={td}>
                    <Link to={`/recruits/${r.id}`} className="text-white hover:underline underline-offset-4">{r.recruit_name}</Link>
                    <div className="text-xs text-vekt-grey mt-0.5">Priority {r.priority}{r.source === "csv" ? " · imported" : ""}</div>
                  </td>
                  <td className={`${td} text-white/80`}>{r.position}</td>
                  <td className={`${td} text-white/80`}>{r.grad_year}</td>
                  <td className={`${td} text-white/80`}>{r.club_or_school}<div className="text-xs text-vekt-grey">{r.club_level}</div></td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={r.has_athlete_contact ? "progress" : "neutral"}>Athlete</Badge>
                      <Badge tone={r.has_parent_contact ? "progress" : "neutral"}>Parent</Badge>
                      <Badge tone={r.has_club_contact ? "progress" : "neutral"}>Director</Badge>
                      {r.fills_need && <Badge tone="done">Fills a need</Badge>}
                      {r.profile_in && <Badge tone="done">Profile</Badge>}
                      {r.club_eval_in && <Badge tone="done">Club read</Badge>}
                    </div>
                  </td>
                  <td className={td}><StageBadge stage={r.stage} /></td>
                  <td className={td}>
                    {r.self_awareness ? <Link to={`/recruits/${r.id}/fit-read`} className={`vekt-display text-[20px] hover:underline underline-offset-4 ${r.self_awareness.level === "pending" ? "text-white/40" : ""}`}>{r.self_awareness.label}</Link> : <span className="text-vekt-grey">·</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <InviteDrawer open={inviting} onClose={() => setInviting(false)} recruits={sel} onSent={() => { setPicked(new Set()); reload(); }} />
    </div>
  );
}

export function InviteDrawer({ open, onClose, recruits, onSent }: { open: boolean; onClose: () => void; recruits: RecruitRow[]; onSent: () => void }) {
  const [attest, setAttest] = useState(false);
  const [resend, setResend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ live: boolean; recruits: { id: string; contact_status: string; contact_clear_date?: string | null; sent: boolean; text: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const already = recruits.filter((r) => r.stage.key !== "not_invited" && r.stage.key !== "held").length;
  const send = async () => {
    setBusy(true); setError(null);
    try { setResult(await api("invite", { recruit_ids: recruits.map((r) => r.id), attest, resend })); onSent(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const close = () => { setResult(null); setAttest(false); setResend(false); setError(null); onClose(); };
  const names = new Map(recruits.map((r) => [r.id, r.recruit_name]));
  return (
    <Drawer open={open} onClose={close} title="Send invites"
      footer={result ? <Button onClick={close}>Done</Button> : <Button variant="primary" onClick={send} loading={busy} disabled={!attest}>Send {recruits.length} {recruits.length === 1 ? "invite" : "invites"}</Button>}>
      {!result ? (
        <div className="flex flex-col gap-6">
          <p className="text-white/85 font-light">VEKT sends each recruit's invites from your GoHighLevel account:</p>
          <ul className="text-sm text-white/80 flex flex-col gap-3 font-light">
            <li><span className="vekt-label mr-2">Parent</span>An email (and a text, if they opted in) asking them to approve a 15-minute voice conversation.</li>
            <li><span className="vekt-label mr-2">Athlete</span>Their link opens once a parent approves.</li>
            <li><span className="vekt-label mr-2">Club director</span>A link to give their own read, blind. They never see the athlete's answers.</li>
          </ul>
          <p className="text-sm text-vekt-grey font-light">Each recruit is checked against the NCAA contact calendar for your sport first. Anyone not yet open is held and sent automatically on their contact date. Texts go out between 9am and 8pm in the recipient's time zone. Anyone who replied STOP is skipped. Reminders follow on the days set for your program.</p>
          {already > 0 && <Toggle checked={resend} onChange={setResend} label={`Resend to the ${already} already invited`} hint="Sends again to anyone who hasn't finished. Use sparingly." />}
          <div className="border border-white/[0.16] rounded p-4">
            <Toggle checked={attest} onChange={setAttest} label="My staff is cleared to contact these recruits under NCAA rules"
              hint="Recorded with your name and the time, for your compliance office." />
          </div>
          <div className="text-sm text-vekt-grey">{recruits.map((r) => r.recruit_name).join(", ")}</div>
          {error && <ErrorNote message={error} />}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!result.live && <div className="border border-dashed border-white/40 rounded p-4 text-sm text-white">Test mode: invites are logged, not sent. VEKT switches sending on when your account goes live.</div>}
          {result.recruits.map((r) => (
            <div key={r.id} className="flex justify-between gap-4 border-b border-white/[0.06] pb-3 text-sm">
              <span className="text-white">{names.get(r.id)}</span>
              <span className="text-right text-vekt-grey">{r.contact_status === "cleared" ? (r.sent ? "Queued and sent" : "Couldn't send: check contacts") : r.text}</span>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
