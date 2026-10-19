// End-to-end run against the local stack: `npm run db:reset`, `npm run functions`, then `npm run test:e2e`.
// Uses the seeded demo department (fictional). Model and GHL calls are mocked by the functions runner.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(execSync("npx supabase status -o env", { encoding: "utf8" })
  .split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const API = "http://127.0.0.1:54321";
const FN = `http://127.0.0.1:${process.env.DEV_FUNCTIONS_PORT || 54331}/functions/v1`;
const admin = createClient(API, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const APP_SECRET = process.env.VEKT_APP_SECRET || "dev-app-secret";
const GHL_TOKEN = process.env.VEKT_GHL_WEBHOOK_TOKEN || "dev-ghl-token";
const PROGRAM = "a0000000-0000-4000-8000-000000000001";
const OTHER_PROGRAM = "a0000000-0000-4000-8000-000000000002";
const R = { jordan: "20000000-0000-4000-8000-000000000001", marcus: "20000000-0000-4000-8000-000000000002", theo: "20000000-0000-4000-8000-000000000003", sam: "20000000-0000-4000-8000-000000000004" };

let passed = 0;
function check(cond, label, extra) {
  if (!cond) { console.error(`FAIL ${label}`, extra ?? ""); process.exit(1); }
  passed++; console.log(`ok   ${label}`);
}

async function signIn(email) {
  await admin.auth.admin.createUser({ email, password: "demo-password-1", email_confirm: true }).catch(() => null);
  const c = createClient(API, env.ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: "demo-password-1" });
  if (error) throw error;
  return data.session.access_token;
}
const coach = (token) => async (action, body = {}) => {
  const res = await fetch(`${FN}/vekt-coach`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ action, ...body }) });
  return { status: res.status, ...(await res.json()) };
};
const post = (name, body, headers = {}) => fetch(`${FN}/${name}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const setConfig = (key, value) => admin.from("app_config").update({ value }).eq("key", key);

// ---- Sign-in and scoping ----
const dana = coach(await signIn("dana.whitfield@northfield.example.edu"));
const marco = coach(await signIn("marco.ruiz@northfield.example.edu"));
const alex = coach(await signIn("alex.mercer@northfield.example.edu"));
const priya = coach(await signIn("priya.nand@northfield.example.edu"));
const stranger = coach(await signIn("someone@elsewhere.example.edu"));

const me = await dana("me");
check(me.account?.role === "head_coach" && me.programs.length === 1, "head coach sees only their program", me);
check((await stranger("me")).status === 403, "an email with no coach account is refused");
check((await dana("recruits", { program_id: OTHER_PROGRAM })).status === 404, "a coach can't open another team's board");
check((await fetch(`${FN}/vekt-coach`, { method: "POST", body: JSON.stringify({ action: "me" }) })).status === 401, "no token, no access");

// ---- Fit Reads (mock model) ----
for (const athlete of ["e0000000-0000-4000-8000-000000000001", "e0000000-0000-4000-8000-000000000002", "e0000000-0000-4000-8000-000000000003"]) {
  const fr = await post("vekt-fit-read", { athlete_id: athlete, program_id: PROGRAM }, { "x-vekt-app-secret": APP_SECRET });
  check(fr.report?.version === 1, `fit read written for ${athlete.slice(-1)}`, fr);
}
check((await post("vekt-fit-read", { athlete_id: "e0000000-0000-4000-8000-000000000001" })).status === 401, "fit-read needs the app secret");

const jordan = await dana("recruit", { id: R.jordan });
const rep = jordan.fit_read?.report;
check(rep?.self_awareness.level === "high" && rep.self_awareness.same_story === 7, "self-awareness computed in code (7 of 8 same story = High)", rep?.self_awareness);
check(rep.must_haves.length === 6 && rep.must_haves.every((m) => m.met === true), "Jordan meets all six must-haves", rep.must_haves);
check(rep.coaches.map((c) => c.name).join() === "Dana Whitfield,Marco Ruiz,Lee Okafor", "one card per coach on staff", rep.coaches);
check(!("invite_token" in jordan.recruit) && !JSON.stringify(jordan).includes("Demo athlete answer"), "no invite tokens or raw answers reach the dashboard");

const theo = await dana("recruit", { id: R.theo });
check(theo.fit_read.report.self_awareness.label === "Pending", "no director yet: self-awareness Pending");
check(theo.fit_read.report.must_haves.find((m) => m.key === "gpa").met === false, "Theo misses the GPA must-have");
check(theo.fit_read.report.must_haves.find((m) => m.key === "club_level").met === false, "Theo misses the club-level must-have");

const list = await dana("recruits", { program_id: PROGRAM });
const stages = Object.fromEntries(list.recruits.map((r) => [r.recruit_name, r.stage.key]));
check(stages["Jordan Ellis"] === "read_ready" && stages["Theo Brandt"] === "read_partial" && stages["Sam Ortiz"] === "waiting_parent" && stages["Chris Vance"] === "not_invited", "recruit stages", stages);

// ---- Add, invite (dry run), live (mock GHL), delivery webhook, STOP ----
const added = await dana("save_recruit", { program_id: PROGRAM, recruit: { recruit_name: "Riley Park", position: "Center back", grad_year: 2028, state: "WA", athlete_email: "riley.park@example.com", parent_name: "Jamie Park", parent_email: "jamie.park@example.com", club_coach_name: "Kim Lowe", club_coach_email: "kim.lowe@example.com" } });
check(!!added.id, "coach adds a recruit");
check((await dana("invite", { recruit_ids: [added.id] })).status === 400, "invites need the NCAA attestation");
const inv = await dana("invite", { recruit_ids: [added.id], attest: true });
check(inv.recruits?.[0]?.contact_status === "cleared" && inv.live === false, "contact calendar checked; test mode", inv);
let { data: ob } = await admin.from("vekt_outbox").select("*").eq("recruit_id", added.id);
check(ob.length === 3 && ob.every((o) => o.status === "dry_run"), "parent, athlete and club director queued; nothing sent in test mode", ob.map((o) => o.status));

await setConfig("invites_live", "true");
const resend = await dana("invite", { recruit_ids: [added.id], attest: true, resend: true });
({ data: ob } = await admin.from("vekt_outbox").select("*").eq("recruit_id", added.id).eq("status", "sent"));
check(ob.length === 3 && ob.every((o) => o.ghl_message_id?.startsWith("mock_msg_") && o.subject.startsWith("Reminder:")), "live: sent through GHL with message ids kept", resend);

const msgId = ob.find((o) => o.recipient_role === "parent").ghl_message_id;
const hook = (p) => post(`vekt-ghl-webhook?token=${GHL_TOKEN}`, p);
check((await post("vekt-ghl-webhook", { type: "OutboundMessage", messageId: msgId, status: "delivered" })).status === 401, "GHL webhook needs the token");
const d1 = await hook({ type: "OutboundMessage", messageId: msgId, status: "delivered", messageType: "Email" });
check(d1.matched === true, "delivery matched to the message", d1);
check((await hook({ type: "OutboundMessage", messageId: msgId, status: "delivered", messageType: "Email" })).status === "duplicate", "webhook retries dedupe");
await hook({ type: "LCEmailStats", event: "unsubscribed", id: msgId, email: "jamie.park@example.com" });
const { data: sup } = await admin.from("vekt_suppressions").select("*").eq("value", "jamie.park@example.com");
check(sup.length === 1 && sup[0].reason === "unsubscribe", "unsubscribe recorded");
await dana("invite", { recruit_ids: [added.id], attest: true, resend: true });
const { data: blocked } = await admin.from("vekt_outbox").select("status").eq("recruit_id", added.id).eq("to_address", "jamie.park@example.com").eq("status", "blocked");
check(blocked.length === 1, "opted-out parent is blocked on the next send");

// Texts respect quiet hours in the recipient's time zone (Hawaii: 9am-8pm HST).
await admin.from("comparison_recruits").update({ state: "HI", sms_opt_in: true, athlete_phone: "+12025550188" }).eq("id", added.id);
await dana("invite", { recruit_ids: [added.id], attest: true, resend: true });
const { data: sms } = await admin.from("vekt_outbox").select("status, scheduled_for").eq("recruit_id", added.id).eq("channel", "sms").order("created_at", { ascending: false }).limit(1);
const hst = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", hour: "numeric", hourCycle: "h23" }).format(new Date(sms[0].scheduled_for)));
check(hst >= 9 && hst < 20, `text scheduled inside quiet hours (${hst}:00 HST, ${sms[0].status})`);
await setConfig("invites_live", "false");

// ---- The athlete finishes their voice conversation (ElevenLabs webhook) ----
const { data: [riley] } = await admin.from("comparison_recruits").select("invite_token, club_invite_token").eq("id", added.id);
const answers = Object.fromEntries(["t1", "t2", "t3", "t4", "t5", "c1", "c2", "c3", "c4"].map((k) => [`${k}_response`, `Riley answer ${k}`]));
const wh = await post("vekt-webhook", { tool_call: { name: "save_athlete_vetting_data", parameters: { athlete_name: "Riley Park", sport: "soccer", position: "Center back", grad_year: "2028", is_minor: "yes", invite_token: riley.invite_token, ...answers } } },
  { "x-vekt-secret": process.env.VEKT_WEBHOOK_SECRET || "dev-webhook-secret" });
check(wh.status === "SUCCESS", "athlete conversation saved by the voice webhook", wh);
let rileyRead;
for (let i = 0; i < 40 && !rileyRead?.fit_read; i++) { rileyRead = await dana("recruit", { id: added.id }); if (!rileyRead.fit_read) await new Promise((r) => setTimeout(r, 250)); }
check(rileyRead.fit_read?.report?.self_awareness.level === "pending", "board recruit gets a Fit Read right away; self-awareness Pending until the director answers");
const predicted = Object.fromEntries(["t1", "t2", "t3", "t4", "t5", "c1", "c2", "c3", "c4"].map((k) => [`predicted_${k}`, `Kim predicts ${k}`]));
await post("vekt-webhook", { tool_call: { name: "save_coach_verification", parameters: { coach_name: "Kim Lowe", athlete_name: "Riley", sport: "soccer", invite_token: riley.club_invite_token, ...predicted } } },
  { "x-vekt-secret": process.env.VEKT_WEBHOOK_SECRET || "dev-webhook-secret" });
for (let i = 0; i < 40; i++) { rileyRead = await dana("recruit", { id: added.id }); if (rileyRead.fit_read?.report?.self_awareness.level !== "pending") break; await new Promise((r) => setTimeout(r, 250)); }
check(rileyRead.fit_read.report.self_awareness.level === "high" && rileyRead.recruit.stage.key === "read_ready", "director finishes: the read is rewritten with self-awareness", rileyRead.recruit.stage);

// ---- Reminders ----
const rem = await post("vekt-invites", { action: "send_reminders" }, { "x-vekt-internal": env.SERVICE_ROLE_KEY });
const { data: samRem } = await admin.from("vekt_outbox").select("recipient_role, kind").eq("recruit_id", R.sam).eq("kind", "reminder");
check(rem.reminded >= 1 && samRem.length > 0 && samRem.every((x) => x.recipient_role === "parent"), "day-3 reminder goes to the parent who hasn't approved", rem);
check((await post("vekt-invites", { action: "send_reminders" })).status === 401, "internal actions need the service key");

// ---- Side-by-Side ----
check((await dana("side_by_side_create", { program_id: PROGRAM, recruit_ids: [R.jordan] })).status === 400, "side-by-side needs 2 to 4");
check((await dana("side_by_side_create", { program_id: PROGRAM, recruit_ids: [R.jordan, "20000000-0000-4000-8000-000000000005"] })).status === 400, "side-by-side needs one position");
const sbs = await dana("side_by_side_create", { program_id: PROGRAM, recruit_ids: [R.jordan, R.marcus, R.theo, R.sam] });
let got;
for (let i = 0; i < 40; i++) { got = await dana("side_by_side_get", { id: sbs.id }); if (got.side_by_side.status !== "pending") break; await new Promise((r) => setTimeout(r, 250)); }
check(got.side_by_side.status === "ready" && got.side_by_side.report.athletes.length === 4, "Side-by-Side ready for four center backs", got.side_by_side);
check(got.side_by_side.report.athletes.find((a) => a.name === "Sam Ortiz").self_awareness_label === "Pending", "unfinished recruit shows Pending, not a guess");
check(got.side_by_side.report.who_first.length >= 1 && got.athletes.every((a) => "report" in a), "who to call first, plus each Fit Read for the tables");

// ---- Decisions ----
const dec = await dana("decision", { recruit_id: R.jordan, decision: "interested", message: "We'd like to see you at our ID camp." });
const { data: decOb } = await admin.from("vekt_outbox").select("recipient_role").eq("recruit_id", R.jordan).eq("kind", "decision");
check(dec.decision === "interested" && decOb.map((x) => x.recipient_role).sort().join() === "athlete,parent", "Interested goes to the athlete with a parent copied", dec);
const nf = await dana("decision", { recruit_id: R.theo, decision: "not_a_fit" });
const { data: nfOb } = await admin.from("vekt_outbox").select("id").eq("recruit_id", R.theo).eq("kind", "decision");
check(nf.sent === false && nfOb.length === 0, "Not a fit is recorded, nothing is sent");

// ---- Roles ----
check((await marco("staff_save", { program_id: PROGRAM, staff: { name: "X" } })).status === 403, "assistants can't change staff profiles");
check((await priya("save_recruit", { program_id: PROGRAM, recruit: { recruit_name: "X" } })).status === 403, "compliance is read-only");
const st = await dana("staff_save", { program_id: PROGRAM, staff: { name: "Jess Moore", title: "Goalkeeper coach", traits: "Calm, Technical" } });
check(!!st.id, "head coach adds a staff profile");
check((await dana("program_save", { program_id: PROGRAM, must_haves: { positions: "Center back, Fullback", min_gpa: 3.0, max_family_cost: 22000 }, reminder_days: [2, 5] })).saved, "head coach sets must-haves and reminder days");

// ---- Department, compliance, season-one ----
const dept = await alex("department");
check(dept.programs?.length === 2 && dept.pricing?.price_all_sports_cents === 2500000, "department admin sees every program and the license", dept.pricing);
const acct = await alex("account_save", { account: { first_name: "New", last_name: "Coach", email: "new.coach@gmail.com", role: "assistant_coach" } });
check(acct.status === 400 && /edu/.test(acct.error), "coach accounts need a school email", acct);
const log = await priya("compliance_log", {});
check(log.rows?.length > 0 && log.rows.every((r) => r.contact_rule !== undefined) && log.audit.some((a) => a.action === "invite"), "compliance log has every contact with its rule and attestation");
check((await dana("compliance_log", {})).status === 403, "coaches don't see the compliance log");
check(!!(await dana("season_check_save", { recruit_id: R.jordan, season: "2029", read_held_up: "yes", still_on_roster: true })).id, "season-one check saved");
const { data: tr } = await admin.from("club_director_track_record").select("*").eq("director_key", "chris dalton");
check(tr?.[0]?.held_up === 1, "club director track record counts the held-up read", tr);
const anon = createClient(API, env.ANON_KEY, { auth: { persistSession: false } });
const { data: leak } = await anon.from("comparison_recruits").select("id");
check(!leak?.length, "the public key reads nothing (RLS on, no policies)");

// ---- Player profiles: athlete, club director, program systems ----
const tok = async (name) => (await admin.from("comparison_recruits").select("id, invite_token, club_invite_token").eq("recruit_name", name)).data[0];
const sam = await tok("Sam Ortiz");
check((await post("vekt-invites", { action: "profile_load", token: sam.invite_token })).status === "needs_consent", "athlete profile waits for a parent's approval");
check((await post("vekt-invites", { action: "profile_save", token: sam.invite_token, profile: {} })).status === 403, "no saving before a parent approves");
const theoT = await tok("Theo Brandt");
const prof = await post("vekt-invites", { action: "profile_save", token: theoT.invite_token, submit: true, profile: {
  primary_position: "Center back", systems: { formation: ["3-5-2", "made-up"] }, skills: { first_touch: "solid", aerial_duels: "strength", weak_foot: 7 }, measurables: { height: "75" } } });
check(prof.status === "saved", "athlete saves their profile");
const { data: [tp] } = await admin.from("athlete_profiles").select("systems, skills").eq("recruit_id", theoT.id);
check(JSON.stringify(tp.systems) === '{"formation":["3-5-2"]}' && !("weak_foot" in tp.skills), "only catalog values are stored", tp);
check((await post("vekt-invites", { action: "club_save", token: theoT.invite_token, evaluation: {} })).status === 404, "the athlete's link can't open the club director's form");
const ce = await post("vekt-invites", { action: "club_save", token: theoT.club_invite_token, submit: true, evaluation: {
  primary_position: "Center back", team_systems: { formation: ["3-5-2"] }, skills: { first_touch: "developing", aerial_duels: "strength" }, measurables: { height: "75" } } });
check(ce.status === "saved", "club director saves their read");
const cl = await post("vekt-invites", { action: "club_load", token: (await tok("Jordan Ellis")).club_invite_token });
check(cl.others.some((o) => o.name === "Chris Vance") && !JSON.stringify(cl.others).includes("-4"), "club director sees their other athletes by name, without their links");
const theoDetail = await dana("recruit", { id: R.theo });
const pl = theoDetail.player;
check(pl.skills.compared === 2 && pl.skills.same === 1 && pl.skills.athlete_higher === 1, "hard-skills read compares the two forms", pl.skills);
check(pl.systems.find((x) => x.group === "formation").verdict === "plays_yours", "systems checked against the program's");
check(pl.measurables.find((x) => x.key === "height").status === "confirmed", "a matching number shows as confirmed by the director");
check((await marco("program_save", { program_id: PROGRAM, systems: { formation: ["4-4-2"] } })).status === 403, "assistants can't change the program's systems");
await dana("program_save", { program_id: PROGRAM, systems: { formation: ["4-4-2", "nonsense"] }, must_haves: { positions: "Center back" } });
check((await dana("program_get", { program_id: PROGRAM })).program.systems.formation.join() === "4-4-2", "head coach sets the systems they run");
const list2 = await dana("recruits", { program_id: PROGRAM });
check(list2.recruits.find((r) => r.recruit_name === "Theo Brandt").club_eval_in === true, "recruit list shows who has sent a profile and a club read");

// ---- Athlete-owned profile, sharing, feed, watch list ----
const pr = (action, token, body = {}) => post("vekt-invites", { action, token, ...body });
// Jordan's shared profile: an update can go to every program at once.
const jordanAth = (await admin.from("vekt_athletes").select("manage_token, parent_token").eq("id", "30000000-0000-4000-8000-000000000001")).data[0];
const meJ = await pr("me_load", jordanAth.manage_token);
check(meJ.programs.length === 1 && meJ.programs[0].status === "shared", "athlete sees which programs have their profile");
const saveJ = await pr("me_save", jordanAth.manage_token, { profile: { ...meJ.athlete.profile, measurables: { height: "75" } }, videos: [
  { kind: "highlight", url: "https://youtu.be/VEKTdemo001" }, { kind: "full_game", url: "https://evil.example/x" }, { kind: "made_up", url: "https://youtu.be/abcdefghijk" }] });
check(saveJ.synced === 1, "update sent to every program they share with", saveJ);
const { data: jp } = await admin.from("athlete_profiles").select("measurables").eq("recruit_id", R.jordan);
check(jp[0].measurables.height === "75", "the program's copy updated together");
const { data: jv } = await admin.from("athlete_videos").select("kind, youtube_id").eq("athlete_id", "30000000-0000-4000-8000-000000000001");
check(jv.length === 1 && jv[0].youtube_id === "VEKTdemo001", "only valid video links of known types are kept");
const jd = await dana("recruit", { id: R.jordan });
check(jd.profile_shared && jd.videos.length === 1, "the program sees the shared videos");

// Join without an invite (a freshman), parent approval, feed opt-in.
check((await post("vekt-invites", { action: "join", is_minor: true, athlete: { full_name: "Noah Park", sport: "soccer" } })).status === 400, "under-18s need a parent email to join");
check((await post("vekt-invites", { action: "join", is_minor: true, athlete: { full_name: "Noah Park", sport: "soccer", team_gender: "men", grad_year: 2030, state: "NJ" }, parent: { name: "Sue Park", email: "sue.park@example.com" } })).status === "check_email", "freshman starts a profile");
const noah = (await admin.from("vekt_athletes").select("*").eq("full_name", "Noah Park")).data[0];
const { data: noahMail } = await admin.from("vekt_outbox").select("to_address, subject").eq("to_address", "sue.park@example.com");
check(noahMail.length === 2, "parent gets the approval link and the profile link", noahMail);
await pr("me_save", noah.manage_token, { profile: { primary_position: "Center back" }, videos: [{ kind: "highlight", url: "https://youtube.com/watch?v=NOAHdemo001" }], feed_visible: true });
let feed1 = await dana("feed", { program_id: PROGRAM });
check(!feed1.videos.some((v) => v.athlete.full_name === "Noah Park"), "not in the feed before a parent approves it");
check((await pr("parent_save", noah.parent_token, { approve: true, feed_visible: true })).feed_visible === true, "parent approves the profile and the feed");
feed1 = await dana("feed", { program_id: PROGRAM });
const noahCard = feed1.videos.find((v) => v.athlete.full_name === "Noah Park");
check(noahCard && noahCard.athlete.contact.open === false && noahCard.athlete.contact.date === "2028-06-15", "freshman shows in the feed with the date contact opens");
check(!JSON.stringify(feed1).includes("@example.com"), "the feed never shows contact details");
check(!feed1.videos.some((v) => v.athlete.full_name === "Ava Lindqvist"), "a men's program doesn't see women's players");
check(!feed1.videos.some((v) => v.athlete.full_name === "Jordan Ellis"), "athletes who didn't opt in stay out of the feed");
check(feed1.videos.filter((v) => v.athlete.grad_year === 2030).length >= 2, "freshmen are in the feed");

// Watch list: save a freshman, can't invite until contact opens; invite a junior.
await dana("watch_add", { program_id: PROGRAM, athlete_id: noah.id, note: "Composed on the ball" });
const wl = await dana("watch_list", { program_id: PROGRAM });
check(wl.athletes.some((a) => a.full_name === "Noah Park" && a.note === "Composed on the ball"), "freshman saved to the watch list");
const early = await dana("watch_invite", { program_id: PROGRAM, athlete_id: noah.id, attest: true });
check(early.status === 400 && /2028-06-15/.test(early.error), "can't invite before NCAA contact opens", early);
const eli = "30000000-0000-4000-8000-000000000004";
await dana("watch_add", { program_id: PROGRAM, athlete_id: eli });
const inv2 = await dana("watch_invite", { program_id: PROGRAM, athlete_id: eli, attest: true });
check(!!inv2.recruit_id, "a junior on the watch list can be invited", inv2);
const eliDetail = await dana("recruit", { id: inv2.recruit_id });
check(eliDetail.recruit.parent_email === "Hidden until the family shares", "family contact stays hidden until they share");
const eliTok = (await admin.from("comparison_recruits").select("invite_token").eq("id", inv2.recruit_id)).data[0].invite_token;
await admin.from("comparison_recruits").update({ consent_id: "10000000-0000-4000-8000-000000000003" }).eq("id", inv2.recruit_id);
const eliLoad = await pr("profile_load", eliTok);
check(eliLoad.share_prompt === true, "the invited family is asked to share their existing VEKT profile");
await pr("profile_share", eliTok, { share: true });
const eliAfter = await dana("recruit", { id: inv2.recruit_id });
check(eliAfter.profile_shared && eliAfter.recruit.parent_email === "dana.brooks@example.com" && eliAfter.player.profile.primary_position === "Striker", "saying yes loads the profile and reveals contact details");
check((await dana("athlete_card", { program_id: PROGRAM, athlete_id: "30000000-0000-4000-8000-000000000005" })).status === 404, "a profile outside this program's feed and not shared can't be opened");
check((await dana("athlete_card", { program_id: PROGRAM, athlete_id: "30000000-0000-4000-8000-000000000001" })).videos.length === 1, "a profile shared with this program opens, with its video");

console.log(`\n${passed} checks passed`);
