// vekt-club: the API behind the club director's dashboard.
//
// POST { "action": "...", ... } with Authorization: Bearer <Supabase session token>.
// The token's email must belong to an active club_accounts row. Everything is
// scoped to that club's roster. Engagement for an athlete (which programs opened
// their profile, played film, saved them, invited them, replied Interested) is
// shown only once the family has said yes to the club seeing it
// (club_athletes.family_approved_at) and the profile itself is approved.
// Same pattern as vekt-coach: RLS on, no policies, service role, scoping in code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
const int = (v: unknown, lo: number, hi: number) => { const n = Number(v); return v !== "" && v != null && Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const num = (v: unknown, lo: number, hi: number) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const sb = () => createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } });

type Club = { id: string; club_id: string; role: string; first_name: string; last_name: string; email: string };

async function whoAmI(supabase: any, req: Request): Promise<Club> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) fail(401, "Sign in first.");
  const { data: u, error } = await supabase.auth.getUser(token);
  if (error || !u?.user?.email) fail(401, "Your session expired. Sign in again.");
  let { data: rows } = await supabase.from("club_accounts").select("*").eq("user_id", u.user.id).limit(1);
  if (!rows?.length) {
    const { data: byEmail } = await supabase.from("club_accounts").select("*").ilike("email", u.user.email.toLowerCase()).is("user_id", null).limit(1);
    if (byEmail?.length) { await supabase.from("club_accounts").update({ user_id: u.user.id }).eq("id", byEmail[0].id); rows = byEmail; }
  }
  const a = rows?.[0];
  if (!a || !a.active) fail(403, "This email isn't set up for a VEKT club account.");
  return a;
}
// Club writes go in the same append-only log as coach writes, tagged with the club.
const audit = (supabase: any, c: Club, action: string, entityId: string | null, detail: Record<string, unknown> = {}) =>
  supabase.from("vekt_audit_log").insert({ action, entity: "club_athlete", entity_id: entityId, detail: { ...detail, club_id: c.club_id, club_account_id: c.id } });
const director = (c: Club) => c.role === "director" || fail(403, "Only a club director can change this.");

// ---- Where each athlete stands -------------------------------------------------
export const STAGES = [
  { key: "not_on_vekt", label: "Not on VEKT yet" },
  { key: "profile", label: "Profile live" },
  { key: "seen", label: "Seen by coaches" },
  { key: "invited", label: "Invited by programs" },
  { key: "read", label: "Fit Read done" },
  { key: "interested", label: "Interested" },
  { key: "committed", label: "Committed" },
];

