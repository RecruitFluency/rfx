// vekt-coach: the API behind the college coach dashboard.
//
// POST { "action": "...", ... } with Authorization: Bearer <Supabase session token>.
// The token's email must belong to an active coach_accounts row (provisioned by
// VEKT or the department admin). Every query is scoped to that coach's programs:
//   head_coach / assistant_coach  their assigned programs
//   dept_admin / compliance       every program in their department
//   vekt_admin                    everything
// compliance is read-only. All tables stay RLS-on with no policies; this
// function uses the service role and does the scoping itself. Writes are
// recorded in vekt_audit_log. Conversation answers (scenario_responses) are
// never returned: coaches see the Fit Read, not a minor's words.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sportFor, videoKinds } from "../_shared/sports.ts";
import { contactOpens } from "../_shared/contact.ts";
import { D1_HOUSE_LIMITS, fillsNeed, LIMITS_SOURCE, rosterPlan } from "../_shared/roster.ts";
import { measurablesTable, skillsRead, systemsFit } from "../_shared/profile.ts";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("VEKT_COACH_APP_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
class HttpError extends Error { constructor(readonly status: number, msg: string) { super(msg); } }
const fail = (status: number, msg: string): never => { throw new HttpError(status, msg); };

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const s = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : v == null ? "" : String(v).trim().slice(0, max));
const opt = (v: unknown, max = 300) => s(v, max) || null;
const email = (v: unknown) => { const e = s(v, 200).toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null; };
const phone = (v: unknown) => {
  const d = s(v, 40).replace(/[^\d+]/g, "");
  const n = d.replace(/\D/g, "");
  if (n.length === 10) return `+1${n}`;
  if (n.length === 11 && n.startsWith("1")) return `+${n}`;
  return n.length >= 10 ? (d.startsWith("+") ? d : `+${n}`) : null;
};
const int = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const num = (v: unknown, lo: number, hi: number) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const state2 = (v: unknown) => { const t = s(v, 2).toUpperCase(); return /^[A-Z]{2}$/.test(t) ? t : null; };
const norm = (t: string | null | undefined) => (t || "").toLowerCase().replace(/[^a-z]/g, "");

const sb = () => createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } });
const FN = (name: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;

// Let slow work (model calls) finish after we answer.
function background(p: Promise<unknown>) {
  const rt = (globalThis as any).EdgeRuntime;
  const guarded = p.catch((e) => console.error(`background failed: ${(e as Error).message}`));
  if (rt?.waitUntil) rt.waitUntil(guarded);
}

async function internal(name: string, body: unknown) {
  const res = await fetch(FN(name), {
    method: "POST",
    headers: { "content-type": "application/json", "x-vekt-internal": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "" },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `${name} ${res.status}`);
  return out;
}

function fitRead(body: unknown) {
  return fetch(FN("vekt-fit-read"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-vekt-app-secret": Deno.env.get("VEKT_APP_SECRET") || "" },
    body: JSON.stringify(body),
  }).then(async (r) => { if (!r.ok) throw new Error(`fit-read ${r.status}: ${(await r.text()).slice(0, 200)}`); return r.json(); });
}

// ---- Who is calling ------------------------------------------------------------
type Coach = {
  id: string; user_id: string; department_id: string | null; role: string; first_name: string; last_name: string;
  title: string | null; email: string; programIds: string[];
};
const WRITE_ROLES = ["head_coach", "assistant_coach", "dept_admin", "vekt_admin"];
const SETTINGS_ROLES = ["head_coach", "dept_admin", "vekt_admin"];

async function whoAmI(supabase: any, req: Request): Promise<Coach> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) fail(401, "Sign in first.");
  const { data: u, error } = await supabase.auth.getUser(token);
  if (error || !u?.user?.email) fail(401, "Your session expired. Sign in again.");
  const userEmail = u.user.email.toLowerCase();
  let { data: rows } = await supabase.from("coach_accounts").select("*").eq("user_id", u.user.id).limit(1);
  if (!rows?.length) {
    // First sign-in: claim the account VEKT or the department set up for this email.
    const { data: byEmail } = await supabase.from("coach_accounts").select("*").ilike("email", userEmail).is("user_id", null).limit(1);
    if (byEmail?.length) {
      await supabase.from("coach_accounts").update({ user_id: u.user.id }).eq("id", byEmail[0].id);
      rows = [{ ...byEmail[0], user_id: u.user.id }];
    }
  }
  const acct = rows?.[0];
  if (!acct || !acct.active) fail(403, "This email isn't set up for VEKT yet. Ask your department admin.");
  let programIds: string[] = [];
  if (acct.role === "vekt_admin") {
    const { data } = await supabase.from("program_dna").select("id").not("department_id", "is", null);
    programIds = (data || []).map((p: any) => p.id);
  } else if (acct.role === "dept_admin" || acct.role === "compliance") {
    const { data } = await supabase.from("program_dna").select("id").eq("department_id", acct.department_id);
    programIds = (data || []).map((p: any) => p.id);
  } else {
    const { data } = await supabase.from("coach_account_programs").select("program_id").eq("coach_account_id", acct.id);
    programIds = (data || []).map((p: any) => p.program_id);
  }
  return { ...acct, programIds };
}

const canWrite = (c: Coach) => WRITE_ROLES.includes(c.role) || fail(403, "Your role can view but not change this.");
const canSettings = (c: Coach) => SETTINGS_ROLES.includes(c.role) || fail(403, "Only the head coach or department admin can change this.");
function program(c: Coach, id: unknown): string {
  if (!isUuid(id) || !c.programIds.includes(id)) fail(404, "Program not found.");
  return id as string;
}

async function audit(supabase: any, c: Coach, action: string, entity: string, entityId: string | null, detail: Record<string, unknown> = {}) {
  await supabase.from("vekt_audit_log").insert({ coach_account_id: c.id, department_id: c.department_id, action, entity, entity_id: entityId, detail });
}

async function recruitFor(supabase: any, c: Coach, id: unknown) {
  if (!isUuid(id)) fail(404, "Recruit not found.");
  const { data } = await supabase.from("comparison_recruits").select("*").eq("id", id).limit(1);
  const r = data?.[0];
  if (!r || !c.programIds.includes(r.program_id)) fail(404, "Recruit not found.");
  return r;
}

// The program's standing board: where dashboard recruits live so the existing
// invite, consent and conversation flow works for them unchanged.
async function board(supabase: any, c: Coach, programId: string) {
  const { data: b } = await supabase.from("recruit_comparisons").select("id").eq("program_id", programId).eq("kind", "board").limit(1);
  if (b?.length) return b[0].id as string;
  const { data: p } = await supabase.from("program_dna").select("sport, division, team_gender").eq("id", programId).single();
  const { data: made, error } = await supabase.from("recruit_comparisons").insert({
    program_id: programId, kind: "board", status: "requested", sport: p?.sport ?? null, division: p?.division ?? null,
    team_gender: p?.team_gender ?? null, coach_name: `${c.first_name} ${c.last_name}`, coach_email: c.email,
  }).select("id");
  if (error) {
    const { data: again } = await supabase.from("recruit_comparisons").select("id").eq("program_id", programId).eq("kind", "board").limit(1);
    if (again?.length) return again[0].id as string;
    throw new Error(error.message);
  }
  return made[0].id as string;
}

