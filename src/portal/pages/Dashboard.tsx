import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortal } from '../PortalContext';
import * as api from '../lib/api';
import type { Invitation, MessageEvent, ProspectOverview } from '../lib/types';
import { eventLabel, programName, recipientLabel, relativeTime } from '../lib/format';
import { ButtonLink, Empty, ErrorNote, PageHeader, Panel, PanelTitle, Spinner, Stat, StatusBadge } from '../components/ui';

type FeedItem = MessageEvent & { portal_invitations: Pick<Invitation, 'recipient_name' | 'recipient_type' | 'channel' | 'prospect_id' | 'program_id'> | null };

export default function Dashboard() {
  const { staff, scopeProgramIds, programs, programId, can } = usePortal();
  const [prospects, setProspects] = useState<ProspectOverview[] | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProspects(null);
    Promise.all([
      api.listProspects(scopeProgramIds),
      api.listInvitations({ programIds: scopeProgramIds, limit: 1000 }),
      api.recentEvents(40),
    ]).then(([p, i, f]) => { setProspects(p); setInvites(i); setFeed(f as FeedItem[]); })
      .catch((e) => setError(e.message));
  }, [scopeProgramIds]);

  const athleteInvites = useMemo(() => invites.filter((i) => i.recipient_type === 'athlete' && i.reminder_of === null), [invites]);
  const funnel = useMemo(() => {
    const invited = new Set(athleteInvites.filter((i) => !['blocked', 'cancelled', 'rejected'].includes(i.status)).map((i) => i.prospect_id));
    const reached = new Set(athleteInvites.filter((i) => ['delivered', 'clicked', 'replied', 'started', 'completed'].includes(i.status)).map((i) => i.prospect_id));
    const opened = new Set(athleteInvites.filter((i) => ['clicked', 'replied', 'started', 'completed'].includes(i.status)).map((i) => i.prospect_id));
    const started = (prospects ?? []).filter((p) => p.athlete_status === 'in_progress' || p.athlete_status === 'complete').length;
    const briefs = (prospects ?? []).filter((p) => p.brief_status === 'ready').length;
    return { total: prospects?.length ?? 0, invited: invited.size, reached: reached.size, opened: opened.size, started, briefs };
  }, [athleteInvites, prospects]);

  const attention = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const problem = invites.filter((i) => ['failed', 'blocked', 'pending_approval'].includes(i.status));
    const stalled = athleteInvites.filter((i) => ['sent', 'delivered'].includes(i.status) && i.sent_at && new Date(i.sent_at).getTime() < weekAgo);
    return [...problem, ...stalled].slice(0, 8);
  }, [invites, athleteInvites]);

  const prospectName = useMemo(() => new Map((prospects ?? []).map((p) => [p.id, `${p.preferred_name ?? p.first_name} ${p.last_name}`])), [prospects]);
  const scopedFeed = feed.filter((f) => f.portal_invitations && scopeProgramIds.includes(f.portal_invitations.program_id)).slice(0, 12);
  const briefsReady = (prospects ?? []).filter((p) => p.brief_status === 'ready').slice(0, 6);
  const scopeName = programId ? programName(programs.find((p) => p.id === programId)!) : programs.length === 1 ? programName(programs[0]) : 'All programs';

  if (error) return <ErrorNote message={error} />;
  if (!prospects) return <Spinner />;

  const pct = (n: number) => (funnel.invited ? `${Math.round((n / funnel.invited) * 100)}% of invited` : undefined);

  return (
    <div>
      <PageHeader eyebrow={scopeName} title={staff ? `Welcome, ${staff.first_name}.` : 'Dashboard'}
        subtitle="Where every prospect stands with VEKT, from invitation to finished brief."
        actions={can('invite') ? <ButtonLink to="/portal/prospects" variant="primary">Invite prospects</ButtonLink> : undefined} />

      <Panel className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 p-6 sm:p-8">
          <Stat label="Invited" value={funnel.invited} sub={`of ${funnel.total} prospects`} />
          <Stat label="Delivered" value={funnel.reached} sub={pct(funnel.reached)} />
          <Stat label="Opened link" value={funnel.opened} sub={pct(funnel.opened)} />
          <Stat label="Conversation started" value={funnel.started} sub={pct(funnel.started)} />
          <Stat label="Briefs ready" value={funnel.briefs} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelTitle action={<Link to="/portal/invitations" className="text-sm text-vekt-grey hover:text-white">All invitations</Link>}>Needs attention</PanelTitle>
          {attention.length === 0 ? <Empty title="Nothing needs you right now" /> : (
            <ul>
              {attention.map((i) => (
                <li key={i.id} className="border-b border-white/[0.06] last:border-0">
                  <Link to={`/portal/prospects/${i.prospect_id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-white/[0.02]">
                    <span className="min-w-0">
                      <span className="text-sm text-white">{i.recipient_name}</span>
                      <span className="block text-xs text-vekt-grey">
                        {i.status_detail ?? (i.status === 'sent' || i.status === 'delivered' ? `No response since ${relativeTime(i.sent_at)}` : recipientLabel[i.recipient_type])}
                      </span>
                    </span>
                    <StatusBadge status={i.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelTitle>Briefs ready</PanelTitle>
          {briefsReady.length === 0 ? <Empty title="No briefs yet" hint="Briefs appear when VEKT finishes the athlete and club director conversations." /> : (
            <ul>
              {briefsReady.map((p) => (
                <li key={p.id} className="border-b border-white/[0.06] last:border-0">
                  <Link to={`/portal/prospects/${p.id}`} className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-white/[0.02]">
                    <span>
                      <span className="text-sm text-white">{p.preferred_name ?? p.first_name} {p.last_name}</span>
                      <span className="block text-xs text-vekt-grey">{p.positions.join(' / ')}{p.grad_year ? ` · Class of ${p.grad_year}` : ''}</span>
                    </span>
                    <span className="text-sm text-white">Read brief →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelTitle>Recent activity</PanelTitle>
          {scopedFeed.length === 0 ? <Empty title="No activity yet" /> : (
            <ul>
              {scopedFeed.map((f) => (
                <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-3 border-b border-white/[0.06] last:border-0 text-sm">
                  <span>
                    <span className="text-white">{eventLabel[f.event] ?? f.event}</span>
                    <span className="text-vekt-grey"> · {f.portal_invitations?.recipient_name}
                      {f.portal_invitations?.recipient_type !== 'athlete' && f.portal_invitations
                        ? ` (${recipientLabel[f.portal_invitations.recipient_type]} for ${prospectName.get(f.portal_invitations.prospect_id) ?? 'prospect'})` : ''}
                      {f.portal_invitations ? ` · ${f.portal_invitations.channel === 'sms' ? 'Text' : 'Email'}` : ''}</span>
                  </span>
                  <span className="text-xs text-vekt-grey">{relativeTime(f.occurred_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
