import { db } from './supabase';
import {
  Coach, CoachHistoryEntry, CoachNote, EmailLog, Program,
  ReviewItem, StagedRow, SyncBatch, SyncStats,
} from './types';

const CHUNK_SIZE = 500;

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

/**
 * Live install status of each database component, so Settings can show
 * exactly what's missing instead of guessing.
 */
export interface SetupStatus {
  schema: boolean;      // 0001 — core tables + sync engine
  multisport: boolean;  // 0002 — per-sport sync scoping
  watchtower: boolean;  // 0003 — daily alert agent
  radar: boolean;       // 0004+ — news radar
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const client = db();
  const probe = async (q: PromiseLike<{ error: unknown }>) => !(await q).error;
  const [schema, multisport, watchtower, radar] = await Promise.all([
    probe(client.from('coaches').select('id', { head: true }).limit(1)),
    probe(client.from('sync_batches').select('sport', { head: true }).limit(1)),
    probe(client.from('alerts').select('id', { head: true }).limit(1)),
    probe(client.from('radar_items').select('id', { head: true }).limit(1)),
  ]);
  return { schema, multisport, watchtower, radar };
}

let multisportCache: boolean | null = null;

/**
 * True once migration 0002 (per-sport sync scoping) has been run — detected
 * by whether sync_batches has a `sport` column.
 */
export async function multisportReady(): Promise<boolean> {
  if (multisportCache !== null) return multisportCache;
  const { error } = await db().from('sync_batches').select('sport', { head: true }).limit(1);
  multisportCache = !error;
  return multisportCache;
}

/**
 * Whether a baseline exists for the given sport. A batch with no sport tag
 * covers every sport, so it counts as a baseline for all of them.
 */
export async function hasBaseline(sport?: string): Promise<boolean> {
  let query = db()
    .from('sync_batches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['completed', 'needs_review']);
  if (sport && (await multisportReady())) {
    query = query.or(`sport.is.null,sport.eq.${sport.replace(/[,()]/g, ' ')}`);
  }
  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createBatch(
  fileName: string,
  isBaseline: boolean,
  rowCount: number,
  sport?: string
): Promise<SyncBatch> {
  const record: Record<string, unknown> = { file_name: fileName, is_baseline: isBaseline, row_count: rowCount };
  if (sport && (await multisportReady())) record.sport = sport;
  const { data, error } = await db().from('sync_batches').insert(record).select().single();
  if (error) throw error;
  return data as SyncBatch;
}

export async function uploadStagingRows(
  batchId: string,
  rows: StagedRow[],
  onProgress: (uploaded: number) => void
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE).map((r) => ({ ...r, batch_id: batchId }));
    const { error } = await db().from('staging_rows').insert(chunk);
    if (error) throw error;
    onProgress(Math.min(i + CHUNK_SIZE, rows.length));
  }
}

export async function processBatch(batchId: string): Promise<SyncStats> {
  const { data, error } = await db().rpc('process_sync_batch', { p_batch_id: batchId });
  if (error) throw error;
  return data as SyncStats;
}

