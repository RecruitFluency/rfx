export interface Coach {
  id: string;
  master_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  school: string | null;
  sport: string | null;
  title: string | null;
  division: string | null;
  conference: string | null;
  state: string | null;
  landing_page: string | null;
  status: 'active' | 'inactive';
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface CoachHistoryEntry {
  id: string;
  coach_id: string;
  change_type: 'hired' | 'moved' | 'title_change' | 'email_change' | 'departed' | 'reinstated' | 'merged';
  school: string | null;
  title: string | null;
  sport: string | null;
  email: string | null;
  previous_school: string | null;
  previous_title: string | null;
  previous_email: string | null;
  batch_id: string | null;
  changed_at: string;
}

export interface CoachNote {
  id: string;
  coach_id: string;
  body: string;
  author: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  coach_id: string;
  subject: string;
  direction: 'outbound' | 'inbound';
  notes: string | null;
  sent_at: string;
}

export interface Program {
  id: string;
  school: string;
  sport: string;
  division: string | null;
  conference: string | null;
  state: string | null;
  enrollment: number | null;
  tuition: number | null;
  acceptance_rate: number | null;
  sat_range: string | null;
  avg_gpa: number | null;
  academic_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncBatch {
  id: string;
  file_name: string;
  is_baseline: boolean;
  /** Sport this file covers; null/undefined = all sports (pre-0002 batches too). */
  sport?: string | null;
  row_count: number;
  status: 'uploading' | 'processing' | 'needs_review' | 'completed' | 'failed';
  stats: SyncStats;
  error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface SyncStats {
  added?: number;
  updated?: number;
  moved?: number;
  departed?: number;
  unchanged?: number;
  reinstated?: number;
  queued_for_review?: number;
  mass_departure_flagged?: boolean;
}

export interface ReviewItem {
  id: string;
  batch_id: string | null;
  coach_id: string | null;
  item_type: 'identity_conflict' | 'mass_departure' | 'duplicate_id' | 'missing_id';
  summary: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  resolved_at: string | null;
  created_at: string;
}

/** A normalized row parsed out of a vendor spreadsheet. */
export interface StagedRow {
  master_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  school: string | null;
  sport: string | null;
  title: string | null;
  division: string | null;
  conference: string | null;
  state: string | null;
  landing_page: string | null;
}
