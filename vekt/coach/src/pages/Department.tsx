import { useState } from "react";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { Program, Role } from "../lib/types";
import { Badge, Button, Drawer, ErrorNote, Field, Input, PageHeader, Panel, PanelTitle, Select, Spinner, Table, td, th, Toggle } from "../components/ui";
import { date, programName, roleLabel, usd } from "../lib/format";
import { MismatchCost } from "../components/MismatchCost";

interface Dept {
  department: { name: string; division: string | null; conference: string | null; license_type: "all_sports" | "per_sport"; license_start: string | null; license_end: string | null; billing_status: string } | null;
  programs: (Program & { recruits: number; conversations: number; fit_reads: number; interested: number })[];
  accounts: { id: string; first_name: string; last_name: string; title: string | null; email: string; role: Role; active: boolean; signed_in: boolean }[];
  pricing: Record<string, number>;
}

export default function Department() {
  const { me } = useSession();
  const { data, error, loading, reload } = useLoad(() => api<Dept>("department"), []);
  const [adding, setAdding] = useState<Partial<Dept["accounts"][number]> | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const d = data.department;
  const licensed = data.programs.filter((p) => p.licensed).length;
  const p = data.pricing;
  const perSport = licensed ? (p.price_single_sport_cents + Math.max(0, licensed - 1) * p.price_additional_sport_cents) / 100 : 0;
  const canEdit = me?.can.department;

  return (
    <div>
      <PageHeader eyebrow="Athletic department" title={d?.name ?? "Department"} subtitle={[d?.division, d?.conference].filter(Boolean).join(" · ")} />
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <Panel className="p-6">
          <div className="vekt-label">License</div>
          <div className="vekt-display text-[34px] mt-3">{d?.license_type === "all_sports" ? "All sports" : `${licensed} ${licensed === 1 ? "sport" : "sports"}`}</div>
          <p className="text-sm text-vekt-grey mt-2">{d?.license_start && `${date(d.license_start)} to ${date(d.license_end)}`}</p>
          <p className="text-sm text-vekt-grey mt-1">{d?.license_type === "all_sports" ? `${usd(p.price_all_sports_cents / 100)} a year, every sport` : `${usd(perSport)} a year (${usd(p.price_single_sport_cents / 100)} first sport, ${usd(p.price_additional_sport_cents / 100)} each added)`}</p>
          {d?.license_type === "per_sport" && licensed > 0 && perSport >= p.price_all_sports_cents / 100 && <p className="text-sm text-white mt-3">At this many sports, the all-sports license costs the same or less.</p>}
        </Panel>
        <Panel className="p-6 lg:col-span-2">
          <div className="vekt-label mb-4">Across your programs</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[["Recruits", "recruits"], ["Conversations", "conversations"], ["Fit Reads", "fit_reads"], ["Interested", "interested"]].map(([label, k]) => (
              <div key={k}><div className="vekt-label">{label}</div><div className="vekt-display text-[44px] mt-2">{data.programs.reduce((s, x) => s + (x as any)[k], 0)}</div></div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mb-8">
        <PanelTitle>Programs</PanelTitle>
        <Table>
          <thead><tr><th className={th}>Program</th><th className={th}>Licensed</th><th className={th}>Recruits</th><th className={th}>Conversations</th><th className={th}>Fit Reads</th><th className={th}>Interested</th></tr></thead>
          <tbody>{data.programs.map((x) => (
            <tr key={x.id}><td className={`${td} text-white`}>{programName(x)}</td><td className={td}>{x.licensed ? <Badge tone="done">Yes</Badge> : <Badge>No</Badge>}</td><td className={td}>{x.recruits}</td><td className={td}>{x.conversations}</td><td className={td}>{x.fit_reads}</td><td className={td}>{x.interested}</td></tr>
          ))}</tbody>
        </Table>
      </Panel>

      <Panel className="mb-8">
        <PanelTitle action={canEdit ? <Button onClick={() => setAdding({ role: "assistant_coach", active: true })}>Add staff</Button> : undefined}>Staff accounts</PanelTitle>
        <Table>
          <thead><tr><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Email</th><th className={th}>Status</th></tr></thead>
          <tbody>{data.accounts.map((a) => (
            <tr key={a.id} className={canEdit ? "cursor-pointer hover:bg-white/[0.02]" : ""} onClick={() => canEdit && setAdding(a)}>
              <td className={`${td} text-white`}>{a.first_name} {a.last_name}<div className="text-xs text-vekt-grey">{a.title}</div></td>
              <td className={td}>{roleLabel[a.role]}</td><td className={`${td} text-vekt-grey`}>{a.email}</td>
              <td className={td}>{!a.active ? <Badge tone="bad">Off</Badge> : a.signed_in ? <Badge tone="done">Active</Badge> : <Badge>Not signed in yet</Badge>}</td>
            </tr>
          ))}</tbody>
        </Table>
      </Panel>

      <MismatchCost />
      <AccountDrawer account={adding} programs={data.programs} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); reload(); }} />
    </div>
  );
}

function AccountDrawer({ account, programs, onClose, onSaved }: { account: any; programs: Program[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({});
  const [pids, setPids] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<any>(null);
  if (account !== last) { setLast(account); setF(account ?? {}); setPids([]); setTouched(false); setError(null); }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x: any) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setError(null);
    try { await api("account_save", { account: { ...f, program_ids: ["head_coach", "assistant_coach"].includes(f.role) && (!f.id || touched) ? pids : undefined } }); onSaved(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={!!account} onClose={onClose} title={f.id ? `${f.first_name} ${f.last_name}` : "Add staff"} footer={<Button variant="primary" onClick={save} loading={busy}>Save</Button>}>
      <div className="flex flex-col gap-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="First name"><Input value={f.first_name ?? ""} onChange={set("first_name")} /></Field>
          <Field label="Last name"><Input value={f.last_name ?? ""} onChange={set("last_name")} /></Field>
        </div>
        <Field label="Title"><Input value={f.title ?? ""} onChange={set("title")} /></Field>
        <Field label="School email" hint="They sign in with a code sent here. Must end in .edu."><Input type="email" value={f.email ?? ""} onChange={set("email")} /></Field>
        <Field label="Role">
          <Select value={f.role} onChange={set("role")}>
            {(["head_coach", "assistant_coach", "dept_admin", "compliance"] as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </Select>
        </Field>
        {["head_coach", "assistant_coach"].includes(f.role) && (
          <div className="flex flex-col gap-3">
            <span className="vekt-label">Programs{f.id ? " (choose to change)" : ""}</span>
            {programs.map((p) => <Toggle key={p.id} label={programName(p)} checked={pids.includes(p.id)} onChange={(v) => { setTouched(true); setPids((x) => (v ? [...x, p.id] : x.filter((y) => y !== p.id))); }} />)}
          </div>
        )}
        {f.id && <Toggle label="Account active" checked={f.active !== false} onChange={(v) => setF((x: any) => ({ ...x, active: v }))} />}
        {error && <ErrorNote message={error} />}
      </div>
    </Drawer>
  );
}
