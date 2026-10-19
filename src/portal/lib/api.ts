// Data access for the Coach Portal. Every query runs as the signed-in user,
// so row-level security decides what comes back; writes that matter go
// through server-side RPCs that enforce the send rules.
import { db } from '../../lib/supabase';
import type {
  AuditEntry, Brief, ClubContact, CoachStyleProfile, ContactRule, Department, ImportResult, Invitation,
  MessageEvent, Notification, Program, Prospect, ProspectOverview, QueueResult, Staff,
} from './types';

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---- Auth & context --------------------------------------------------------

export async function claimStaff(): Promise<Staff | null> {
  const staff = unwrap(await db().rpc('portal_claim_staff')) as Staff | null;
  return staff?.id ? staff : null;
}

export async function isSuperAdmin(): Promise<boolean> {
  const { data } = await db().from('portal_super_admins').select('user_id').limit(1);
  return (data ?? []).length > 0;
}

export async function myStaffPrograms(staffId: string): Promise<string[]> {
  const rows = unwrap(await db().from('portal_staff_programs').select('program_id').eq('staff_id', staffId));
  return (rows as { program_id: string }[]).map((r) => r.program_id);
}

export async function listDepartments(): Promise<Department[]> {
  return unwrap(await db().from('portal_departments').select('*').order('name')) as Department[];
}

export async function listPrograms(): Promise<Program[]> {
  return unwrap(await db().from('portal_programs').select('*').order('sport').order('gender')) as Program[];
}

export async function listStaff(departmentId: string): Promise<Staff[]> {
  return unwrap(await db().from('portal_staff').select('*').eq('department_id', departmentId).order('last_name')) as Staff[];
}

export async function listStaffPrograms(): Promise<{ staff_id: string; program_id: string }[]> {
  return unwrap(await db().from('portal_staff_programs').select('*')) as { staff_id: string; program_id: string }[];
}

export async function pricing(): Promise<Record<string, number>> {
  const rows = unwrap(await db().from('portal_pricing').select('key, amount_cents')) as { key: string; amount_cents: number }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.amount_cents]));
}

// ---- Prospects --------------------------------------------------------------

export async function listProspects(programIds: string[]): Promise<ProspectOverview[]> {
  if (programIds.length === 0) return [];
  return unwrap(await db().from('portal_prospect_overview').select('*').in('program_id', programIds)
    .order('last_name').order('first_name')) as ProspectOverview[];
}

export async function getProspect(id: string): Promise<ProspectOverview | null> {
  return unwrap(await db().from('portal_prospect_overview').select('*').eq('id', id).maybeSingle()) as ProspectOverview | null;
}

export type ProspectInput = Partial<Omit<Prospect, 'id' | 'created_at' | 'updated_at'>> & { program_id: string };

export async function saveProspect(input: ProspectInput, id?: string): Promise<Prospect> {
  const q = id
    ? db().from('portal_prospects').update(input).eq('id', id).select().single()
    : db().from('portal_prospects').insert({ ...input, source: 'manual' }).select().single();
  const { data, error } = await q;
  if (error) {
    if (error.code === '23505') throw new Error('A prospect with this mobile number or email already exists in this program.');
    if (error.code === '23514') throw new Error('Check the phone numbers: use a full number with area code.');
    throw new Error(error.message);
  }
  return data as Prospect;
}

export async function deleteProspect(id: string): Promise<void> {
  unwrap(await db().rpc('portal_delete_prospect', { p_prospect_id: id }));
}

export async function importProspects(programId: string, rows: Record<string, unknown>[]): Promise<ImportResult> {
  return unwrap(await db().rpc('portal_import_prospects', { p_program_id: programId, p_rows: rows })) as ImportResult;
}

// ---- Club contacts ----------------------------------------------------------

export async function listClubContacts(programIds: string[]): Promise<ClubContact[]> {
  if (programIds.length === 0) return [];
  return unwrap(await db().from('portal_club_contacts').select('*').in('program_id', programIds).order('last_name')) as ClubContact[];
}

export async function prospectClubContacts(prospectId: string): Promise<ClubContact[]> {
  const rows = unwrap(await db().from('portal_prospect_club_contacts')
    .select('portal_club_contacts(*)').eq('prospect_id', prospectId)) as unknown as { portal_club_contacts: ClubContact }[];
  return rows.map((r) => r.portal_club_contacts).filter(Boolean);
}

export async function saveClubContact(input: Omit<ClubContact, 'id'>): Promise<ClubContact> {
  const { data, error } = await db().from('portal_club_contacts').insert(input).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('A club contact with this mobile number already exists. Pick them from the list.');
    throw new Error(error.message);
  }
  return data as ClubContact;
}

export async function linkClubContact(prospectId: string, clubContactId: string): Promise<void> {
  unwrap(await db().from('portal_prospect_club_contacts').upsert({ prospect_id: prospectId, club_contact_id: clubContactId }));
}

export async function unlinkClubContact(prospectId: string, clubContactId: string): Promise<void> {
  unwrap(await db().from('portal_prospect_club_contacts').delete()
    .eq('prospect_id', prospectId).eq('club_contact_id', clubContactId));
}