async function rosterData(supabase: any, clubId: string, since?: string) {
  const { data: roster } = await supabase.from("club_athletes").select("*").eq("club_id", clubId).order("grad_year").order("full_name");
  const ids = (roster || []).map((r: any) => r.vekt_athlete_id).filter(Boolean);
  const { data: athletes } = ids.length ? await supabase.from("vekt_athletes").select("id, parent_approved_at, feed_visible, profile").in("id", ids) : { data: [] };
  const profileOk = new Set((athletes || []).filter((a: any) => a.parent_approved_at).map((a: any) => a.id));
  const approved = new Set((roster || []).filter((r: any) => r.vekt_athlete_id && r.family_approved_at && profileOk.has(r.vekt_athlete_id)).map((r: any) => r.vekt_athlete_id));
  const live = [...approved];
  let aq = live.length ? supabase.from("coach_actions").select("program_id, athlete_id, action, created_at").in("athlete_id", live) : null;
  if (aq && since) aq = aq.gte("created_at", since);
  const { data: actions } = aq ? await aq : { data: [] };
  const { data: recruits } = live.length ? await supabase.from("comparison_recruits").select("id, program_id, vekt_athlete_id, athlete_id, athlete_invited_at, decision, decision_at, created_at").in("vekt_athlete_id", live) : { data: [] };
  const recruitAthletes = (recruits || []).map((r: any) => r.athlete_id).filter(Boolean);
  const { data: reads } = recruitAthletes.length ? await supabase.from("asset_matches").select("athlete_id, program_id").in("athlete_id", recruitAthletes).not("report", "is", null) : { data: [] };
  const programIds = [...new Set([...(actions || []).map((x: any) => x.program_id), ...(recruits || []).map((x: any) => x.program_id)])];
  const { data: programs } = programIds.length ? await supabase.from("program_dna").select("id, institution, sport, division, team_gender").in("id", programIds) : { data: [] };
  const pmap = new Map<string, any>((programs || []).map((p: any) => [p.id, p]));
  const readSet = new Set((reads || []).map((r: any) => `${r.athlete_id}:${r.program_id}`));

  const rows = (roster || []).map((r: any) => {
    const linked = r.vekt_athlete_id && approved.has(r.vekt_athlete_id);
    const acts = linked ? (actions || []).filter((x: any) => x.athlete_id === r.vekt_athlete_id) : [];
    const recs = linked ? (recruits || []).filter((x: any) => x.vekt_athlete_id === r.vekt_athlete_id) : [];
    const views = acts.filter((x: any) => x.action !== "watch_add").length;
    const saves = new Set(acts.filter((x: any) => x.action === "watch_add").map((x: any) => x.program_id)).size;
    const invites = recs.filter((x: any) => x.athlete_invited_at).length;
    const interested = recs.filter((x: any) => x.decision === "interested");
    const hasRead = recs.some((x: any) => x.athlete_id && readSet.has(`${x.athlete_id}:${x.program_id}`));
    const engaged = new Set([...acts.map((x: any) => x.program_id), ...recs.map((x: any) => x.program_id)]);
    const divs = interested.map((x: any) => pmap.get(x.program_id)?.division).filter(Boolean);
    const vektStage = interested.length ? "interested" : hasRead ? "read" : invites ? "invited" : acts.length ? "seen" : linked ? "profile" : "not_on_vekt";
    const stage = r.status === "committed" ? "committed" : vektStage;
    return {
      id: r.id, full_name: r.full_name, grad_year: r.grad_year, position: r.position ?? linkedPosition(athletes, r.vekt_athlete_id), team: r.team, sport: r.sport,
      status: r.status, committed_program: r.committed_program, committed_division: r.committed_division, committed_at: r.committed_at,
      invited_at: r.invited_at, on_vekt: !!linked, pending_parent: !!r.vekt_athlete_id && !linked, feed_on: linked && (athletes || []).find((a: any) => a.id === r.vekt_athlete_id)?.feed_visible === true,
      stage, vekt_stage: vektStage, stage_label: STAGES.find((x) => x.key === stage)!.label,
      programs_engaged: engaged.size, views, saves, invites, interested: interested.length,
      top_division: divs.sort()[0] ?? null,
      interested_programs: interested.map((x: any) => pmap.get(x.program_id)?.institution).filter(Boolean),
    };
  });
  return { rows, actions: actions || [], recruits: recruits || [], programs: pmap, approved };
}
function linkedPosition(athletes: any[], id: string | null) {
  return (athletes || []).find((a: any) => a.id === id)?.profile?.primary_position ?? null;
}

const csvSafe = (v: unknown) => s(v, 200);

