import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLoad, useSession } from "../session";
import type { InviteEvent } from "../lib/types";
import { Badge, Empty, ErrorNote, PageHeader, Panel, Select, Spinner, Table, td, th } from "../components/ui";
import { dateTime, eventLabel, roleTo } from "../lib/format";

export default function Activity() {
  const { program } = useSession();
  const { data, error, loading } = useLoad(() => api<{ events: InviteEvent[] }>("events", { program_id: program!.id }), [program?.id]);
  const [status, setStatus] = useState("");
  const events = useMemo(() => (data?.events ?? []).filter((e) => !status || e.status === status), [data, status]);
  const statuses = [...new Set((data?.events ?? []).map((e) => e.status))];
  return (
    <div>
      <PageHeader eyebrow="Tracking" title="Invites & activity" subtitle="Every invite, reminder and decision message: who it went to, how, and what happened to it." />
      <div className="mb-5">
        <Select className="!w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Every status</option>
          {statuses.map((s) => <option key={s} value={s}>{eventLabel[s] ?? s}</option>)}
        </Select>
      </div>
      <Panel>
        {loading && !data ? <Spinner /> : error ? <div className="p-6"><ErrorNote message={error} /></div> : !events.length ? <Empty title="Nothing here yet" /> : (
          <Table>
            <thead><tr><th className={th}>When</th><th className={th}>Recruit</th><th className={th}>To</th><th className={th}>How</th><th className={th}>Status</th><th className={th}>Detail</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} text-vekt-grey whitespace-nowrap`}>{dateTime(e.created_at)}</td>
                  <td className={td}><Link to={`/recruits/${e.recruit_id}`} className="text-white hover:underline underline-offset-4">{e.recruit_name}</Link></td>
                  <td className={td}>{roleTo[e.recipient_role ?? ""] ?? e.recipient_role}</td>
                  <td className={td}>{e.channel === "sms" ? "Text" : e.channel === "email" ? "Email" : "·"}</td>
                  <td className={td}><Badge tone={["delivered", "opened", "clicked", "sent"].includes(e.status) ? "done" : ["failed", "error", "bounced", "blocked", "opted_out"].includes(e.status) ? "warn" : "neutral"}>{eventLabel[e.status] ?? e.status}</Badge></td>
                  <td className={`${td} text-xs text-vekt-grey max-w-[320px]`}>{e.status === "dry_run" ? "Test mode: not sent" : e.detail}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
