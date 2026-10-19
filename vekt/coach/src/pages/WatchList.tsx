import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import { Button, Drawer, Empty, ErrorNote, PageHeader, Panel, Spinner, Table, td, th, Toggle } from "../components/ui";
import { date } from "../lib/format";
import { AthleteDrawer, contactLabel, type AthleteCard } from "./Feed";

interface Row extends AthleteCard { note: string | null; added_at: string; added_by: string | null; recruit_id: string | null; still_visible: boolean }

export default function WatchList() {
  const { program, me } = useSession();
  const { data, error, loading, reload } = useLoad(() => api<{ athletes: Row[] }>("watch_list", { program_id: program!.id }), [program?.id]);
  const [open, setOpen] = useState<string | null>(null);
  const [inviting, setInviting] = useState<Row | null>(null);
  const rows = data?.athletes ?? [];
  const ready = rows.filter((r) => r.contact.open && !r.recruit_id);

  return (
    <div>
      <PageHeader eyebrow="Down the line" title="Watch list"
        subtitle="Athletes you've found in the film feed. VEKT shows when NCAA contact opens for each one; until then, watch only." />
      {ready.length > 0 && <p className="text-sm text-white mb-5">{ready.length === 1 ? "1 athlete is" : `${ready.length} athletes are`} now open for contact.</p>}
      <Panel>
        {loading && !data ? <Spinner /> : error ? <div className="p-6"><ErrorNote message={error} /></div> : !rows.length ? (
          <Empty title="Nobody on your watch list yet" hint="Save athletes from the film feed, including freshmen and sophomores you can't contact yet." action={<Link to="/feed" className="text-white underline underline-offset-4">Open the film feed</Link>} />
        ) : (
          <Table>
            <thead><tr><th className={th}>Athlete</th><th className={th}>Position</th><th className={th}>Club</th><th className={th}>Contact</th><th className={th}>Note</th><th className={th}></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}><button className="text-white hover:underline underline-offset-4 text-left" onClick={() => setOpen(r.id)}>{r.full_name}</button><div className="text-xs text-vekt-grey">Class of {r.grad_year ?? "?"}{r.added_by ? ` · saved by ${r.added_by}` : ""}</div></td>
                  <td className={`${td} text-white/80`}>{r.position}</td>
                  <td className={`${td} text-white/80`}>{r.club}<div className="text-xs text-vekt-grey">{r.state}</div></td>
                  <td className={`${td} whitespace-nowrap ${r.contact.open ? "text-white" : "text-vekt-grey"}`}>{contactLabel(r.contact)}</td>
                  <td className={`${td} text-xs text-vekt-grey max-w-[260px]`}>{r.note}{!r.still_visible && <div className="text-white mt-1">The family turned off the feed.</div>}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {r.recruit_id ? <Link to={`/recruits/${r.recruit_id}`} className="text-sm text-white underline underline-offset-4">On your board</Link>
                      : r.contact.open && me?.can.write ? <Button onClick={() => setInviting(r)}>Invite</Button>
                      : me?.can.write ? <button className="text-xs text-vekt-grey hover:text-white" onClick={async () => { await api("watch_remove", { program_id: program!.id, athlete_id: r.id }); reload(); }}>Remove</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <AthleteDrawer athleteId={open} onClose={() => setOpen(null)} />
      <InviteFromWatch row={inviting} onClose={() => setInviting(null)} onDone={reload} />
    </div>
  );
}

function InviteFromWatch({ row, onClose, onDone }: { row: Row | null; onClose: () => void; onDone: () => void }) {
  const { program } = useSession();
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const close = () => { setAttest(false); setError(null); setSent(false); onClose(); };
  const go = async () => {
    setBusy(true); setError(null);
    try { await api("watch_invite", { program_id: program!.id, athlete_id: row!.id, attest }); setSent(true); onDone(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={!!row} onClose={close} title={`Invite ${row?.full_name ?? ""}`}
      footer={sent ? <Button onClick={close}>Done</Button> : <Button variant="primary" onClick={go} loading={busy} disabled={!attest}>Send invite</Button>}>
      {sent ? <p className="text-white">Invite sent to the family. {row?.full_name} is on your board; their contact details stay private until the family shares the profile with you.</p> : (
        <div className="flex flex-col gap-5">
          <p className="text-white/85 font-light">VEKT sends the family the usual invite: parent approval, the voice conversation, and a link to share their VEKT profile with you. You won't see their email or phone until they share.</p>
          <p className="text-sm text-vekt-grey">{row && contactLabel(row.contact)}{row?.contact.date ? ` (since ${date(row.contact.date)})` : ""}.</p>
          <div className="border border-white/[0.16] rounded p-4"><Toggle checked={attest} onChange={setAttest} label="My staff is cleared to contact this recruit under NCAA rules" hint="Recorded with your name and the time." /></div>
          {error && <ErrorNote message={error} />}
        </div>
      )}
    </Drawer>
  );
}