// ---- Recruit fields and status ---------------------------------------------------
function recruitFields(x: any) {
  const lo = int(x.family_cost_min, 0, 200000), hi = int(x.family_cost_max, 0, 200000);
  return {
    recruit_name: s(x.recruit_name, 120),
    position: opt(x.position, 60),
    grad_year: int(x.grad_year, 2024, 2040),
    club_or_school: opt(x.club_or_school, 160),
    club_level: opt(x.club_level, 80),
    state: state2(x.state),
    gpa: num(x.gpa, 0, 5),
    athlete_email: email(x.athlete_email), athlete_phone: phone(x.athlete_phone),
    parent_name: opt(x.parent_name, 120), parent_email: email(x.parent_email), parent_phone: phone(x.parent_phone),
    club_coach_name: opt(x.club_coach_name, 120), club_coach_email: email(x.club_coach_email), club_coach_phone: phone(x.club_coach_phone),
    family_cost_min: lo != null && hi != null && lo > hi ? hi : lo,
    family_cost_max: lo != null && hi != null && lo > hi ? lo : hi,
    priority: ["A", "B", "C"].includes(s(x.priority).toUpperCase()) ? s(x.priority).toUpperCase() : "B",
    notes: opt(x.notes, 1000),
    coach_open_question: opt(x.coach_open_question, 500),
  };
}

function stage(r: any, hasRead: boolean) {
  if (r.decision === "interested") return { key: "interested", label: "Interested" };
  if (r.decision === "not_a_fit") return { key: "not_a_fit", label: "Not a fit" };
  if (hasRead && r.club_coach_done) return { key: "read_ready", label: "Fit Read ready" };
  if (hasRead) return { key: "read_partial", label: "Fit Read ready, director pending" };
  if (r.athlete_done && r.club_invited_at && !r.club_coach_done) return { key: "waiting_director", label: "Waiting on club director" };
  if (r.athlete_done) return { key: "writing", label: "Writing the Fit Read" };
  if (r.contact_status === "hold") return { key: "held", label: r.contact_clear_date ? `Held until ${r.contact_clear_date}` : "Held" };
  if (!r.athlete_invited_at) return { key: "not_invited", label: "Not invited" };
  if (!r.consent_id) return { key: "waiting_parent", label: "Waiting on parent approval" };
  return { key: "approved", label: "Approved, not started" };
}

async function readsFor(supabase: any, programId: string, athleteIds: string[]) {
  if (!athleteIds.length) return new Map<string, any>();
  const { data } = await supabase.from("asset_matches")
    .select("id, athlete_id, report, fit_narrative, verification_level, updated_at")
    .eq("program_id", programId).in("athlete_id", athleteIds);
  return new Map((data || []).map((m: any) => [m.athlete_id, m]));
}

const LIST_COLS = "id, program_id, comparison_id, recruit_name, position, grad_year, club_or_school, club_level, state, gpa, priority, source, contact_status, contact_clear_date, athlete_invited_at, club_invited_at, consent_id, athlete_done, club_coach_done, athlete_id, decision, decision_at, reminders_sent, club_coach_name, created_at, updated_at, athlete_email, athlete_phone, parent_email, parent_phone, club_coach_email, club_coach_phone";

function listRow(r: any, read: any) {
  const sa = read?.report?.self_awareness;
  return {
    id: r.id, recruit_name: r.recruit_name, position: r.position, grad_year: r.grad_year, club_or_school: r.club_or_school,
    club_level: r.club_level, state: r.state, gpa: r.gpa, priority: r.priority, source: r.source, decision: r.decision,
    club_coach_name: r.club_coach_name, created_at: r.created_at, updated_at: r.updated_at, reminders_sent: r.reminders_sent,
    has_athlete_contact: !!(r.athlete_email || r.athlete_phone), has_parent_contact: !!(r.parent_email || r.parent_phone),
    has_club_contact: !!(r.club_coach_email || r.club_coach_phone),
    stage: stage(r, !!read?.report),
    self_awareness: sa ? { level: sa.level, label: sa.label, same_story: sa.same_story, covered: sa.covered } : null,
    headline: read?.report?.short_answer?.headline ?? null,
    must_haves_missed: read?.report?.must_haves?.filter((m: any) => m.met === false).length ?? null,
  };
}

// The hard-skills side: the athlete's profile, the club director's evaluation, and
// how both line up with the systems this program runs. Computed here, not by the model.
async function playerFor(supabase: any, programId: string, recruitIds: string[]) {
  const out = new Map<string, any>();
  if (!recruitIds.length) return out;
  const { data: p } = await supabase.from("program_dna").select("sport, systems").eq("id", programId).single();
  const sport = sportFor(p?.sport);
  if (!sport) return out;
  const { data: profiles } = await supabase.from("athlete_profiles").select("*").in("recruit_id", recruitIds);
  const { data: evals } = await supabase.from("club_evaluations").select("*").in("recruit_id", recruitIds);
  for (const id of recruitIds) {
    const a = (profiles || []).find((x: any) => x.recruit_id === id) ?? null;
    const d = (evals || []).find((x: any) => x.recruit_id === id) ?? null;
    if (!a && !d) { out.set(id, { sport: sport.key, profile: null, evaluation: null }); continue; }
    out.set(id, {
      sport: sport.key,
      profile: a && { primary_position: a.primary_position, secondary_positions: a.secondary_positions, attributes: a.attributes, marks: a.marks, film_links: a.film_links, intended_major: a.intended_major, systems: a.systems, submitted_at: a.submitted_at },
      evaluation: d && { evaluator_name: d.evaluator_name, team_name: d.team_name, team_level: d.team_level, primary_position: d.primary_position, positions_played: d.positions_played, team_systems: d.team_systems, systems_played: d.systems_played, notes: d.notes, submitted_at: d.submitted_at },
      skills: skillsRead(sport, a, d),
      systems: systemsFit(sport, p?.systems ?? {}, a, d),
      measurables: measurablesTable(sport, a, d),
    });
  }
  return out;
}

// ---- Roster planning ----------------------------------------------------------------
// The season recruiting is for: next fall by default (the incoming class is that HS grad year).
const defaultSeason = () => new Date().getUTCFullYear() + 1;
const ROSTER_STATUS = ["returning", "leaving", "transfer_risk", "undecided"];

async function planFor(supabase: any, programId: string, season: number | null) {
  const { data: p } = await supabase.from("program_dna").select("roster_limit, roster_targets").eq("id", programId).single();
  const { data: roster } = await supabase.from("program_roster").select("*").eq("program_id", programId).order("position").order("final_season");
  const { data: board } = await supabase.from("comparison_recruits").select("id, recruit_name, position, grad_year, decision").eq("program_id", programId);
  // No season asked for: plan for the class most of the board is in (next fall or later).
  if (!season) {
    const counts = new Map<number, number>();
    for (const r of board || []) if (r.grad_year && r.grad_year >= defaultSeason()) counts.set(r.grad_year, (counts.get(r.grad_year) ?? 0) + 1);
    season = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? defaultSeason();
  }
  return { plan: rosterPlan(roster || [], p?.roster_limit ?? null, p?.roster_targets ?? {}, season, board || []), roster: roster || [], settings: p };
}