type Ctx = { supabase: any; c: Club; body: any };
const actions: Record<string, (x: Ctx) => Promise<unknown>> = {
  async me({ supabase, c }) {
    const { data: club } = await supabase.from("vekt_clubs").select("id, name, state, sports").eq("id", c.club_id).single();
    return { account: { id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email, role: c.role }, club };
  },

  async health({ supabase, c, body }) {
    const days = [7, 30, 90].includes(Number(body.days)) ? Number(body.days) : null;
    const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined;
    const d = await rosterData(supabase, c.club_id, since);
    const rows = d.rows.filter((r: any) => r.status !== "not_pursuing");
    // Weekly activity for the last 12 weeks: coach actions and Interested replies.
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const end = new Date(Date.now() - (11 - i) * 7 * 86_400_000);
      const start = new Date(end.getTime() - 7 * 86_400_000);
      const inWeek = (t: string) => new Date(t) > start && new Date(t) <= end;
      return {
        week: end.toISOString().slice(0, 10),
        actions: d.actions.filter((x: any) => inWeek(x.created_at)).length,
        interested: d.recruits.filter((x: any) => x.decision === "interested" && x.decision_at && inWeek(x.decision_at)).length,
      };
    });
    const byDiv: Record<string, number> = {};
    for (const r of d.recruits) if (r.decision === "interested") { const dv = d.programs.get(r.program_id)?.division || "Other"; byDiv[dv] = (byDiv[dv] ?? 0) + 1; }
    return {
      totals: {
        athletes: rows.length, on_vekt: rows.filter((r: any) => r.on_vekt).length,
        coach_actions: d.actions.length, programs_engaging: new Set([...d.actions.map((x: any) => x.program_id), ...d.recruits.map((x: any) => x.program_id)]).size,
        invites: d.recruits.filter((x: any) => x.athlete_invited_at).length,
        interested: d.recruits.filter((x: any) => x.decision === "interested").length,
        committed: rows.filter((r: any) => r.status === "committed").length,
      },
      weeks, interest_by_division: byDiv,
      athletes: rows.sort((a: any, b: any) => (b.interested - a.interested) || (b.programs_engaged - a.programs_engaged) || (b.views - a.views)),
    };
  },

  async pipeline({ supabase, c }) {
    const d = await rosterData(supabase, c.club_id);
    return { stages: STAGES, athletes: d.rows.filter((r: any) => r.status !== "not_pursuing") };
  },

  async engagement({ supabase, c }) {
    const d = await rosterData(supabase, c.club_id);
    const by = new Map<string, any>();
    const get = (pid: string) => {
      if (!by.has(pid)) { const p = d.programs.get(pid); by.set(pid, { program: p?.institution ?? "A program", sport: p?.sport, division: p?.division ?? null, views: 0, saves: 0, invites: 0, interested: 0, athletes: new Set<string>() }); }
      return by.get(pid);
    };
    for (const x of d.actions) { const g = get(x.program_id); if (x.action === "watch_add") g.saves++; else g.views++; g.athletes.add(x.athlete_id); }
    for (const r of d.recruits) { const g = get(r.program_id); if (r.athlete_invited_at) g.invites++; if (r.decision === "interested") g.interested++; g.athletes.add(r.vekt_athlete_id); }
    const programs = [...by.values()].map((g) => ({ ...g, athletes: g.athletes.size })).sort((a, b) => (b.interested - a.interested) || (b.invites - a.invites) || (b.views + b.saves - a.views - a.saves));
    const divisions: Record<string, { programs: number; interested: number }> = {};
    for (const p of programs) { const k = p.division || "Other"; divisions[k] = divisions[k] ?? { programs: 0, interested: 0 }; divisions[k].programs++; divisions[k].interested += p.interested; }
    return { programs, divisions };
  },

  async funnel({ supabase, c }) {
    const d = await rosterData(supabase, c.club_id);
    const rows = d.rows.filter((r: any) => r.status !== "not_pursuing");
    const order = STAGES.map((x) => x.key);
    // Committed is recorded by the club and can happen off VEKT, so it's counted on
    // its own; the earlier steps count only what actually happened on VEKT.
    const reached = (r: any, k: string) => k === "committed" ? r.status === "committed" : order.indexOf(r.vekt_stage) >= order.indexOf(k);
    const steps = STAGES.slice(1).map((st) => ({ key: st.key, label: st.label, count: rows.filter((r: any) => reached(r, st.key)).length }));
    const years = [...new Set(rows.map((r: any) => r.grad_year).filter(Boolean))].sort();
    return {
      total: rows.length, steps,
      by_year: years.map((y) => {
        const ys = rows.filter((r: any) => r.grad_year === y);
        return { grad_year: y, athletes: ys.length, ...Object.fromEntries(STAGES.slice(1).map((st) => [st.key, ys.filter((r: any) => reached(r, st.key)).length])) };
      }),
    };
  },

  async commitments({ supabase, c }) {
    const d = await rosterData(supabase, c.club_id);
    const committed = d.rows.filter((r: any) => r.status === "committed");
    const close = d.rows.filter((r: any) => r.status === "active" && r.interested > 0).sort((a: any, b: any) => b.interested - a.interested || b.programs_engaged - a.programs_engaged).slice(0, 15);
    const byYear: Record<string, number> = {}, byDiv: Record<string, number> = {};
    for (const r of committed) { byYear[r.grad_year ?? "?"] = (byYear[r.grad_year ?? "?"] ?? 0) + 1; byDiv[r.committed_division || "Other"] = (byDiv[r.committed_division || "Other"] ?? 0) + 1; }
    return { committed, close, by_year: byYear, by_division: byDiv, active: d.rows.filter((r: any) => r.status === "active").length };
  },

  // The full roster for the Roster page, with contact fields the director entered.
  async roster({ supabase, c }) {
    const d = await rosterData(supabase, c.club_id);
    const { data: raw } = await supabase.from("club_athletes").select("id, athlete_email, parent_name, parent_email").eq("club_id", c.club_id);
    const extra = new Map<string, any>((raw || []).map((r: any) => [r.id, r]));
    return { athletes: d.rows.map((r: any) => ({ ...r, ...extra.get(r.id) })) };
  },

  async athlete_save({ supabase, c, body }) {
    director(c);
    const x = body.athlete || {};
    const row = {
      club_id: c.club_id, full_name: s(x.full_name, 120), sport: opt(x.sport, 40), team: opt(x.team, 80), grad_year: int(x.grad_year, 2024, 2040), position: opt(x.position, 60),
      athlete_email: email(x.athlete_email), parent_name: opt(x.parent_name, 120), parent_email: email(x.parent_email), updated_at: new Date().toISOString(),
    };
    if (!row.full_name) fail(400, "Add the athlete's name.");
    if (isUuid(x.id)) {
      const { data } = await supabase.from("club_athletes").update(row).eq("id", x.id).eq("club_id", c.club_id).select("id");
      if (!data?.length) fail(404, "Athlete not found.");
      await audit(supabase, c, "club_athlete_update", x.id);
      return { id: x.id };
    }
    const { data, error } = await supabase.from("club_athletes").insert(row).select("id");
    if (error) fail(400, error.message);
    await audit(supabase, c, "club_athlete_add", data[0].id);
    return { id: data[0].id };
  },

  async athlete_import({ supabase, c, body }) {
    director(c);
    const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, 500).map((x: any) => ({
      club_id: c.club_id, full_name: s(x.full_name, 120), sport: opt(x.sport, 40), team: opt(x.team, 80), grad_year: int(x.grad_year, 2024, 2040),
      position: opt(x.position, 60), athlete_email: email(x.athlete_email), parent_name: opt(x.parent_name, 120), parent_email: email(x.parent_email),
    })).filter((r: any) => r.full_name);
    if (!rows.length) fail(400, "No rows with a name.");
    const { error } = await supabase.from("club_athletes").insert(rows);
    if (error) fail(400, error.message);
    await audit(supabase, c, "club_athlete_import", null, { rows: rows.length });
    return { added: rows.length };
  },

  // Invite the family to start the athlete's own VEKT profile (parent approves first).
  async athlete_invite({ supabase, c, body }) {
    director(c);
    if (!isUuid(body.id)) fail(404, "Athlete not found.");
    const { data } = await supabase.from("club_athletes").select("*").eq("id", body.id).eq("club_id", c.club_id).limit(1);
    const r = data?.[0];
    if (!r) fail(404, "Athlete not found.");
    if (!r.parent_email && !r.athlete_email) fail(400, "Add a parent's email first (or the athlete's, if they're 18 or older).");
    if (!r.sport) fail(400, "Add the athlete's sport first.");
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/vekt-invites`, {
      method: "POST", headers: { "content-type": "application/json", "x-vekt-internal": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "" },
      body: JSON.stringify({ action: "club_invite", club_athlete_id: r.id }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) fail(400, out.error || "Couldn't send the invite.");
    await audit(supabase, c, "club_athlete_invite", r.id);
    return out;
  },

  async athlete_status({ supabase, c, body }) {
    director(c);
    if (!isUuid(body.id)) fail(404, "Athlete not found.");
    const status = ["active", "committed", "not_pursuing"].includes(body.status) ? body.status : fail(400, "Pick a status.");
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "committed") {
      patch.committed_program = opt(body.committed_program, 120) ?? fail(400, "Add the program they committed to.");
      patch.committed_division = opt(body.committed_division, 10);
      patch.committed_at = /^\d{4}-\d{2}-\d{2}$/.test(s(body.committed_at)) ? s(body.committed_at) : new Date().toISOString().slice(0, 10);
    } else { patch.committed_program = null; patch.committed_division = null; patch.committed_at = null; }
    const { data } = await supabase.from("club_athletes").update(patch).eq("id", body.id).eq("club_id", c.club_id).select("id");
    if (!data?.length) fail(404, "Athlete not found.");
    await audit(supabase, c, "club_athlete_status", body.id, { status, program: patch.committed_program ?? null });
    return { saved: true };
  },

  async athlete_delete({ supabase, c, body }) {
    director(c);
    if (!isUuid(body.id)) fail(404, "Athlete not found.");
    const { data } = await supabase.from("club_athletes").delete().eq("id", body.id).eq("club_id", c.club_id).select("id");
    if (data?.length) await audit(supabase, c, "club_athlete_delete", body.id);
    return { deleted: true };
  },

  async programs({ supabase, c, body }) {
    let q = supabase.from("college_programs").select("*", { count: "exact" }).or(`club_id.is.null,club_id.eq.${c.club_id}`);
    if (s(body.q)) q = q.or(`name.ilike.%${s(body.q, 60).replace(/[,()%]/g, "")}%,conference.ilike.%${s(body.q, 60).replace(/[,()%]/g, "")}%`);
    if (s(body.division)) q = q.eq("division", s(body.division, 10));
    if (/^[A-Za-z]{2}$/.test(s(body.state))) q = q.eq("state", s(body.state).toUpperCase());
    if (["public", "private"].includes(body.control)) q = q.eq("control", body.control);
    if (int(body.max_cost, 0, 200000)) q = q.lte("cost_per_year", int(body.max_cost, 0, 200000));
    if (num(body.min_acceptance, 0, 100)) q = q.gte("acceptance_rate", num(body.min_acceptance, 0, 100));
    if (s(body.sport)) q = q.contains("sports", [s(body.sport, 40)]);
    const offset = int(body.offset, 0, 100000) ?? 0;
    const { data, count } = await q.order("name").range(offset, offset + 29);
    return { programs: data || [], total: count ?? 0 };
  },

  async programs_import({ supabase, c, body }) {
    director(c);
    const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, 5000).map((x: any) => ({
      name: s(x.name, 160), conference: opt(x.conference, 120), division: opt(x.division, 10), city: opt(x.city, 80),
      state: /^[A-Za-z]{2}$/.test(s(x.state)) ? s(x.state).toUpperCase() : null,
      control: ["public", "private"].includes(s(x.control).toLowerCase()) ? s(x.control).toLowerCase() : null,
      avg_gpa: num(x.avg_gpa, 0, 5), cost_per_year: int(Math.round(Number(String(x.cost_per_year ?? "").replace(/[$,]/g, ""))), 0, 200000),
      acceptance_rate: num(String(x.acceptance_rate ?? "").replace(/%/g, ""), 0, 100), enrollment: int(Number(String(x.enrollment ?? "").replace(/,/g, "")), 0, 500000),
      sports: s(x.sports, 400).split(/[;,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean),
      staff_count: int(x.staff_count, 0, 200), source: opt(x.source, 200) ?? "club import", club_id: c.club_id,
    })).filter((r: any) => r.name);
    if (!rows.length) fail(400, "No rows with a school name.");
    const { error } = await supabase.from("college_programs").insert(rows);
    if (error) fail(400, error.message);
    await audit(supabase, c, "club_programs_import", null, { rows: rows.length });
    return { added: rows.length };
  },

  async export_roster({ supabase, c }) {
    const d = await rosterData(supabase, c.club_id);
    return {
      rows: d.rows.map((r: any) => ({
        "Athlete": csvSafe(r.full_name), "Grad Year": r.grad_year ?? "", "Position": csvSafe(r.position), "Team": csvSafe(r.team),
        "On VEKT": r.on_vekt ? "Yes" : r.pending_parent ? "Waiting on family" : "No", "Stage": r.stage_label,
        "Programs Engaged": r.programs_engaged, "Coach Views": r.views, "Saved by Programs": r.saves, "Invited by Programs": r.invites,
        "Interested": r.interested, "Interested Programs": r.interested_programs.join("; "),
        "Committed To": csvSafe(r.committed_program), "Committed On": r.committed_at ?? "",
      })),
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
    console.error(`VEKT_CLUB_ERROR action=${action}:`, (e as Error).message);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
