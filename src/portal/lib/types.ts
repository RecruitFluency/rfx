// Row types for the VEKT Coach Portal tables (supabase/migrations/0002).

export type StaffRole = 'dept_admin' | 'head_coach' | 'assistant_coach' | 'compliance';
export type Channel = 'sms' | 'email';
export type RecipientType = 'athlete' | 'guardian' | 'club_contact';
export type InvitationStatus =
  | 'pending_approval' | 'queued' | 'sending' | 'sent' | 'delivered' | 'clicked' | 'replied'
  | 'started' | 'completed' | 'failed' | 'blocked' | 'cancelled' | 'rejected' | 'opted_out';

export interface Department {
  id: string;
  name: string;
  division: string;
  conference: string | null;
  time_zone: string;
  license_type: 'all_sports' | 'per_sport';
  license_start: string | null;
  license_end: string | null;
  billing_status: 'trial' | 'invoiced' | 'paid' | 'overdue';
  approval_mode: boolean;
  contact_rule_mode: 'enforce' | 'warn';
  retention_days: number;
}

export interface Program {
  id: string;
  department_id: string;
  sport: string;
  gender: 'mens' | 'womens' | 'coed';
  licensed: boolean;
  reminder_days: number[];
}

export interface Staff {
  id: string;
  user_id: string | null;
  department_id: string;
  role: StaffRole;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string;
  phone: string | null;
  active: boolean;
}

export interface Prospect {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  mobile: string | null;
  email: string | null;
  grad_year: number | null;
  dob: string | null;
  positions: string[];
  high_school: string | null;
  club_team: string | null;
  club_level: string | null;
  city: string | null;
  state: string | null;
  film_links: string[];
  gpa: number | null;
  guardian_name: string | null;
  guardian_mobile: string | null;
  guardian_email: string | null;
  guardian_relationship: string | null;
  priority: 'A' | 'B' | 'C';
  tags: string[];
  notes: string | null;
  source: 'manual' | 'csv' | 'api';
  created_at: string;
  updated_at: string;
}

export interface ProspectOverview extends Prospect {
  athlete_status: 'not_started' | 'invited' | 'in_progress' | 'complete' | null;
  director_status: 'not_started' | 'invited' | 'in_progress' | 'complete' | null;
  brief_status: 'none' | 'in_progress' | 'ready' | null;
  brief_id: string | null;
  last_invite_status: InvitationStatus | null;
  last_invited_at: string | null;
  last_invite_channel: Channel | null;
  invites_sent: number;
  club_contacts: number;
}

export interface ClubContact {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  role: 'club_director' | 'club_coach';
  club: string | null;
  mobile: string | null;
  email: string | null;
}

export interface Invitation {
  id: string;
  batch_id: string | null;
  program_id: string;
  prospect_id: string;
  recipient_type: RecipientType;
  club_contact_id: string | null;
  recipient_name: string;
  to_phone: string | null;
  to_email: string | null;
  channel: Channel;
  rendered_subject: string | null;
  rendered_body: string;
  personal_note: string | null;
  scheduled_for: string;
  status: InvitationStatus;
  status_detail: string | null;
  sent_by: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  clicked_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  reminder_of: string | null;
  reminder_number: number;
  approved_by: string | null;
  approved_at: string | null;
  compliance_override: boolean;
  override_reason: string | null;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
}

export interface MessageEvent {
  id: string;
  invitation_id: string | null;
  event: string;
  provider: 'system' | 'ghl' | 'agent';
  detail: string | null;
  occurred_at: string;
}

export interface Brief {
  id: string;
  prospect_id: string;
  program_id: string;
  version: number;
  plays: string | null;
  takes_coaching: string | null;
  locker_room: string | null;
  against_staff: string | null;
  summary: string | null;
  created_at: string;
}

export interface CoachStyleProfile {
  program_id: string;
  coaching_style: string | null;
  accountability: string | null;
  culture: string | null;
  locker_room: string | null;
  updated_at: string;
}

export interface ContactRule {
  id: string;
  department_id: string | null;
  division: string;
  sport: string | null;
  gender: 'mens' | 'womens' | 'coed' | null;
  years_before_grad: number;
  permitted_month: number;
  permitted_day: number;
  verified: boolean;
  source_note: string | null;
}

export interface AuditEntry {
  id: number;
  department_id: string | null;
  actor_staff_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface QueueResult {
  batch_id: string | null;
  queued: number;
  blocked: number;
  dry_run: boolean;
  results: {
    invitation_id: string | null;
    prospect_id: string;
    prospect_name: string;
    recipient_type: RecipientType;
    recipient_name: string;
    channel: Channel;
    to: string | null;
    status: InvitationStatus;
    reason: string | null;
    scheduled_for: string;
    subject: string | null;
    body: string;
  }[];
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  rows: { row: number; status: 'imported' | 'duplicate' | 'error'; prospect_id?: string; error?: string }[];
}