// ---- The coach-only video feed and watch list -------------------------------------
// Only athletes whose parent (or the adult athlete) turned the feed on appear, and
// never with contact details. Underclassmen show when contact opens.
async function programCtx(supabase: any, programId: string) {
  const { data: p } = await supabase.from("program_dna").select("sport, division, team_gender").eq("id", programId).single();
  const { data: rules } = await supabase.from("contact_rules").select("*");
  return { p, sport: sportFor(p?.sport), rules: rules || [] };
}

function athleteCard(a: any, ctx: any) {
  const prof = a.profile || {};
  const ms = ctx.sport ? ctx.sport.measurables.filter((m: any) => prof.measurables?.[m.key]).slice(0, 3).map((m: any) => ({ label: m.label, value: prof.measurables[m.key], unit: m.unit })) : [];
  const c = contactOpens(ctx.rules, ctx.p?.division, ctx.p?.sport, ctx.p?.team_gender, a.grad_year);
  return {
    id: a.id, full_name: a.full_name, grad_year: a.grad_year, club: a.club, state: a.state,
    position: prof.primary_position ?? null, secondary_positions: prof.secondary_positions ?? [],
    systems: prof.systems ?? {}, measurables: ms, contact: c,
  };
}

async function feedAthletes(supabase: any, ctx: any) {
  if (!ctx.sport) return [];
  let q = supabase.from("vekt_athletes").select("id, full_name, grad_year, club, state, team_gender, profile").eq("sport", ctx.sport.key).eq("feed_visible", true).not("parent_approved_at", "is", null).limit(1000);
  if (ctx.p?.team_gender) q = q.or(`team_gender.is.null,team_gender.eq.${ctx.p.team_gender === "women" ? "women" : "men"}`);
  const { data } = await q;
  return data || [];
}

// ---- Actions -----------------------------------------------------------------------
type Ctx = { supabase: any; c: Coach; body: any };

