import type { ProspectOverview } from '../lib/types';
import { Badge, StatusBadge } from './ui';

/** One badge summarizing where a prospect stands with VEKT. */
export default function ReadStatus({ p }: { p: ProspectOverview }) {
  if (p.brief_status === 'ready') return <Badge tone="done">Brief ready</Badge>;
  if (p.athlete_status === 'in_progress' || p.brief_status === 'in_progress') return <Badge tone="progress">Read in progress</Badge>;
  if (p.last_invite_status) return <StatusBadge status={p.last_invite_status} />;
  return <Badge>Not invited</Badge>;
}
