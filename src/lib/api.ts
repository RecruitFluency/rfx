import { db } from './supabase';
import {
  Coach, CoachHistoryEntry, CoachNote, EmailLog, Program,
  ReviewItem, StagedRow, SyncBatch, SyncStats,
} from './types';

const CHUNK_SIZE = 500;

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

export async function hasBaseline(): Promise<boolean> {
  const { count, error } = await db()
    .from('sync_batches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['completed', 'needs_review']);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createBatch(fileName: string, isBaseline: boolean, rowCount: number): Promise<SyncBatch> {
  const { data, error } = await db()
    .from('sync_batches')
    .insert({ file_name: fileName, is_baseline: isBaseline, row_count: rowCount })
    .select()
    .single();
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
  page?: number;
  pageSize?: number;
}

export async function listCoaches(q: CoachQuery): Promise<{ coaches: Coach[]; total: number }> {
  const pageSize = q.pageSize ?? 50;
  const page = q.page ?? 0;
  let query = db().from('coaches').select('*', { count: 'exact' });

  if (q.status && q.status !== 'all') query = query.eq('status', q.status);
  if (q.sport) query = query.eq('sport', q.sport);
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
