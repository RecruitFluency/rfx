export type { FitReport, Match, MustHave, SelfAwarenessLevel, SideBySideReport, TraitRead, Verdict } from "../../../supabase/functions/_shared/report.ts";
import type { FitReport, SelfAwarenessLevel, SideBySideReport } from "../../../supabase/functions/_shared/report.ts";

export type Role = "head_coach" | "assistant_coach" | "dept_admin" | "compliance" | "vekt_admin";
export interface Program { id: string; institution: string; sport: string; division: string | null; team_gender: "men" | "women" | null; licensed: boolean; coach_name: string | null }
export interface Me {
  account: { id: string; first_name: string; last_name: string; title: string | null; email: string; role: Role };
  department: { id: string; name: string; division: string | null; conference: string | null; license_type: string; license_start: string | null; license_end: string | null } | null;
  programs: Program[];
  can: { write: boolean; settings: boolean; department: boolean; compliance: boolean };
}
export type StageKey = "interested" | "not_a_fit" | "read_ready" | "read_partial" | "waiting_director" | "writing" | "held" | "not_invited" | "waiting_parent" | "approved";
export interface RecruitRow {
  id: string; recruit_name: string; position: string | null; grad_year: number | null; club_or_school: string | null; club_level: string | null;
  state: string | null; gpa: number | null; priority: "A" | "B" | "C"; source: string; decision: "interested" | "not_a_fit" | null;
  club_coach_name: string | null; created_at: string; updated_at: string; reminders_sent: number;
  has_athlete_contact: boolean; has_parent_contact: boolean; has_club_contact: boolean;
  stage: { key: StageKey; label: string };
  self_awareness: { level: SelfAwarenessLevel; label: string; same_story: number; covered: number } | null;
  headline: string | null; must_haves_missed: number | null;
}
export interface InviteEvent { id: string; recruit_id?: string; recruit_name?: string | null; recipient_role: string | null; channel: string | null; status: string; detail?: string | null; recipient?: string | null; created_at: string }
export interface RecruitDetail {
  recruit: Record<string, any> & { id: string; recruit_name: string; stage: { key: StageKey; label: string }; consented: boolean };
  program: { institution: string; sport: string; division: string | null; team_gender: string | null };
  fit_read: { id: string; report: FitReport | null; fit_narrative: string | null; verification_level: string | null; updated_at: string } | null;
  events: InviteEvent[];
  season_checks: { id: string; season: string | null; read_held_up: string; still_on_roster: boolean | null; what_we_missed: string | null; created_at: string }[];
}
export interface SideBySideRow { id: string; position: string | null; recruit_ids: string[]; status: "pending" | "ready" | "error"; created_at: string; names: string[] }
export interface SideBySideDetail {
  side_by_side: { id: string; position: string | null; status: "pending" | "ready" | "error"; error: string | null; report: (SideBySideReport & { waiting?: boolean }) | null; created_at: string };
  athletes: (RecruitRow & { report: FitReport | null })[];
  staff: { name: string; title: string | null; traits: string[] }[];
}
export interface Staff { id: string; name: string; title: string | null; focus: string | null; feedback_style: string | null; motivation_style: string | null; closeness_style: string | null; setbacks_style: string | null; traits: string[]; sort_order: number }