export async function listBatches(limit = 20): Promise<SyncBatch[]> {
  const { data, error } = await db()
    .from('sync_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SyncBatch[];
}

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export async function listReviewItems(status: ReviewItem['status'] = 'pending'): Promise<ReviewItem[]> {
  const { data, error } = await db()
    .from('review_items')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ReviewItem[];
}

export async function pendingReviewCount(): Promise<number> {
  const { count, error } = await db()
    .from('review_items')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

export async function resolveReviewItem(itemId: string, approve: boolean): Promise<void> {
  const { error } = await db().rpc('resolve_review_item', { p_item_id: itemId, p_approve: approve });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

export interface CoachQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  sport?: string;
  division?: string;
  /** Only coaches where this contact field is empty (data-gap drill-down). */
  missing?: 'email' | 'phone' | 'school' | 'sport';
  /** Only coaches not seen in a vendor file for this many days. */
  staleDays?: number;
  page?: number;
  pageSize?: number;
}

export async function listCoaches(q: CoachQuery): Promise<{ coaches: Coach[]; total: number }> {
  const pageSize = q.pageSize ?? 50;
  const page = q.page ?? 0;
  let query = db().from('coaches').select('*', { count: 'exact' });

  if (q.status && q.status !== 'all') query = query.eq('status', q.status);
  if (q.sport) query = query.eq('sport', q.sport);
  if (q.division) query = query.eq('division', q.division);
  if (q.missing) query = query.is(q.missing, null);
  if (q.staleDays) {
    query = query.lt('last_seen_at', new Date(Date.now() - q.staleDays * 24 * 60 * 60 * 1000).toISOString());
  }
  if (q.search) {
    const s = q.search.replace(/[%,()]/g, ' ').trim();
    if (s) {
      query = query.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,school.ilike.%${s}%`
      );
    }
  }

  const { data, count, error } = await query
    .order('last_name')
    .order('first_name')
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return { coaches: (data ?? []) as Coach[], total: count ?? 0 };
}

export async function getCoach(id: string): Promise<Coach> {
  const { data, error } = await db().from('coaches').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Coach;
}

export async function getCoachHistory(coachId: string): Promise<CoachHistoryEntry[]> {
  const { data, error } = await db()
    .from('coach_history')
    .select('*')
    .eq('coach_id', coachId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CoachHistoryEntry[];
}

export async function getCoachNotes(coachId: string): Promise<CoachNote[]> {
  const { data, error } = await db()
    .from('coach_notes')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CoachNote[];
}

export async function addCoachNote(coachId: string, body: string): Promise<void> {
  const { error } = await db().from('coach_notes').insert({ coach_id: coachId, body });
  if (error) throw error;
}

export async function getEmailLogs(coachId: string): Promise<EmailLog[]> {
  const { data, error } = await db()
    .from('email_logs')
    .select('*')
    .eq('coach_id', coachId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmailLog[];
}

export async function addEmailLog(coachId: string, subject: string, direction: 'outbound' | 'inbound'): Promise<void> {
  const { error } = await db().from('email_logs').insert({ coach_id: coachId, subject, direction });
  if (error) throw error;
}

export async function listSports(): Promise<string[]> {
  const { data, error } = await db().from('coaches').select('sport').not('sport', 'is', null).limit(2000);
  if (error) throw error;
  return [...new Set((data ?? []).map((r: { sport: string }) => r.sport))].sort();
}

export async function listDivisions(): Promise<string[]> {
  const { data, error } = await db().from('coaches').select('division').not('division', 'is', null).limit(2000);
  if (error) throw error;
  return [...new Set((data ?? []).map((r: { division: string }) => r.division))].sort();
}

/** Fields Jen can set by hand (everything except system columns). */
export type CoachDraft = Pick<
  Coach,
  'first_name' | 'last_name' | 'email' | 'phone' | 'school' | 'sport' | 'title' | 'division' | 'conference' | 'state'
>;

/** Manually add a coach (between vendor files). Gets a generated RFX- ID. */
export async function createCoach(draft: CoachDraft): Promise<Coach> {
  const masterId = 'RFX-' + crypto.randomUUID().slice(0, 8);
  const { data, error } = await db()
    .from('coaches')
    .insert({ ...draft, master_id: masterId, status: 'active' })
    .select()
    .single();
  if (error) throw error;
  const coach = data as Coach;
  await db().from('coach_history').insert({
    coach_id: coach.id, change_type: 'hired',
    school: coach.school, title: coach.title, sport: coach.sport, email: coach.email,
  });
  return coach;
}

/**
 * Manually edit a coach. Logs the same history entries a sync would, so
 * hand corrections show up in the job-history timeline.
 */
export async function updateCoach(before: Coach, draft: CoachDraft): Promise<void> {
  const { error } = await db()
    .from('coaches')
    .update({ ...draft, updated_at: new Date().toISOString() })
    .eq('id', before.id);
  if (error) throw error;

  const history: Record<string, unknown>[] = [];
  if (draft.school !== before.school && draft.school) {
    history.push({
      coach_id: before.id, change_type: 'moved', school: draft.school, title: draft.title,
      sport: draft.sport, email: draft.email, previous_school: before.school, previous_title: before.title,
    });
  } else if (draft.title !== before.title && draft.title) {
    history.push({
      coach_id: before.id, change_type: 'title_change', school: before.school, title: draft.title,
      sport: draft.sport, previous_title: before.title,
    });
  }
  if (draft.email !== before.email && draft.email && before.email) {
    history.push({
      coach_id: before.id, change_type: 'email_change', school: draft.school ?? before.school,
      title: draft.title ?? before.title, email: draft.email, previous_email: before.email,
    });
  }
  if (history.length) await db().from('coach_history').insert(history);
}

/** Manually mark a coach departed or bring them back. */
export async function setCoachStatus(coach: Coach, active: boolean): Promise<void> {
  const { error } = await db()
    .from('coaches')
    .update({ status: active ? 'active' : 'inactive', updated_at: new Date().toISOString() })
    .eq('id', coach.id);
  if (error) throw error;
  await db().from('coach_history').insert(
    active
      ? { coach_id: coach.id, change_type: 'reinstated', school: coach.school, title: coach.title, sport: coach.sport }
      : { coach_id: coach.id, change_type: 'departed', previous_school: coach.school, previous_title: coach.title }
  );
}

// ---------------------------------------------------------------------------
// Coach Tracker — the movement feed
// ---------------------------------------------------------------------------

export type Movement = CoachHistoryEntry & {
  coaches: { first_name: string; last_name: string; school: string | null; sport: string | null; status: string } | null;
};

export interface MovementQuery {
  type?: CoachHistoryEntry['change_type'];
  sport?: string;
  page?: number;
  pageSize?: number;
}

export async function listMovements(q: MovementQuery): Promise<{ movements: Movement[]; total: number }> {
  const pageSize = q.pageSize ?? 50;
  const page = q.page ?? 0;
  // !inner join lets the sport filter apply to the parent history rows.
  const embed = q.sport
    ? 'coaches!inner(first_name, last_name, school, sport, status)'
    : 'coaches(first_name, last_name, school, sport, status)';
  let query = db().from('coach_history').select(`*, ${embed}`, { count: 'exact' });
  if (q.type) query = query.eq('change_type', q.type);
  if (q.sport) query = query.eq('coaches.sport', q.sport);
  const { data, count, error } = await query
    .order('changed_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return { movements: (data ?? []) as Movement[], total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Insights — patterns across the coaching landscape
// ---------------------------------------------------------------------------

export interface Insights {
  activeTotal: number;
  sportCount: number;
  programCount: number;
  /** Active coach counts, largest first. */
  bySport: { name: string; count: number }[];
  byDivision: { name: string; count: number }[];
  byState: { name: string; count: number }[];
  /** Monthly movement counts, oldest month first (last 6 months). */
  byMonth: { month: string; hired: number; moved: number; departed: number }[];
  /** Programs with the most churn (hires+moves+departures) in the last 90 days. */
  hotPrograms: { school: string; changes: number }[];
  /** True when the aggregate queries hit their row caps (numbers are lower bounds). */
  truncated: boolean;
}

function tally(rows: (string | null)[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = r?.trim() || 'Unknown';
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

const AGG_CAP = 10000;

export async function getInsights(): Promise<Insights> {
  const client = db();
  const [coachRes, histRes, programRes] = await Promise.all([
    client.from('coaches').select('sport, division, state').eq('status', 'active').limit(AGG_CAP),
    client
      .from('coach_history')
      .select('change_type, changed_at, school, previous_school')
      .order('changed_at', { ascending: false })
      .limit(AGG_CAP),
    client.from('programs').select('id', { count: 'exact', head: true }),
  ]);
  const firstError = coachRes.error ?? histRes.error ?? programRes.error;
  if (firstError) throw firstError;

  const coaches = (coachRes.data ?? []) as { sport: string | null; division: string | null; state: string | null }[];
  const hist = (histRes.data ?? []) as {
    change_type: string; changed_at: string; school: string | null; previous_school: string | null;
  }[];

  // Last 6 calendar months, oldest first.
  const months: { key: string; month: string; hired: number; moved: number; departed: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      hired: 0, moved: 0, departed: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const hotMap = new Map<string, number>();

  for (const h of hist) {
    const d = new Date(h.changed_at);
    const idx = monthIndex.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    if (idx !== undefined) {
      if (h.change_type === 'hired') months[idx].hired++;
      else if (h.change_type === 'moved') months[idx].moved++;
      else if (h.change_type === 'departed') months[idx].departed++;
    }
    if (d.getTime() >= ninetyDaysAgo && ['hired', 'moved', 'departed'].includes(h.change_type)) {
      const school = (h.school ?? h.previous_school)?.trim();
      if (school) hotMap.set(school, (hotMap.get(school) ?? 0) + 1);
    }
  }

  const bySport = tally(coaches.map((c) => c.sport));
  return {
    activeTotal: coaches.length,
    sportCount: bySport.filter((s) => s.name !== 'Unknown').length,
    programCount: programRes.count ?? 0,
    bySport,
    byDivision: tally(coaches.map((c) => c.division)),
    byState: tally(coaches.map((c) => c.state)),
    byMonth: months.map(({ month, hired, moved, departed }) => ({ month, hired, moved, departed })),
    hotPrograms: [...hotMap.entries()]
      .map(([school, changes]) => ({ school, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10),
    truncated: coaches.length === AGG_CAP || hist.length === AGG_CAP,
  };
}

// ---------------------------------------------------------------------------
// Watchtower alerts (migration 0003) — the in-database agent's output
// ---------------------------------------------------------------------------

export interface Alert {
  id: string;
  kind: 'movement_digest' | 'review_reminder' | 'stale_data' | 'mass_departure' | 'radar_news';
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/** Returns null when migration 0003 hasn't been run yet (no alerts table). */
export async function listAlerts(limit = 20): Promise<Alert[] | null> {
  const { data, error } = await db()
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return null;
  return (data ?? []) as Alert[];
}

export async function unreadAlertCount(): Promise<number> {
  const { count, error } = await db()
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAlertsRead(): Promise<void> {
  await db().from('alerts').update({ read: true }).eq('read', false);
}

/** Fire the Watchtower scan on demand (it also runs daily via pg_cron). */
export async function runWatchtower(): Promise<void> {
  const { error } = await db().rpc('run_watchtower');
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// National Radar (migration 0004) — external coaching-news monitoring
// ---------------------------------------------------------------------------

export interface RadarItem {
  id: string;
  source_id: string | null;
  title: string;
  link: string;
  published_at: string | null;
  matched_coach_id: string | null;
  status: 'new' | 'reviewed' | 'dismissed';
  created_at: string;
}

/** Returns null when migration 0004 hasn't been run yet (no radar tables). */
export async function listRadarItems(status: RadarItem['status'], limit = 100): Promise<RadarItem[] | null> {
  const { data, error } = await db()
    .from('radar_items')
    .select('*')
    .eq('status', status)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) return null;
  return (data ?? []) as RadarItem[];
}

export async function setRadarItemStatus(id: string, status: RadarItem['status']): Promise<void> {
  const { error } = await db().from('radar_items').update({ status }).eq('id', id);
  if (error) throw error;
}

/**
 * Sweep all news sources now, one call per source so each fits inside the
 * per-request statement timeout. (pg_cron sweeps everything every 6 hours.)
 */
export async function runRadarSweep(onProgress?: (done: number, total: number) => void): Promise<number> {
  const { data: sources, error } = await db().from('radar_sources').select('id').eq('enabled', true);
  if (error) throw error;
  let newItems = 0;
  const list = sources ?? [];
  for (let i = 0; i < list.length; i++) {
    const { data, error: sweepError } = await db().rpc('run_radar', { p_source_id: list[i].id });
    if (sweepError) throw sweepError;
    newItems += ((data ?? {}) as { new_items?: number }).new_items ?? 0;
    onProgress?.(i + 1, list.length);
  }
  return newItems;
}

// ---------------------------------------------------------------------------
// Export (the app feed)
// ---------------------------------------------------------------------------

export interface ExportFilters {
  sport?: string;
  division?: string;
  status?: 'active' | 'inactive' | 'all';
}

const EXPORT_PAGE = 1000;

/** Fetch every coach matching the filters (paged under the hood). */
export async function fetchAllCoaches(
  f: ExportFilters,
  onProgress?: (fetched: number) => void
): Promise<Coach[]> {
  const all: Coach[] = [];
  for (let page = 0; ; page++) {
    let query = db().from('coaches').select('*');
    if (f.status && f.status !== 'all') query = query.eq('status', f.status);
    if (f.sport) query = query.eq('sport', f.sport);
    if (f.division) query = query.eq('division', f.division);
    const { data, error } = await query
      .order('last_name')
      .order('first_name')
      .range(page * EXPORT_PAGE, page * EXPORT_PAGE + EXPORT_PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Coach[];
    all.push(...rows);
    onProgress?.(all.length);
    if (rows.length < EXPORT_PAGE) return all;
  }
}

// ---------------------------------------------------------------------------
// Data health — is this list clean enough to push to the app?
// ---------------------------------------------------------------------------

export interface DataHealth {
  activeTotal: number;
  missingEmail: number;
  missingSchool: number;
  missingSport: number;
  stale: number;
  duplicateEmails: { email: string; count: number }[];
  staleCutoffIso: string;
}

const STALE_DAYS = 60;

export async function getDataHealth(): Promise<DataHealth> {
  const client = db();
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const active = () => client.from('coaches').select('id', { count: 'exact', head: true }).eq('status', 'active');

  const [total, noEmail, noSchool, noSport, stale, emails] = await Promise.all([
    active(),
    active().is('email', null),
    active().is('school', null),
    active().is('sport', null),
    active().lt('last_seen_at', cutoff),
    client.from('coaches').select('email').eq('status', 'active').not('email', 'is', null).limit(10000),
  ]);
  const firstError = total.error ?? noEmail.error ?? noSchool.error ?? noSport.error ?? stale.error ?? emails.error;
  if (firstError) throw firstError;

  const counts = new Map<string, number>();
  for (const r of (emails.data ?? []) as { email: string }[]) {
    const e = r.email.toLowerCase();
    counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  const duplicateEmails = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return {
    activeTotal: total.count ?? 0,
    missingEmail: noEmail.count ?? 0,
    missingSchool: noSchool.count ?? 0,
    missingSport: noSport.count ?? 0,
    stale: stale.count ?? 0,
    duplicateEmails,
    staleCutoffIso: cutoff,
  };
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export async function listPrograms(search?: string, page = 0, pageSize = 50): Promise<{ programs: Program[]; total: number }> {
  let query = db().from('programs').select('*', { count: 'exact' });
  if (search) {
    const s = search.replace(/[%,()]/g, ' ').trim();
    if (s) query = query.or(`school.ilike.%${s}%,sport.ilike.%${s}%,conference.ilike.%${s}%`);
  }
  const { data, count, error } = await query
    .order('school')
    .order('sport')
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return { programs: (data ?? []) as Program[], total: count ?? 0 };
}

export async function getProgram(id: string): Promise<Program> {
  const { data, error } = await db().from('programs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Program;
}

export async function updateProgram(id: string, fields: Partial<Program>): Promise<void> {
  const { error } = await db().from('programs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function getProgramRoster(school: string, sport: string): Promise<Coach[]> {
  const { data, error } = await db()
    .from('coaches')
    .select('*')
    .eq('school', school)
    .eq('sport', sport)
    .eq('status', 'active')
    .order('last_name');
  if (error) throw error;
  return (data ?? []) as Coach[];
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export interface DashboardStats {
  activeCoaches: number;
  inactiveCoaches: number;
  programs: number;
  pendingReviews: number;
  lastBatch: SyncBatch | null;
  recentChanges: (CoachHistoryEntry & { coaches: { first_name: string; last_name: string } | null })[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const client = db();
  const [active, inactive, programs, pending, batches, changes] = await Promise.all([
    client.from('coaches').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.from('coaches').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
    client.from('programs').select('id', { count: 'exact', head: true }),
    client.from('review_items').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('sync_batches').select('*').order('created_at', { ascending: false }).limit(1),
    client
      .from('coach_history')
      .select('*, coaches(first_name, last_name)')
      .order('changed_at', { ascending: false })
      .limit(10),
  ]);

  const firstError = active.error ?? inactive.error ?? programs.error ?? pending.error ?? batches.error ?? changes.error;
  if (firstError) throw firstError;

  return {
    activeCoaches: active.count ?? 0,
    inactiveCoaches: inactive.count ?? 0,
    programs: programs.count ?? 0,
    pendingReviews: pending.count ?? 0,
    lastBatch: (batches.data?.[0] as SyncBatch) ?? null,
    recentChanges: (changes.data ?? []) as DashboardStats['recentChanges'],
  };
}