// ---- Invitations ------------------------------------------------------------

export interface QueueOptions {
  prospectIds: string[];
  channels: ('sms' | 'email')[];
  includeAthlete: boolean;
  includeClub: boolean;
  personalNote?: string;
  scheduledFor?: string | null;
  force?: boolean;
  dryRun?: boolean;
}

export async function queueInvitations(o: QueueOptions): Promise<QueueResult> {
  return unwrap(await db().rpc('portal_queue_invitations', {
    p_prospect_ids: o.prospectIds, p_channels: o.channels, p_include_athlete: o.includeAthlete,
    p_include_club: o.includeClub, p_personal_note: o.personalNote ?? null, p_scheduled_for: o.scheduledFor ?? null,
    p_force: o.force ?? false, p_dry_run: o.dryRun ?? false,
  })) as QueueResult;
}

export async function cancelInvitation(id: string): Promise<void> {
  unwrap(await db().rpc('portal_cancel_invitation', { p_invitation_id: id }));
}

export async function resendInvitation(id: string): Promise<QueueResult> {
  return unwrap(await db().rpc('portal_resend_invitation', { p_invitation_id: id })) as QueueResult;
}

export async function reviewInvitation(id: string, decision: 'approve' | 'reject' | 'release', reason?: string): Promise<void> {
  unwrap(await db().rpc('portal_review_invitation', { p_invitation_id: id, p_decision: decision, p_reason: reason ?? null }));
}

export async function listInvitations(opts: { programIds?: string[]; prospectId?: string; statuses?: string[]; limit?: number }): Promise<Invitation[]> {
  let q = db().from('portal_invitations').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 500);
  if (opts.programIds) q = q.in('program_id', opts.programIds);
  if (opts.prospectId) q = q.eq('prospect_id', opts.prospectId);
  if (opts.statuses) q = q.in('status', opts.statuses);
  return unwrap(await q) as Invitation[];
}

export async function listEvents(invitationIds: string[]): Promise<MessageEvent[]> {
  if (invitationIds.length === 0) return [];
  return unwrap(await db().from('portal_message_events').select('*').in('invitation_id', invitationIds)
    .order('occurred_at')) as MessageEvent[];
}

export async function recentEvents(limit = 25): Promise<(MessageEvent & { portal_invitations: Pick<Invitation, 'recipient_name' | 'recipient_type' | 'channel' | 'prospect_id' | 'program_id'> | null })[]> {
  return unwrap(await db().from('portal_message_events')
    .select('*, portal_invitations(recipient_name, recipient_type, channel, prospect_id, program_id)')
    .order('occurred_at', { ascending: false }).limit(limit)) as never;
}

// ---- Reads, briefs, notifications --------------------------------------------

export async function latestBrief(prospectId: string): Promise<Brief | null> {
  return unwrap(await db().from('portal_briefs').select('*').eq('prospect_id', prospectId)
    .order('version', { ascending: false }).limit(1).maybeSingle()) as Brief | null;
}

export async function listNotifications(): Promise<Notification[]> {
  return unwrap(await db().from('portal_notifications').select('*').order('created_at', { ascending: false }).limit(20)) as Notification[];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  unwrap(await db().from('portal_notifications').update({ read_at: new Date().toISOString() }).in('id', ids));
}

// ---- Program settings ---------------------------------------------------------

export async function getStyleProfile(programId: string): Promise<CoachStyleProfile | null> {
  return unwrap(await db().from('portal_coach_style_profiles').select('*').eq('program_id', programId).maybeSingle()) as CoachStyleProfile | null;
}

export async function saveStyleProfile(p: Omit<CoachStyleProfile, 'updated_at'>, staffId: string): Promise<void> {
  unwrap(await db().from('portal_coach_style_profiles').upsert({ ...p, updated_by: staffId, updated_at: new Date().toISOString() }));
}

export async function updateReminderDays(programId: string, days: number[]): Promise<void> {
  unwrap(await db().rpc('portal_update_program_settings', { p_program_id: programId, p_reminder_days: days }));
}

// ---- Department & compliance ---------------------------------------------------

export async function setApprovalMode(departmentId: string, on: boolean): Promise<void> {
  unwrap(await db().rpc('portal_set_approval_mode', { p_department_id: departmentId, p_on: on }));
}

export async function listContactRules(): Promise<ContactRule[]> {
  return unwrap(await db().from('portal_contact_rules').select('*').order('division').order('sport', { nullsFirst: true })) as ContactRule[];
}

export async function saveContactRule(rule: Omit<ContactRule, 'id'>, id?: string, staffId?: string): Promise<void> {
  const row = { ...rule, updated_by: staffId ?? null, updated_at: new Date().toISOString() };
  unwrap(id
    ? await db().from('portal_contact_rules').update(row).eq('id', id)
    : await db().from('portal_contact_rules').insert(row));
}

export async function deleteContactRule(id: string): Promise<void> {
  unwrap(await db().from('portal_contact_rules').delete().eq('id', id));
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  return unwrap(await db().from('portal_audit_log').select('*').order('created_at', { ascending: false }).limit(limit)) as AuditEntry[];
}
