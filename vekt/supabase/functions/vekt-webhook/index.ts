import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vekt-secret",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ---- Auth --------------------------------------------------------------
// Accepts VEKT_WEBHOOK_SECRET (current) and VEKT_WEBHOOK_SECRET_PREVIOUS (during a rotation).
// LEGACY: the old hardcoded value is accepted ONLY while neither secret is set, so nothing breaks
// before the secrets are added. Once VEKT_WEBHOOK_SECRET exists, the legacy value stops working.
const LEGACY = "MOBEX_TRIAD_2026";
function allowedSecrets(): string[] {
  const cur = Deno.env.get("VEKT_WEBHOOK_SECRET") || "";
  const prev = Deno.env.get("VEKT_WEBHOOK_SECRET_PREVIOUS") || "";
  const list = [cur, prev].filter((s) => s.length > 0);
  if (!list.length) {
    console.warn("VEKT_AUTH_WARNING: no VEKT_WEBHOOK_SECRET set; legacy secret still accepted");
    return [LEGACY];
  }
  return list;
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---- Helpers -----------------------------------------------------------
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
// Drop unfilled template tags like "{{club_name}}"
const real = (v: unknown) => { const s = str(v); return s && !/^\{\{.*\}\}$/.test(s) ? s : ""; };
const opt = (v: unknown) => real(v) || null;
const bool = (v: unknown) => { const s = str(v).toLowerCase(); return s === "yes" || s === "true" ? true : s === "no" || s === "false" ? false : null; };
const uuid = (v: unknown) => { const s = str(v); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };
const entryPath = (v: unknown) => { const s = str(v).toLowerCase(); return s === "intake" || s === "coach_invite" ? s : null; };
const sessionType = (v: unknown) => { const s = str(v).toLowerCase(); return s === "program_profile" || s === "recruit_comparison" ? s : null; };
// jsonb columns: keep real JSON when the agent sends it, else store the text as a JSON string.
const jsonish = (v: unknown) => {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
};
// Scenario IDs line up across all three agents: T1–T5, C1–C4, S1–S2.
const sportId = (v: unknown, fallback: string) => {
  const m = str(v).match(/S\s*-?\s*([12])\b/i);
  return m ? `S${m[1]}` : fallback;
};

type ScenarioRow = {
  conversation_id: string | null; respondent_type: "athlete" | "club_coach" | "college_coach";
  athlete_id?: string | null; coach_verification_id?: string | null; program_id?: string | null;
  sport: string | null; scenario_id: string; response_text: string;
};
async function saveScenarios(supabase: any, rows: ScenarioRow[]) {
  const filled = rows.filter((r) => r.response_text);
  if (!filled.length) return { saved: 0, error: null as string | null };
  const { error } = await supabase.from("scenario_responses").insert(filled);
  return { saved: error ? 0 : filled.length, error: error?.message ?? null };
}

// ---- Recruit comparison wiring -----------------------------------------------
const FN = (name: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
async function callInternal(name: string, body: unknown) {
  try {
    const res = await fetch(FN(name), {
      method: "POST",
      headers: { "content-type": "application/json", "x-vekt-internal": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`internal ${name} ${res.status}`);
  } catch (e) { console.error(`internal ${name} failed: ${(e as Error).message}`); }
}
// When every invited recruit has both conversations done (and there are at least two), build the side-by-side.
// Recruits added from the coach dashboard sit on the program's standing "board": each gets its own
// Fit Read as soon as the athlete finishes (self-awareness shows Pending until the club director
// answers), and the read is rewritten when the director finishes.
async function maybeCompare(supabase: any, comparisonId: string, recruitId?: string) {
  const { data: comp } = await supabase.from("recruit_comparisons").select("kind, program_id").eq("id", comparisonId).limit(1);
  if (comp?.[0]?.kind === "board") {
    if (!recruitId || !comp[0].program_id) return;
    const { data: rr } = await supabase.from("comparison_recruits").select("athlete_id, athlete_done").eq("id", recruitId).limit(1);
    const rec = rr?.[0];
    if (!rec?.athlete_id || !rec.athlete_done) return;
    const { data: t } = await supabase.from("fit_read_requests").insert({ athlete_id: rec.athlete_id, program_id: comp[0].program_id }).select("id");
    if (t?.[0]) {
      await fetch(FN("vekt-fit-read"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request_id: t[0].id }) })
        .catch((e) => console.error(`fit-read trigger failed: ${(e as Error).message}`));
    }
    return;
  }
  const { data: rs } = await supabase.from("comparison_recruits").select("athlete_done, club_coach_done, contact_status").eq("comparison_id", comparisonId);
  const live = (rs || []).filter((r: any) => r.contact_status === "cleared");
  if (live.length < 2 || !live.every((r: any) => r.athlete_done && r.club_coach_done)) return;
  const { data: t } = await supabase.from("fit_read_requests").insert({ comparison_id: comparisonId }).select("id");
  if (t?.[0]) {
    await supabase.from("recruit_comparisons").update({ status: "in_progress" }).eq("id", comparisonId);
    await fetch(FN("vekt-fit-read"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request_id: t[0].id }) })
      .catch((e) => console.error(`fit-read trigger failed: ${(e as Error).message}`));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = new URL(req.url);
  const given = req.headers.get("x-vekt-secret") || url.searchParams.get("secret") || "";
  if (!allowedSecrets().some((s) => safeEqual(given, s))) {
    console.error("VEKT_AUTH_FAILED");
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const body = await req.json();

    const toolName = body.tool_call?.name || body.name || body.tool_name || body.event || body.type || "";
    const args = body.tool_call?.parameters || body.parameters || body.args || body.data || body.analysis?.data_collection_results || body;
    const conversationId = real(args.conversation_id || body.conversation_id || body.call_id || body.data?.conversation_id) || null;

    // Log keys only. Interview answers (often from minors) never go to the logs.
    console.log(`TRIAD: tool='${toolName}' conv='${conversationId}' keys=[${Object.keys(args).join(",")}]`);

    // ---------------- PILLAR 1: Program DNA (college coach) ----------------
    if (toolName === "save_program_dna" || toolName === "program_dna" || args.institution) {
      const sport = real(args.sport) || null;
      const session = sessionType(args.session_type);
      const institution = real(args.institution);
      const coachRows: Array<[string, unknown]> = [
        ["T1", args.coach_t1], ["T2", args.coach_t2], ["T3", args.coach_t3], ["T4", args.coach_t4], ["T5", args.coach_t5],
        ["C1", args.coach_c1], ["C2", args.coach_c2], ["C3", args.coach_c3], ["C4", args.coach_c4],
        ["S1", args.coach_s1], ["S2", args.coach_s2],
      ];
      const hasProfile = !!(real(args.tactical_identity) || real(args.position_prototypes) || coachRows.some(([, v]) => real(v)));

      // A recruit comparison from a coach who already has a profile reuses that profile.
      let programId: string | null = null;
      if (session === "recruit_comparison" && !hasProfile && institution) {
        let q = supabase.from("program_dna").select("id").ilike("institution", institution.replace(/[%_]/g, ""));
        if (sport) q = q.ilike("sport", sport);
        const { data: existing } = await q.order("created_at", { ascending: false }).limit(1);
        programId = existing?.[0]?.id ?? null;
      }

      if (!programId) {
        const payload = {
          conversation_id: conversationId,
          coach_name: real(args.coach_name) || "Head Coach",
          institution: institution || "University Program",
          sport,
          division: opt(args.division),
          session_type: session,
          tactical_identity: opt(args.tactical_identity || args.tactical_system),
          position_prototypes: jsonish(args.position_prototypes),
          red_flags: jsonish(args.failure_stories || args.anti_profile),
          green_flags: jsonish(args.overachiever_stories),
          locker_room_norms: opt(args.locker_room_norms),
          trait_ranking: jsonish(args.trait_rankings || args.trait_ranking),
          style_setbacks: opt(args.coach_c1),
          style_feedback: opt(args.coach_c2),
          style_motivation: opt(args.coach_c3),
          style_closeness: opt(args.coach_c4),
          recruits_raw: opt(args.recruits_comparison_data),
          // legacy fields, still accepted
          tactical_assets: opt(args.tactical_assets),
          psychological_assets: opt(args.psychological_assets),
          coaching_style: opt(args.coaching_style),
          roster_needs: jsonish(args.roster_needs),
        };
        const { data, error } = await supabase.from("program_dna").insert(payload).select("id");
        if (error) throw new Error(`program_dna insert error: ${error.message}`);
        programId = data?.[0]?.id ?? null;
      }

      const sc = await saveScenarios(supabase, coachRows.map(([id, v]) => ({
        conversation_id: conversationId, respondent_type: "college_coach", program_id: programId,
        sport, scenario_id: id, response_text: real(v),
      })));

      let comparisonId: string | null = null;
      if (session === "recruit_comparison" && real(args.recruits_comparison_data)) {
        const coachEmail = real(args.coach_email).toLowerCase();
        const { data, error } = await supabase.from("recruit_comparisons")
          .insert({
            program_id: programId, status: "requested", request_notes: real(args.recruits_comparison_data),
            sport, division: opt(args.division), team_gender: opt(args.team_gender),
            coach_name: opt(args.coach_name), coach_email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(coachEmail) ? coachEmail : null,
          })
          .select("id");
        if (error) console.error(`recruit_comparisons insert error: ${error.message}`);
        comparisonId = data?.[0]?.id ?? null;
        // Turn the spoken recruit list into rows and email the coach a link to confirm contacts.
        if (comparisonId) await callInternal("vekt-invites", { action: "prepare", comparison_id: comparisonId });
      }

      console.log(`TRIAD_SAVED program_dna id=${programId} scenarios=${sc.saved} comparison=${comparisonId ?? "none"}`);
      if (sc.error) console.error(`scenario_responses insert error: ${sc.error}`);
      return json({ status: sc.error ? "PARTIAL" : "SUCCESS", pillar: "Program DNA", id: programId, scenarios_saved: sc.saved, comparison_id: comparisonId });
    }

    // ---------------- PILLAR 2: Athlete read ----------------
    if (toolName === "save_athlete_vetting_data" || toolName === "athlete_vetting" || args.t1_response || args.metacognition_narrative) {
      const sport = real(args.sport) || null;
      const consentId = uuid(args.consent_id);
      const payload = {
        conversation_id: conversationId,
        athlete_name: real(args.athlete_name),
        sport,
        primary_position: opt(args.position || args.primary_position),
        current_team: opt(args.current_team || args.club_name),
        grad_year: opt(args.grad_year),
        is_minor: bool(args.is_minor),
        parent_name: opt(args.parent_name),
        consent_id: consentId,
        entry_path: entryPath(args.entry_path),
        inviting_program_name: opt(args.inviting_program),
        closing_answer: opt(args.closing_answer),
        // legacy fields, still accepted
        metacognition_narrative: opt(args.metacognition_narrative),
        feedback_receptivity_narrative: opt(args.feedback_receptivity_narrative),
        locus_of_control_narrative: opt(args.locus_of_control_narrative),
        social_intelligence_narrative: opt(args.social_intelligence_narrative),
        cognitive_load_narrative: opt(args.cognitive_load_narrative),
      };
      const { data, error } = await supabase.from("athlete_vetting").insert(payload).select("id");
      if (error) throw new Error(`athlete_vetting insert error: ${error.message}`);
      const athleteId = data?.[0]?.id ?? null;

      if (consentId && conversationId) {
        await supabase.from("interview_consents").update({ conversation_id: conversationId }).eq("id", consentId).is("conversation_id", null);
      }

      const rows: Array<[string, unknown]> = [
        ["T1", args.t1_response], ["T2", args.t2_response], ["T3", args.t3_response], ["T4", args.t4_response], ["T5", args.t5_response],
        ["C1", args.c1_response], ["C2", args.c2_response], ["C3", args.c3_response], ["C4", args.c4_response],
        [sportId(args.sport_scenario_1_id, "S1"), args.sport_scenario_1_response],
        [sportId(args.sport_scenario_2_id, "S2"), args.sport_scenario_2_response],
      ];
      const sc = await saveScenarios(supabase, rows.map(([id, v]) => ({
        conversation_id: conversationId, respondent_type: "athlete", athlete_id: athleteId,
        sport, scenario_id: id, response_text: real(v),
      })));

      // Invited through a recruit comparison? Link this athlete to the recruit, and to a club coach who may have finished first.
      const inviteToken = uuid(args.invite_token);
      if (inviteToken && athleteId) {
        const { data: rec } = await supabase.from("comparison_recruits").select("id, comparison_id, coach_verification_id").eq("invite_token", inviteToken).limit(1);
        const r = rec?.[0];
        if (r) {
          await supabase.from("comparison_recruits").update({ athlete_id: athleteId, athlete_done: true }).eq("id", r.id);
          await supabase.from("athlete_vetting").update({ entry_path: "coach_invite" }).eq("id", athleteId);
          if (r.coach_verification_id) {
            await supabase.from("coach_verifications").update({ athlete_id: athleteId, link_method: "invite_token" }).eq("id", r.coach_verification_id);
            await supabase.from("scenario_responses").update({ athlete_id: athleteId }).eq("coach_verification_id", r.coach_verification_id);
          }
          await maybeCompare(supabase, r.comparison_id, r.id);
        }
      }

      console.log(`TRIAD_SAVED athlete_vetting id=${athleteId} scenarios=${sc.saved} consent=${consentId ? "yes" : "no"}`);
      if (sc.error) console.error(`scenario_responses insert error: ${sc.error}`);
      return json({ status: sc.error ? "PARTIAL" : "SUCCESS", pillar: "Athlete Read", id: athleteId, scenarios_saved: sc.saved });
    }

    // ---------------- PILLAR 3: Club coach verification ----------------
    if (toolName === "verify_athlete_claims" || toolName === "save_coach_verification" || args.predicted_t1 || args.verified_metacognition) {
      const sport = real(args.sport) || null;
      const athleteName = real(args.athlete_name || args.athlete_first_name);

      // Link to the athlete only on a sure match. A first name alone is never enough:
      // a wrong link would attach one minor's read to another. Unsure = human review.
      let athleteId = uuid(args.athlete_id);
      let linkMethod = athleteId ? "athlete_id" : "needs_review";
      // Invited through a recruit comparison: the invite token names the recruit, even if the athlete hasn't talked yet.
      const clubToken = uuid(args.invite_token);
      let clubRecruit: any = null;
      if (clubToken) {
        const { data: rec } = await supabase.from("comparison_recruits").select("id, comparison_id, athlete_id").eq("club_invite_token", clubToken).limit(1);
        clubRecruit = rec?.[0] ?? null;
        if (clubRecruit) {
          if (!athleteId && clubRecruit.athlete_id) athleteId = clubRecruit.athlete_id;
          linkMethod = athleteId ? "invite_token" : "invite_token_pending";
        }
      }
      if (!athleteId && real(args.athlete_conversation_id)) {
        const { data: m } = await supabase.from("athlete_vetting").select("id").eq("conversation_id", real(args.athlete_conversation_id)).limit(2);
        if (m && m.length === 1) { athleteId = m[0].id; linkMethod = "athlete_conversation_id"; }
      }

      const payload = {
        conversation_id: conversationId,
        athlete_id: athleteId,
        athlete_name: athleteName,
        sport,
        position: opt(args.position),
        grad_year: opt(args.grad_year),
        club_coach_name: real(args.coach_name || args.club_coach_name) || "Club Coach",
        club_name: opt(args.club_name),
        team_name: opt(args.team_name),
        entry_path: entryPath(args.entry_path),
        inviting_program_name: opt(args.inviting_program),
        coaching_context: opt(args.coaching_context),
        anchor_example: opt(args.anchor_example),
        development_trajectory: opt(args.development_trajectory),
        comparison_answer: opt(args.peer_comparison),
        next_coach_advice: opt(args.next_coach_keys),
        link_method: linkMethod,
        // legacy fields, still accepted
        verified_metacognition: opt(args.verified_metacognition),
        verified_feedback_receptivity: opt(args.verified_feedback_receptivity),
        verified_locus_of_control: opt(args.verified_locus_of_control),
        verified_social_intelligence: opt(args.verified_social_intelligence),
        verified_cognitive_load: opt(args.verified_cognitive_load),
      };
      const { data, error } = await supabase.from("coach_verifications").insert(payload).select("id");
      if (error) throw new Error(`coach_verifications insert error: ${error.message}`);
      const cvId = data?.[0]?.id ?? null;

      const rows: Array<[string, unknown]> = [
        ["T1", args.predicted_t1], ["T2", args.predicted_t2], ["T3", args.predicted_t3], ["T4", args.predicted_t4], ["T5", args.predicted_t5],
        ["C1", args.predicted_c1], ["C2", args.predicted_c2], ["C3", args.predicted_c3], ["C4", args.predicted_c4],
        ["S1", args.predicted_sport_s1], ["S2", args.predicted_sport_s2],
      ];
      const sc = await saveScenarios(supabase, rows.map(([id, v]) => ({
        conversation_id: conversationId, respondent_type: "club_coach", athlete_id: athleteId, coach_verification_id: cvId,
        sport, scenario_id: id, response_text: real(v),
      })));

      if (clubRecruit && cvId) {
        await supabase.from("comparison_recruits").update({ coach_verification_id: cvId, club_coach_done: true }).eq("id", clubRecruit.id);
        await maybeCompare(supabase, clubRecruit.comparison_id, clubRecruit.id);
      }

      console.log(`TRIAD_SAVED coach_verifications id=${cvId} link=${linkMethod} scenarios=${sc.saved}`);
      if (sc.error) console.error(`scenario_responses insert error: ${sc.error}`);
      return json({ status: sc.error ? "PARTIAL" : "SUCCESS", pillar: "Club Coach Verification", id: cvId, link: linkMethod, scenarios_saved: sc.saved });
    }

    throw new Error(`Unrecognized Triad payload. Keys: ${Object.keys(args).join(", ")}`);
  } catch (err) {
    console.error("TRIAD_BRIDGE_ERROR:", (err as Error).message);
    return json({ status: "ERROR", error: (err as Error).message }, 400);
  }
});
