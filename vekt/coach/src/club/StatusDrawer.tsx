// Record where a player landed: committed (with the program), not pursuing college, or back to active.
import { useEffect, useState } from "react";
import { clubApi, type ClubAthlete } from "../lib/clubApi";
import { useSession } from "../session";
import { Button, Drawer, ErrorNote, Field, Input, Segmented, Select } from "../components/ui";
import { date } from "../lib/format";

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "NJCAA"];

export function StatusDrawer({ athlete, onClose, onSaved }: { athlete: ClubAthlete | null; onClose: () => void; onSaved: () => void }) {
  const { club } = useSession();
  const canEdit = club?.account.role === "director";
  const [status, setStatus] = useState<ClubAthlete["status"]>("active");
  const [program, setProgram] = useState("");
  const [division, setDivision] = useState("");
  const [on, setOn] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!athlete) return;
    setStatus(athlete.status); setProgram(athlete.committed_program ?? athlete.interested_programs[0] ?? ""); setDivision(athlete.committed_division ?? athlete.top_division ?? "");
    setOn(athlete.committed_at ?? new Date().toISOString().slice(0, 10)); setError(null);
  }, [athlete]);
  const save = async () => {
    setBusy(true); setError(null);
    try { await clubApi("athlete_status", { id: athlete!.id, status, committed_program: program, committed_division: division, committed_at: on }); onSaved(); onClose(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const a = athlete;
  return (
    <Drawer open={!!a} onClose={onClose} title={a?.full_name ?? ""}
      footer={canEdit ? <Button variant="primary" onClick={save} loading={busy}>Save</Button> : undefined}>
      {a && (
        <div className="flex flex-col gap-6">
          <div className="text-sm text-white/80">{[`Class of ${a.grad_year ?? "?"}`, a.position, a.team].filter(Boolean).join(" · ")}</div>
          {a.on_vekt ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-white/[0.1] rounded p-4">
              {[["Programs", a.programs_engaged], ["Views", a.views], ["Saves", a.saves], ["Interested", a.interested]].map(([l, v]) => (
                <div key={l as string}><div className="vekt-label mb-1">{l}</div><div className="text-white text-lg">{v}</div></div>
              ))}
              {a.interested_programs.length > 0 && <div className="col-span-full text-xs text-vekt-grey">Interested: {a.interested_programs.join(", ")}</div>}
            </div>
          ) : <p className="text-sm text-vekt-grey">{a.pending_parent ? "Invited to VEKT. Waiting on the family to say yes." : "Not on VEKT yet. Invite the family from Roster & export."}</p>}
          {canEdit ? (
            <>
              <Segmented label="Status" value={status} onChange={setStatus} options={[{ value: "active", label: "Still recruiting" }, { value: "committed", label: "Committed" }, { value: "not_pursuing", label: "Not pursuing college" }]} />
              {status === "committed" && (
                <div className="grid sm:grid-cols-[2fr_1fr_1.2fr] gap-3">
                  <Field label="Program"><Input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="School name" /></Field>
                  <Field label="Level"><Select value={division} onChange={(e) => setDivision(e.target.value)}><option value="">·</option>{DIVISIONS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
                  <Field label="Committed on"><Input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
                </div>
              )}
              <p className="text-xs text-vekt-grey">Commitments are what the family tells you. VEKT doesn't record offers or scholarships.</p>
            </>
          ) : a.status === "committed" ? <p className="text-white">Committed to {a.committed_program}{a.committed_at ? ` on ${date(a.committed_at)}` : ""}.</p> : null}
          {error && <ErrorNote message={error} />}
        </div>
      )}
    </Drawer>
  );
}