const actions: Record<string, (x: Ctx) => Promise<unknown>> = {
  async me({ supabase, c }) {
    const { data: programs } = c.programIds.length
      ? await supabase.from("program_dna").select("id, institution, sport, division, team_gender, licensed, coach_name").in("id", c.programIds).order("sport")
      : { data: [] };
    const { data: dept } = c.department_id
      ? await supabase.from("vekt_departments").select("id, name, division, conference, license_type, license_start, license_end").eq("id", c.department_id).single()
      : { data: null };
    return {
      account: { id: c.id, first_name: c.first_name, last_name: c.last_name, title: c.title, email: c.email, role: c.role },
      department: dept, programs: programs || [],
      can: { write: WRITE_ROLES.includes(c.role), settings: SETTINGS_ROLES.includes(c.role), department: ["dept_admin", "vekt_admin"].includes(c.role), compliance: ["dept_admin", "compliance", "vekt_admin"].includes(c.role) },
    };
  },

  async dashboard({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { data: rs } = await supabase.from("comparison_recruits").select(LIST_COLS).eq("program_id", pid);
    const reads = await readsFor(supabase, pid, (rs || []).filter((r: any) => r.athlete_id).map((r: any) => r.athlete_id));
    const rows = (rs || []).map((r: any) => listRow(r, reads.get(r.athlete_id)));
    const count = (k: string[]) => rows.filter((r: any) => k.includes(r.stage.key)).length;
    const ids = (rs || []).map((r: any) => r.id);
    const { data: ev } = ids.length
      ? await supabase.from("invite_events").select("id, recruit_id, recipient_role, channel, status, created_at").in("recruit_id", ids).order("created_at", { ascending: false }).limit(25)
      : { data: [] };
    const names = new Map((rs || []).map((r: any) => [r.id, r.recruit_name]));
    return {
      counts: {
        recruits: rows.length,
        not_invited: count(["not_invited"]), held: count(["held"]),
        in_progress: count(["waiting_parent", "approved", "writing", "waiting_director"]),
        reads_ready: count(["read_ready", "read_partial"]), interested: count(["interested"]), not_a_fit: count(["not_a_fit"]),
      },
      ready: rows.filter((r: any) => ["read_ready", "read_partial"].includes(r.stage.key)).slice(0, 8),
      activity: (ev || []).map((e: any) => ({ ...e, recruit_name: names.get(e.recruit_id) ?? null })),
    };
  },

  async recruits({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { data: rs } = await supabase.from("comparison_recruits").select(LIST_COLS).eq("program_id", pid).order("created_at", { ascending: false }).limit(1000);
    const reads = await readsFor(supabase, pid, (rs || []).filter((r: any) => r.athlete_id).map((r: any) => r.athlete_id));
    const ids = (rs || []).map((r: any) => r.id);
    const { data: pr } = ids.length ? await supabase.from("athlete_profiles").select("recruit_id").in("recruit_id", ids).not("submitted_at", "is", null) : { data: [] };
    const { data: ev } = ids.length ? await supabase.from("club_evaluations").select("recruit_id").in("recruit_id", ids).not("submitted_at", "is", null) : { data: [] };
    const hasP = new Set((pr || []).map((x: any) => x.recruit_id)), hasE = new Set((ev || []).map((x: any) => x.recruit_id));
    const { plan } = await planFor(supabase, pid, null);
    return { season: plan.season, recruits: (rs || []).map((r: any) => ({ ...listRow(r, reads.get(r.athlete_id)), profile_in: hasP.has(r.id), club_eval_in: hasE.has(r.id), fills_need: fillsNeed(plan, r) })) };
  },

  async recruit({ supabase, c, body }) {
    const r = await recruitFor(supabase, c, body.id);
    const reads = r.athlete_id ? await readsFor(supabase, r.program_id, [r.athlete_id]) : new Map();
    const read = reads.get(r.athlete_id) ?? null;
    const { data: ev } = await supabase.from("invite_events").select("id, recipient_role, channel, status, detail, recipient, created_at").eq("recruit_id", r.id).order("created_at", { ascending: false }).limit(100);
    const { data: checks } = await supabase.from("season_one_checks").select("id, season, read_held_up, still_on_roster, what_we_missed, created_at").eq("recruit_id", r.id).order("created_at", { ascending: false });
    const { data: p } = await supabase.from("program_dna").select("institution, sport, division, team_gender").eq("id", r.program_id).single();
    const { invite_token: _a, club_invite_token: _b, ...safe } = r;
    const player = (await playerFor(supabase, r.program_id, [r.id])).get(r.id) ?? null;
    const { data: sh } = await supabase.from("athlete_shares").select("athlete_id, status").eq("recruit_id", r.id).limit(1);
    const shared = sh?.[0]?.status === "shared";
    const { data: videos } = shared ? await supabase.from("athlete_videos").select("kind, url, youtube_id, title, recorded_on, notes").eq("athlete_id", sh[0].athlete_id).order("sort_order") : { data: [] };
    // Found in the feed: the family's details stay private until they share the profile with you.
    if (r.source === "feed" && !shared) for (const k of ["athlete_email", "athlete_phone", "parent_email", "parent_phone"]) if (safe[k]) safe[k] = "Hidden until the family shares";
    return {
      player, videos: videos || [], profile_shared: shared,
      recruit: { ...safe, stage: stage(r, !!read?.report), consented: !!r.consent_id },
      program: p,
      fit_read: read ? { id: read.id, report: read.report, fit_narrative: read.fit_narrative, verification_level: read.verification_level, updated_at: read.updated_at } : null,
      events: (ev || []).map((e: any) => ({ ...e, detail: e.status === "dry_run" ? "Test mode: not actually sent" : e.detail })),
      season_checks: checks || [],
    };
  },

  async save_recruit({ supabase, c, body }) {
    canWrite(c);
    const x = body.recruit || {};
    const f = recruitFields(x);
    if (!f.recruit_name) fail(400, "Add the recruit's name.");
    if (isUuid(x.id)) {
      const r = await recruitFor(supabase, c, x.id);
      const { data, error } = await supabase.from("comparison_recruits").update({ ...f, updated_at: new Date().toISOString() }).eq("id", r.id).select("id");
      if (error) fail(400, error.message);
      await audit(supabase, c, "update", "recruit", r.id);
      return { id: data[0].id };
    }
    const pid = program(c, body.program_id);
    const comparison_id = await board(supabase, c, pid);
    const { data, error } = await supabase.from("comparison_recruits").insert({ ...f, program_id: pid, comparison_id, source: "dashboard", added_by: c.id }).select("id");
    if (error) fail(400, error.message);
    await audit(supabase, c, "create", "recruit", data[0].id);
    return { id: data[0].id };
  },

  async import_recruits({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, 300);
    const comparison_id = await board(supabase, c, pid);
    const good: any[] = [];
    const skipped: { row: number; reason: string }[] = [];
    rows.forEach((x: any, i: number) => {
      const f = recruitFields(x);
      if (!f.recruit_name) skipped.push({ row: i + 1, reason: "missing name" });
      else good.push({ ...f, program_id: pid, comparison_id, source: "csv", added_by: c.id });
    });
    if (good.length) {
      const { error } = await supabase.from("comparison_recruits").insert(good);
      if (error) fail(400, error.message);
    }
    await audit(supabase, c, "import", "recruit", null, { program_id: pid, added: good.length, skipped: skipped.length });
    return { added: good.length, skipped };
  },

  async delete_recruit({ supabase, c, body }) {
    canWrite(c);
    const r = await recruitFor(supabase, c, body.id);
    if (r.athlete_id) fail(400, "This recruit has finished a conversation. Ask VEKT to delete their data so the conversation is removed too.");
    await supabase.from("comparison_recruits").delete().eq("id", r.id);
    await audit(supabase, c, "delete", "recruit", r.id, { name_initials: (r.recruit_name || "").split(/\s+/).map((w: string) => w[0]).join("") });
    return { deleted: true };
  },

  // The coach confirms their staff may contact these recruits under NCAA rules.
  // Each recruit is still checked against the contact calendar before anything goes out.
  async invite({ supabase, c, body }) {
    canWrite(c);
    if (body.attest !== true) fail(400, "Confirm your staff is cleared to contact these recruits.");
    const ids: string[] = (Array.isArray(body.recruit_ids) ? body.recruit_ids : []).filter(isUuid).slice(0, 100);
    if (!ids.length) fail(400, "Pick at least one recruit.");
    const mine = [];
    for (const id of ids) {
      const r = await recruitFor(supabase, c, id);
      if (!(r.athlete_email || r.athlete_phone || r.parent_email || r.parent_phone || r.club_coach_email || r.club_coach_phone)) continue;
      mine.push(r.id);
    }
    if (!mine.length) fail(400, "None of these recruits has an email or phone number yet.");
    const out = await internal("vekt-invites", { action: "invite_recruits", recruit_ids: mine, resend: body.resend === true });
    await audit(supabase, c, body.resend ? "resend" : "invite", "recruit", null, { recruit_ids: mine, attested: true });
    return out;
  },

  async events({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { data: rs } = await supabase.from("comparison_recruits").select("id, recruit_name").eq("program_id", pid);
    const ids = (rs || []).map((r: any) => r.id);
    if (!ids.length) return { events: [] };
    const { data: ev } = await supabase.from("invite_events").select("id, recruit_id, recipient_role, channel, status, detail, recipient, created_at").in("recruit_id", ids).order("created_at", { ascending: false }).limit(500);
    const names = new Map((rs || []).map((r: any) => [r.id, r.recruit_name]));
    return { events: (ev || []).map((e: any) => ({ ...e, recruit_name: names.get(e.recruit_id) ?? null })) };
  },

  async decision({ supabase, c, body }) {
    canWrite(c);
    const r = await recruitFor(supabase, c, body.recruit_id);
    const d = body.decision === "interested" ? "interested" : body.decision === "not_a_fit" ? "not_a_fit" : null;
    if (!d) fail(400, "Pick Interested or Not a fit.");
    await supabase.from("comparison_recruits").update({ decision: d, decision_at: new Date().toISOString(), decision_by: c.id, updated_at: new Date().toISOString() }).eq("id", r.id);
    await supabase.from("vekt_outbox").update({ status: "cancelled", last_error: "staff decided" }).eq("recruit_id", r.id).eq("status", "pending").eq("kind", "reminder");
    let sent: any = { status: "recorded", sent: false };
    if (d === "interested" && body.notify !== false) {
      sent = await internal("vekt-invites", { action: "send_decision", recruit_id: r.id, decision: d, coach_name: `Coach ${c.last_name}`, coach_email: c.email, message: s(body.message, 600) });
    }
    await audit(supabase, c, "decision", "recruit", r.id, { decision: d, notified: sent.sent === true });
    return { decision: d, ...sent };
  },

  async refresh_read({ supabase, c, body }) {
    canWrite(c);
    const r = await recruitFor(supabase, c, body.recruit_id);
    if (!r.athlete_id) fail(400, "The athlete hasn't finished their conversation yet.");
    background(fitRead({ athlete_id: r.athlete_id, program_id: r.program_id, force: true }));
    return { status: "queued" };
  },

  // ---- Export: a CSV-ready board for Teamworks, Front Rush or a spreadsheet ----
  async export_board({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { data: rs } = await supabase.from("comparison_recruits").select("*").eq("program_id", pid).order("created_at");
    const reads = await readsFor(supabase, pid, (rs || []).filter((r: any) => r.athlete_id).map((r: any) => r.athlete_id));
    const { data: shares } = await supabase.from("athlete_shares").select("recruit_id").eq("status", "shared").in("recruit_id", (rs || []).map((r: any) => r.id));
    const shared = new Set((shares || []).map((x: any) => x.recruit_id));
    const { data: cfg } = await supabase.from("app_config").select("value").eq("key", "coach_app_url").limit(1);
    const base = cfg?.[0]?.value || "";
    const { plan } = await planFor(supabase, pid, null);
    const rows = (rs || []).map((r: any) => {
      const read = reads.get(r.athlete_id);
      const hide = r.source === "feed" && !shared.has(r.id);
      const [first, ...rest] = (r.recruit_name || "").split(/\s+/);
      return {
        "First Name": first, "Last Name": rest.join(" "), "Grad Year": r.grad_year ?? "", "Position": r.position ?? "", "Club / School": r.club_or_school ?? "", "State": r.state ?? "",
        "Email": hide ? "" : r.athlete_email ?? "", "Phone": hide ? "" : r.athlete_phone ?? "",
        "Parent Name": r.parent_name ?? "", "Parent Email": hide ? "" : r.parent_email ?? "", "Parent Phone": hide ? "" : r.parent_phone ?? "",
        "Club Coach": r.club_coach_name ?? "", "Club Coach Email": r.club_coach_email ?? "",
        "Priority": r.priority, "VEKT Status": stage(r, !!read?.report).label, "Staff Decision": r.decision === "interested" ? "Interested" : r.decision === "not_a_fit" ? "Not a fit" : "",
        "Self-Awareness": read?.report?.self_awareness?.label ?? "", "Fills a Need": fillsNeed(plan, r) ? `Yes (Fall ${plan.season})` : "",
        "VEKT Fit Read": read?.report && base ? `${base}/recruits/${r.id}/fit-read` : "",
      };
    });
    await audit(supabase, c, "export", "board", pid, { rows: rows.length });
    return { rows };
  },

  // ---- Roster planning ----
  async roster_get({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { plan, roster, settings } = await planFor(supabase, pid, int(body.season, 2024, 2040));
    const { data: p } = await supabase.from("program_dna").select("sport, division").eq("id", pid).single();
    const sport = sportFor(p?.sport);
    const suggested = sport && (p?.division || "").toUpperCase().replace(/\s/g, "").match(/^(D1|DI|DIVISIONI)$/) ? D1_HOUSE_LIMITS[sport.key] ?? null : null;
    return {
      plan, roster, limit: settings?.roster_limit ?? null, targets: settings?.roster_targets ?? {},
      suggested_limit: suggested, suggested_source: suggested ? LIMITS_SOURCE : null,
      positions: sport?.positions.map((x) => x.label) ?? [], seasons: [0, 1, 2, 3].map((i) => defaultSeason() + i),
    };
  },

  async roster_settings_save({ supabase, c, body }) {
    canSettings(c);
    const pid = program(c, body.program_id);
    const targets: Record<string, number> = {};
    for (const [k, v] of Object.entries((body.targets && typeof body.targets === "object") ? body.targets : {})) {
      const n = int(v, 0, 60);
      if (s(k, 60) && n != null && n > 0) targets[s(k, 60)] = n;
    }
    const limit = body.roster_limit === null || body.roster_limit === "" ? null : int(body.roster_limit, 1, 200);
    await supabase.from("program_dna").update({ roster_limit: limit, roster_targets: targets }).eq("id", pid);
    await audit(supabase, c, "update", "roster_settings", pid, { roster_limit: limit });
    return { saved: true };
  },

  async roster_player_save({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    const x = body.player || {};
    const row = {
      program_id: pid, name: s(x.name, 120), position: opt(x.position, 60), final_season: int(x.final_season, 2020, 2040),
      status: ROSTER_STATUS.includes(x.status) ? x.status : "returning", designated: x.designated === true,
      aid_dollars: x.aid_dollars === "" || x.aid_dollars == null ? null : int(x.aid_dollars, 0, 500000), notes: opt(x.notes, 300), updated_at: new Date().toISOString(),
    };
    if (!row.name || !row.final_season) fail(400, "Add the player's name and last season.");
    if (isUuid(x.id)) {
      const { data } = await supabase.from("program_roster").update(row).eq("id", x.id).eq("program_id", pid).select("id");
      if (!data?.length) fail(404, "Player not found.");
      return { id: x.id };
    }
    const { data, error } = await supabase.from("program_roster").insert(row).select("id");
    if (error) fail(400, error.message);
    return { id: data[0].id };
  },

  async roster_player_delete({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    if (!isUuid(body.id)) fail(404, "Player not found.");
    await supabase.from("program_roster").delete().eq("id", body.id).eq("program_id", pid);
    return { deleted: true };
  },

  async roster_import({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, 200).map((x: any) => ({
      program_id: pid, name: s(x.name, 120), position: opt(x.position, 60), final_season: int(x.final_season, 2020, 2040),
      status: ROSTER_STATUS.includes(x.status) ? x.status : "returning", designated: false,
    })).filter((r: any) => r.name && r.final_season);
    if (!rows.length) fail(400, "No rows with a name and last season.");
    const { error } = await supabase.from("program_roster").insert(rows);
    if (error) fail(400, error.message);
    await audit(supabase, c, "import", "roster", pid, { added: rows.length });
    return { added: rows.length };
  },

  // ---- Coach feed and watch list ----
  async feed({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const ctx = await programCtx(supabase, pid);
    if (!ctx.sport) return { videos: [], kinds: [], positions: [], total: 0 };
    let athletes = await feedAthletes(supabase, ctx);
    const years = (Array.isArray(body.grad_years) ? body.grad_years : []).map(Number).filter(Boolean);
    if (years.length) athletes = athletes.filter((a: any) => years.includes(a.grad_year));
    if (s(body.position)) athletes = athletes.filter((a: any) => [a.profile?.primary_position, ...(a.profile?.secondary_positions ?? [])].includes(s(body.position)));
    if (state2(body.state)) athletes = athletes.filter((a: any) => a.state === state2(body.state));
    const ids = athletes.map((a: any) => a.id);
    if (!ids.length) return { videos: [], kinds: videoKinds(ctx.sport), positions: ctx.sport.positions.map((x) => x.label), total: 0 };
    let vq = supabase.from("athlete_videos").select("id, athlete_id, kind, url, youtube_id, title, recorded_on, notes, created_at").in("athlete_id", ids).order("created_at", { ascending: false });
    if (s(body.kind)) vq = vq.eq("kind", s(body.kind));
    const { data: vids } = await vq.limit(500);
    const { data: watch } = await supabase.from("watch_list").select("athlete_id").eq("program_id", pid);
    const { data: board } = await supabase.from("comparison_recruits").select("vekt_athlete_id").eq("program_id", pid).not("vekt_athlete_id", "is", null);
    const watched = new Set((watch || []).map((w: any) => w.athlete_id)), onBoard = new Set((board || []).map((b: any) => b.vekt_athlete_id));
    const byId = new Map(athletes.map((a: any) => [a.id, a]));
    const offset = int(body.offset, 0, 10000) ?? 0;
    const kinds = new Map(videoKinds(ctx.sport).map((k) => [k.key, k.label]));
    const all = (vids || []).map((v: any) => ({ ...v, kind_label: kinds.get(v.kind) ?? v.kind, athlete: athleteCard(byId.get(v.athlete_id), ctx), watched: watched.has(v.athlete_id), on_board: onBoard.has(v.athlete_id) }));
    return { videos: all.slice(offset, offset + 20), total: all.length, kinds: videoKinds(ctx.sport), positions: ctx.sport.positions.map((x) => x.label) };
  },

  async athlete_card({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    if (!isUuid(body.athlete_id)) fail(404, "Not found.");
    const ctx = await programCtx(supabase, pid);
    const { data } = await supabase.from("vekt_athletes").select("id, full_name, grad_year, club, state, sport, feed_visible, parent_approved_at, profile").eq("id", body.athlete_id).limit(1);
    const a = data?.[0];
    const { data: shared } = a ? await supabase.from("athlete_shares").select("recruit_id, comparison_recruits!inner(program_id)").eq("athlete_id", a.id).eq("status", "shared").eq("comparison_recruits.program_id", pid) : { data: [] };
    const inFeed = a ? (await feedAthletes(supabase, ctx)).some((x: any) => x.id === a.id) : false;
    if (!a || a.sport !== ctx.sport?.key || !(inFeed || shared?.length)) fail(404, "Not found.");
    const { data: vids } = await supabase.from("athlete_videos").select("kind, url, youtube_id, title, recorded_on, notes").eq("athlete_id", a.id).order("sort_order");
    const { data: w } = await supabase.from("watch_list").select("note").eq("program_id", pid).eq("athlete_id", a.id).limit(1);
    await supabase.from("coach_actions").insert({ program_id: pid, coach_account_id: c.id, athlete_id: a.id, action: "profile_view" });
    return { athlete: athleteCard(a, ctx), profile: a.profile, videos: vids || [], watched: !!w?.length, note: w?.[0]?.note ?? null };
  },

  async watch_add({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    if (!isUuid(body.athlete_id)) fail(404, "Not found.");
    const ctx = await programCtx(supabase, pid);
    const visible = (await feedAthletes(supabase, ctx)).some((a: any) => a.id === body.athlete_id);
    if (!visible) fail(404, "Not found.");
    await supabase.from("watch_list").upsert({ program_id: pid, athlete_id: body.athlete_id, added_by: c.id, note: opt(body.note, 500) }, { onConflict: "program_id,athlete_id" });
    await supabase.from("coach_actions").insert({ program_id: pid, coach_account_id: c.id, athlete_id: body.athlete_id, action: "watch_add" });
    await audit(supabase, c, "watch", "athlete", body.athlete_id);
    return { watched: true };
  },

  // Logged when staff play an athlete's film in the feed; the athlete's club sees it as engagement.
  async film_play({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    if (!isUuid(body.athlete_id)) fail(404, "Not found.");
    const ctx = await programCtx(supabase, pid);
    if (!(await feedAthletes(supabase, ctx)).some((a: any) => a.id === body.athlete_id)) fail(404, "Not found.");
    await supabase.from("coach_actions").insert({ program_id: pid, coach_account_id: c.id, athlete_id: body.athlete_id, action: "film_play" });
    return { logged: true };
  },

  async watch_remove({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    if (!isUuid(body.athlete_id)) fail(404, "Not found.");
    await supabase.from("watch_list").delete().eq("program_id", pid).eq("athlete_id", body.athlete_id);
    return { watched: false };
  },

  async watch_list({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const ctx = await programCtx(supabase, pid);
    const { data: rows } = await supabase.from("watch_list").select("athlete_id, note, created_at, added_by").eq("program_id", pid).order("created_at", { ascending: false });
    const ids = (rows || []).map((r: any) => r.athlete_id);
    if (!ids.length) return { athletes: [] };
    const { data: as } = await supabase.from("vekt_athletes").select("id, full_name, grad_year, club, state, profile, feed_visible").in("id", ids);
    const { data: board } = await supabase.from("comparison_recruits").select("id, vekt_athlete_id").eq("program_id", pid).in("vekt_athlete_id", ids);
    const { data: who } = await supabase.from("coach_accounts").select("id, first_name, last_name").in("id", (rows || []).map((r: any) => r.added_by).filter(Boolean));
    const names = new Map((who || []).map((w: any) => [w.id, `${w.first_name} ${w.last_name}`]));
    return {
      athletes: (rows || []).map((r: any) => {
        const a = (as || []).find((x: any) => x.id === r.athlete_id);
        if (!a) return null;
        const b = (board || []).find((x: any) => x.vekt_athlete_id === a.id);
        return { ...athleteCard(a, ctx), note: r.note, added_at: r.created_at, added_by: names.get(r.added_by) ?? null, recruit_id: b?.id ?? null, still_visible: a.feed_visible };
      }).filter(Boolean),
    };
  },

  // Contact is open: put them on the board and send the usual invite to the family.
  // Their contact details stay hidden from staff until the family shares the profile.
  async watch_invite({ supabase, c, body }) {
    canWrite(c);
    if (body.attest !== true) fail(400, "Confirm your staff is cleared to contact this recruit.");
    const pid = program(c, body.program_id);
    if (!isUuid(body.athlete_id)) fail(404, "Not found.");
    const ctx = await programCtx(supabase, pid);
    const { data: w } = await supabase.from("watch_list").select("athlete_id").eq("program_id", pid).eq("athlete_id", body.athlete_id).limit(1);
    if (!w?.length) fail(404, "Add them to your watch list first.");
    const { data } = await supabase.from("vekt_athletes").select("*").eq("id", body.athlete_id).limit(1);
    const a = data?.[0];
    if (!a) fail(404, "Not found.");
    const open = contactOpens(ctx.rules, ctx.p?.division, ctx.p?.sport, ctx.p?.team_gender, a.grad_year);
    if (!open.open) fail(400, open.date ? `Contact opens ${open.date}. We'll keep them on your watch list until then.` : open.text);
    const { data: existing } = await supabase.from("comparison_recruits").select("id").eq("program_id", pid).eq("vekt_athlete_id", a.id).limit(1);
    let id = existing?.[0]?.id;
    if (!id) {
      const comparison_id = await board(supabase, c, pid);
      const { data: made, error } = await supabase.from("comparison_recruits").insert({
        program_id: pid, comparison_id, source: "feed", added_by: c.id, vekt_athlete_id: a.id,
        recruit_name: a.full_name, grad_year: a.grad_year, position: a.profile?.primary_position ?? null, club_or_school: a.club, state: a.state,
        athlete_email: a.athlete_email, parent_name: a.parent_name, parent_email: a.parent_email,
      }).select("id");
      if (error) fail(400, error.message);
      id = made[0].id;
    }
    const out = await internal("vekt-invites", { action: "invite_recruits", recruit_ids: [id] });
    await audit(supabase, c, "invite", "recruit", id, { from: "watch_list", attested: true });
    return { recruit_id: id, ...out };
  },

  // ---- Side-by-Side ----
  async side_by_side_create({ supabase, c, body }) {
    canWrite(c);
    const pid = program(c, body.program_id);
    const ids: string[] = [...new Set<string>((Array.isArray(body.recruit_ids) ? body.recruit_ids : []).filter(isUuid))];
    if (ids.length < 2 || ids.length > 4) fail(400, "Pick 2 to 4 recruits.");
    const rs = [];
    for (const id of ids) rs.push(await recruitFor(supabase, c, id));
    if (rs.some((r) => r.program_id !== pid)) fail(400, "All recruits must be on this program's board.");
    const positions = [...new Set(rs.map((r) => norm(r.position)))];
    if (positions.length > 1 || !positions[0]) fail(400, "Side-by-Side compares recruits at the same position. Set the same position on each.");
    const { data, error } = await supabase.from("side_by_sides").insert({ program_id: pid, position: rs[0].position, recruit_ids: ids, requested_by: c.id }).select("id");
    if (error) fail(400, error.message);
    background(fitRead({ side_by_side_id: data[0].id }));
    await audit(supabase, c, "create", "side_by_side", data[0].id, { recruit_ids: ids });
    return { id: data[0].id, status: "pending" };
  },

  async side_by_side_get({ supabase, c, body }) {
    if (!isUuid(body.id)) fail(404, "Not found.");
    const { data } = await supabase.from("side_by_sides").select("*").eq("id", body.id).limit(1);
    const sbs = data?.[0];
    if (!sbs || !c.programIds.includes(sbs.program_id)) fail(404, "Not found.");
    // The per-athlete Fit Reads, for the side-by-side tables.
    const { data: rs } = await supabase.from("comparison_recruits").select(LIST_COLS).in("id", sbs.recruit_ids);
    const reads = await readsFor(supabase, sbs.program_id, (rs || []).filter((r: any) => r.athlete_id).map((r: any) => r.athlete_id));
    const players = await playerFor(supabase, sbs.program_id, sbs.recruit_ids);
    const athletes = sbs.recruit_ids.map((id: string) => {
      const r = (rs || []).find((x: any) => x.id === id);
      if (!r) return null;
      const read = reads.get(r.athlete_id);
      return { ...listRow(r, read), report: read?.report ?? null, player: players.get(id) ?? null };
    }).filter(Boolean);
    const { data: staff } = await supabase.from("program_staff").select("name, title, traits").eq("program_id", sbs.program_id).order("sort_order");
    return { side_by_side: sbs, athletes, staff: staff || [] };
  },

  async side_by_sides({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { data } = await supabase.from("side_by_sides").select("id, position, recruit_ids, status, created_at").eq("program_id", pid).order("created_at", { ascending: false }).limit(50);
    const all = [...new Set((data || []).flatMap((x: any) => x.recruit_ids))];
    const { data: rs } = all.length ? await supabase.from("comparison_recruits").select("id, recruit_name").in("id", all) : { data: [] };
    const names = new Map((rs || []).map((r: any) => [r.id, r.recruit_name]));
    return { side_by_sides: (data || []).map((x: any) => ({ ...x, names: x.recruit_ids.map((id: string) => names.get(id) ?? "Removed") })) };
  },

  async side_by_side_refresh({ supabase, c, body }) {
    canWrite(c);
    if (!isUuid(body.id)) fail(404, "Not found.");
    const { data } = await supabase.from("side_by_sides").select("id, program_id").eq("id", body.id).limit(1);
    if (!data?.[0] || !c.programIds.includes(data[0].program_id)) fail(404, "Not found.");
    await supabase.from("side_by_sides").update({ status: "pending", error: null }).eq("id", body.id);
    background(fitRead({ side_by_side_id: body.id }));
    return { status: "pending" };
  },

  // ---- Program: staff personalities and must-haves ----
  async program_get({ supabase, c, body }) {
    const pid = program(c, body.program_id);
    const { data: p } = await supabase.from("program_dna")
      .select("id, institution, sport, division, team_gender, licensed, coach_name, must_haves, reminder_days, tactical_identity, profile_confirmed, systems")
      .eq("id", pid).single();
    const { data: staff } = await supabase.from("program_staff").select("*").eq("program_id", pid).order("sort_order");
    return { program: { ...p, sport_key: sportFor(p?.sport)?.key ?? null }, staff: staff || [] };
  },

  async program_save({ supabase, c, body }) {
    canSettings(c);
    const pid = program(c, body.program_id);
    const m = body.must_haves || {};
    const list = (v: unknown) => (Array.isArray(v) ? v : s(v, 400).split(",")).map((x) => s(x, 60)).filter(Boolean).slice(0, 12);
    const must_haves: Record<string, unknown> = {};
    if (list(m.positions).length) must_haves.positions = list(m.positions);
    if (int(m.min_grad_year, 2024, 2040)) must_haves.min_grad_year = int(m.min_grad_year, 2024, 2040);
    if (int(m.max_grad_year, 2024, 2040)) must_haves.max_grad_year = int(m.max_grad_year, 2024, 2040);
    if (list(m.club_levels).length) must_haves.club_levels = list(m.club_levels);
    if (num(m.min_gpa, 0, 5)) must_haves.min_gpa = num(m.min_gpa, 0, 5);
    if (int(m.max_family_cost, 0, 200000)) must_haves.max_family_cost = int(m.max_family_cost, 0, 200000);
    const patch: Record<string, unknown> = { must_haves };
    if (body.systems && typeof body.systems === "object") {
      const { data: cur } = await supabase.from("program_dna").select("sport").eq("id", pid).single();
      const sport = sportFor(cur?.sport);
      if (sport) {
        const systems: Record<string, string[]> = {};
        for (const g of sport.systems) {
          const picked: string[] = (Array.isArray(body.systems[g.key]) ? body.systems[g.key] : []).filter((x: unknown): x is string => typeof x === "string" && g.options.includes(x));
          if (picked.length) systems[g.key] = [...new Set<string>(picked)];
        }
        patch.systems = systems;
      }
    }
    if (["men", "women"].includes(body.team_gender)) patch.team_gender = body.team_gender;
    if (Array.isArray(body.reminder_days)) {
      const days = body.reminder_days.map((d: unknown) => int(d, 1, 30)).filter((d: number | null) => d).slice(0, 3).sort((a: number, b: number) => a - b);
      patch.reminder_days = days;
    }
    await supabase.from("program_dna").update(patch).eq("id", pid);
    await audit(supabase, c, "update", "program", pid, { must_haves: Object.keys(must_haves) });
    return { saved: true };
  },

  async staff_save({ supabase, c, body }) {
    canSettings(c);
    const pid = program(c, body.program_id);
    const x = body.staff || {};
    const row = {
      program_id: pid, name: s(x.name, 80), title: opt(x.title, 80), focus: opt(x.focus, 120),
      feedback_style: opt(x.feedback_style, 500), motivation_style: opt(x.motivation_style, 500),
      closeness_style: opt(x.closeness_style, 500), setbacks_style: opt(x.setbacks_style, 500),
      traits: (Array.isArray(x.traits) ? x.traits : s(x.traits, 200).split(",")).map((t: unknown) => s(t, 24)).filter(Boolean).slice(0, 4),
      sort_order: int(x.sort_order, 0, 100) ?? 0, updated_at: new Date().toISOString(),
    };
    if (!row.name) fail(400, "Add the coach's name.");
    if (isUuid(x.id)) {
      const { data } = await supabase.from("program_staff").update(row).eq("id", x.id).eq("program_id", pid).select("id");
      if (!data?.length) fail(404, "Staff member not found.");
      await audit(supabase, c, "update", "staff", x.id);
      return { id: x.id };
    }
    const { data, error } = await supabase.from("program_staff").insert(row).select("id");
    if (error) fail(400, error.message);
    await audit(supabase, c, "create", "staff", data[0].id);
    return { id: data[0].id };
  },

  async staff_delete({ supabase, c, body }) {
    canSettings(c);
    const pid = program(c, body.program_id);
    if (!isUuid(body.id)) fail(404, "Staff member not found.");
    await supabase.from("program_staff").delete().eq("id", body.id).eq("program_id", pid);
    await audit(supabase, c, "delete", "staff", body.id);
    return { deleted: true };
  },

  // ---- Season-one check: did the read hold up? ----
  async season_check_save({ supabase, c, body }) {
    canWrite(c);
    const r = await recruitFor(supabase, c, body.recruit_id);
    if (!r.athlete_id) fail(400, "Only recruits with a Fit Read can be checked.");
    const held = ["yes", "partly", "no"].includes(body.read_held_up) ? body.read_held_up : fail(400, "Pick yes, partly or no.");
    const { data: m } = await supabase.from("asset_matches").select("id").eq("athlete_id", r.athlete_id).eq("program_id", r.program_id).limit(1);
    const { data, error } = await supabase.from("season_one_checks").insert({
      match_id: m?.[0]?.id ?? null, program_id: r.program_id, athlete_id: r.athlete_id, recruit_id: r.id, checked_by: c.id,
      season: opt(body.season, 20), read_held_up: held, still_on_roster: typeof body.still_on_roster === "boolean" ? body.still_on_roster : null,
      what_we_missed: opt(body.what_we_missed, 1000),
    }).select("id");
    if (error) fail(400, error.message);
    await audit(supabase, c, "create", "season_check", data[0].id, { read_held_up: held });
    return { id: data[0].id };
  },

  // ---- Department and compliance ----
  async department({ supabase, c }) {
    if (!["dept_admin", "vekt_admin", "compliance"].includes(c.role)) fail(403, "Department view is for the department admin.");
    const { data: dept } = c.department_id ? await supabase.from("vekt_departments").select("*").eq("id", c.department_id).single() : { data: null };
    const { data: programs } = c.programIds.length
      ? await supabase.from("program_dna").select("id, institution, sport, team_gender, division, licensed").in("id", c.programIds).order("sport")
      : { data: [] };
    const usage = [];
    for (const p of programs || []) {
      const { data: rs } = await supabase.from("comparison_recruits").select("id, athlete_id, decision").eq("program_id", p.id);
      const { count: reads } = await supabase.from("asset_matches").select("id", { count: "exact", head: true }).eq("program_id", p.id).not("report", "is", null);
      usage.push({ ...p, recruits: rs?.length ?? 0, conversations: (rs || []).filter((r: any) => r.athlete_id).length, fit_reads: reads ?? 0, interested: (rs || []).filter((r: any) => r.decision === "interested").length });
    }
    const { data: accounts } = c.department_id
      ? await supabase.from("coach_accounts").select("id, first_name, last_name, title, email, role, active, user_id").eq("department_id", c.department_id).order("last_name")
      : { data: [] };
    const { data: cfg } = await supabase.from("app_config").select("key, value").in("key", ["price_all_sports_cents", "price_single_sport_cents", "price_additional_sport_cents"]);
    const price = Object.fromEntries((cfg || []).map((r: any) => [r.key, Number(r.value)]));
    return { department: dept, programs: usage, accounts: (accounts || []).map((a: any) => ({ ...a, signed_in: !!a.user_id, user_id: undefined })), pricing: price };
  },

  async account_save({ supabase, c, body }) {
    if (!["dept_admin", "vekt_admin"].includes(c.role)) fail(403, "Only the department admin can add staff accounts.");
    const x = body.account || {};
    const e = email(x.email);
    if (!e) fail(400, "Add a valid email.");
    const role = ["head_coach", "assistant_coach", "dept_admin", "compliance"].includes(x.role) ? x.role : fail(400, "Pick a role.");
    const row = { department_id: c.department_id, role, first_name: s(x.first_name, 60), last_name: s(x.last_name, 60), title: opt(x.title, 80), email: e, active: x.active !== false };
    if (!row.first_name || !row.last_name) fail(400, "Add first and last name.");
    let id = isUuid(x.id) ? x.id : null;
    if (id) {
      const { data } = await supabase.from("coach_accounts").update(row).eq("id", id).eq("department_id", c.department_id).select("id");
      if (!data?.length) fail(404, "Account not found.");
    } else {
      const { data, error } = await supabase.from("coach_accounts").insert(row).select("id");
      if (error) fail(400, error.code === "23514" ? "Coach accounts need a school (.edu) email." : error.code === "23505" ? "That email already has an account." : error.message);
      id = data[0].id;
      // Create the sign-in user so they can get a login code. Public sign-up stays off.
      await supabase.auth.admin.createUser({ email: e, email_confirm: true }).catch(() => null);
    }
    if (Array.isArray(x.program_ids)) {
      const pids = x.program_ids.filter((p: unknown) => isUuid(p) && c.programIds.includes(p as string));
      await supabase.from("coach_account_programs").delete().eq("coach_account_id", id);
      if (pids.length) await supabase.from("coach_account_programs").insert(pids.map((p: string) => ({ coach_account_id: id, program_id: p })));
    }
    await audit(supabase, c, x.id ? "update" : "create", "coach_account", id, { role });
    return { id };
  },

  async compliance_log({ supabase, c, body }) {
    if (!["dept_admin", "compliance", "vekt_admin"].includes(c.role)) fail(403, "The compliance log is for compliance staff and the department admin.");
    const from = /^\d{4}-\d{2}-\d{2}$/.test(s(body.from)) ? s(body.from) : new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(s(body.to)) ? s(body.to) : new Date().toISOString().slice(0, 10);
    const pids = isUuid(body.program_id) ? [program(c, body.program_id)] : c.programIds;
    if (!pids.length) return { from, to, rows: [], audit: [] };
    const { data: rs } = await supabase.from("comparison_recruits")
      .select("id, recruit_name, grad_year, program_id, contact_status, contact_clear_date, contact_rule_text, consent_id, comparison_id").in("program_id", pids);
    const ids = (rs || []).map((r: any) => r.id);
    const byId = new Map((rs || []).map((r: any) => [r.id, r]));
    const { data: progs } = await supabase.from("program_dna").select("id, sport, team_gender").in("id", pids);
    const sport = new Map((progs || []).map((p: any) => [p.id, `${p.team_gender ? `${p.team_gender[0].toUpperCase()}${p.team_gender.slice(1)}'s ` : ""}${p.sport || ""}`]));
    const { data: comps } = await supabase.from("recruit_comparisons").select("id, coach_attested_at").in("program_id", pids);
    const attested = new Map((comps || []).map((x: any) => [x.id, x.coach_attested_at]));
    const { data: ev } = ids.length
      ? await supabase.from("invite_events").select("recruit_id, recipient_role, channel, status, created_at")
        .in("recruit_id", ids).gte("created_at", `${from}T00:00:00Z`).lte("created_at", `${to}T23:59:59Z`).order("created_at", { ascending: false }).limit(2000)
      : { data: [] };
    const { data: au } = await supabase.from("vekt_audit_log").select("action, entity, entity_id, detail, created_at, coach_account_id")
      .eq("department_id", c.department_id).gte("created_at", `${from}T00:00:00Z`).lte("created_at", `${to}T23:59:59Z`).order("created_at", { ascending: false }).limit(1000);
    const { data: who } = await supabase.from("coach_accounts").select("id, first_name, last_name").eq("department_id", c.department_id);
    const names = new Map((who || []).map((w: any) => [w.id, `${w.first_name} ${w.last_name}`]));
    return {
      from, to,
      rows: (ev || []).map((e: any) => {
        const r: any = byId.get(e.recruit_id);
        return {
          when: e.created_at, recruit: r?.recruit_name, grad_year: r?.grad_year, team: sport.get(r?.program_id), to: e.recipient_role, channel: e.channel, status: e.status,
          contact_rule: r?.contact_rule_text, contact_clear_date: r?.contact_clear_date, parent_approved: !!r?.consent_id, staff_attested_at: attested.get(r?.comparison_id) ?? null,
        };
      }),
      audit: (au || []).map((a: any) => ({ ...a, by: names.get(a.coach_account_id) ?? "VEKT" })),
    };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const supabase = sb();
  let action = "";
  try {
    const body = await req.json().catch(() => ({}));
    action = s(body.action, 40);
    const fn = actions[action];
    if (!fn) return json({ error: "Unknown action" }, 400);
    const c = await whoAmI(supabase, req);
    return json(await fn({ supabase, c, body }));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(`VEKT_COACH_ERROR action=${action}:`, (e as Error).message);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
