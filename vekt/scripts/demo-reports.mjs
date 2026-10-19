// Demo content for the seeded, fictional recruits: realistic Fit Reads for
// showing the dashboard. Run after `npm run db:reset` with `npm run functions`
// up: `node scripts/demo-reports.mjs`. Never run against production.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(execSync("npx supabase status -o env", { encoding: "utf8" })
  .split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const FN = `http://127.0.0.1:${process.env.DEV_FUNCTIONS_PORT || 54331}/functions/v1`;
const admin = createClient("http://127.0.0.1:54321", env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PROGRAM = "a0000000-0000-4000-8000-000000000001";
const TRAITS = ["Tactical identity", "Coaching in training", "Game-day leadership", "Physical demands", "Film and preparation", "Accountability", "Connecting with coaches", "Academics"];
const GROUP = (t) => (TRAITS.indexOf(t) < 4 ? "on_field" : "off_field");
const LABEL = { high: "High", moderate: "Moderate", low: "Big gaps", pending: "Pending" };

function level(traits, hasDirector) {
  const covered = traits.filter((t) => t.verdict !== "not_covered");
  const same = covered.filter((t) => t.verdict === "same_story").length;
  const contra = covered.filter((t) => t.verdict === "contradiction").length;
  const lvl = !hasDirector || !covered.length ? "pending" : contra === 0 && same >= Math.ceil(covered.length * 0.75) ? "high" : contra >= 2 || same < covered.length / 2 ? "low" : "moderate";
  return { level: lvl, label: LABEL[lvl], same_story: same, covered: covered.length, contradictions: contra };
}

const STAFF_SAID = [
  "Center backs step into midfield and organize the line. We press high and build out under pressure.",
  "We correct on the spot, in front of the group, and expect it fixed in the next rep.",
  "Our back line talks constantly. The center back runs it, not the keeper.",
  "Ninety minutes of high press, twice a week, plus lifting. Recovery is on the player.",
  "Players ask for film on their own and come to meetings with questions.",
  "Own the mistake in front of the group, then move on.",
  "Professional, door open, not a friend. Players come to us.",
  "3.0 or better, and nobody misses class to train.",
];

const READS = {
  "e0000000-0000-4000-8000-000000000001": {
    director: true,
    short: {
      headline: "Jordan matches how your staff coaches. He's built for your back line and your film room.",
      summary: "Jordan and his club director tell the same story on every trait. He wants hard, direct coaching with the reason attached, which is how Coach Whitfield works. The one thing to watch is how loud he is when things go wrong.",
      cards: [
        { title: "Plays your system", match: "strong", text: "Steps into midfield and likes building out under pressure." },
        { title: "Takes hard coaching", match: "strong", text: "Wants it on the spot, in front of the group, with the why." },
        { title: "Runs the line", match: "match", text: "Talks all game. Quieter after his own mistakes." },
        { title: "Lives in film", match: "strong", text: "Watches his own clips before he's asked." },
      ],
    },
    sa_summary: "Jordan sees himself the way his club director does. Where he names a weakness, his director names the same one.",
    traits: [
      ["Comfortable stepping into midfield; prefers a high line", "Steps in more than any CB he's coached; wants the ball under pressure", "same_story"],
      ["Wants corrections right away, with the reason", "Fixes it next rep if you tell him why once", "same_story"],
      ["Organizes the back four; quieter after his own errors", "Loudest voice on the line, goes quiet for a few minutes after a mistake", "same_story"],
      ["Strong in the air; working on recovery speed", "Wins first contact; recovery pace is the gap", "same_story"],
      ["Watches his own clips each week", "Asks for film without being told", "same_story"],
      ["Owns mistakes out loud", "First to put his hand up", "same_story"],
      ["Wants a coach who's straight with him, not a friend", "Respects coaches who are direct; doesn't need a lot of check-ins", "same_story"],
      ["Takes school seriously; 3.6 GPA", "Never missed a session for school, never let grades slip", "same_story"],
    ],
    one: [
      ["strong", "Steps in and builds out, as your system asks.", "Steps in more than any CB I've had.", "His instincts already match your shape."],
      ["strong", "Wants it on the spot, with the why.", "Fixes it the next rep.", "Your staff's style is what he asks for."],
      ["match", "Runs the line; quiet after his errors.", "Loudest on the field, dips after a mistake.", "Leads well until he's the one who made the mistake."],
      ["match", "Good in the air; recovery speed is a work-on.", "Wins first contact; pace is the gap.", "Your high line will test his recovery runs."],
      ["strong", "Watches clips weekly.", "Asks for film.", "Will fit your film room on day one."],
      ["strong", "Owns it out loud.", "First to put his hand up.", "Matches your locker room norm exactly."],
      ["strong", "Wants direct coaches, not friends.", "Doesn't need many check-ins.", "Professional distance suits him."],
      ["strong", "3.6 GPA, never misses school.", "Grades never slipped.", "Clears your academic standard."],
    ],
    coaches: {
      "Dana Whitfield": ["strong", ["Direct", "Demanding"], "Jordan will respond well to Coach Whitfield. He asks for corrections in the moment and with the reason, which is how she coaches.", "Give the reason once. He'll fix it in the next rep without more talk."],
      "Marco Ruiz": ["strong", ["Film-first", "Patient"], "He'll get the most out of Coach Ruiz's film sessions. He already watches his own clips and will come with questions.", "Send him clips the night before. He'll show up having watched them twice."],
      "Lee Okafor": ["match", ["Calm", "Mentor"], "Good fit on academics and the long view. He won't seek Coach Okafor out much on his own.", "Check in once early in the semester; he won't ask for help unless you open the door."],
    },
    questions: [
      ["His voice after his own mistake", "Watch the two minutes after Jordan is beaten. Does he keep organizing the line or go quiet?", "Tell me about the last goal you were at fault for. What did you say to your back line right after?", "When Jordan makes a mistake, who organizes the line for the next few minutes?"],
      ["Recovery pace against your high line", "Watch his recovery runs against quick forwards in transition.", "When you play a high line, how do you handle a forward who's quicker than you?", "Has he played a high line against fast forwards? How did it go?"],
    ],
  },
  "e0000000-0000-4000-8000-000000000002": {
    director: true,
    short: {
      headline: "Marcus will work hardest for the coach who gets to know him. That's Coach Ruiz more than Coach Whitfield.",
      summary: "Marcus is steady and physical and his club director backs most of what he says. He wants corrections in private and a coach he trusts first. Your head coach's public style may take time to land.",
      cards: [
        { title: "Steady under pressure", match: "match", text: "Rarely rattled; keeps it simple on the ball." },
        { title: "Wants private feedback", match: "look_closer", text: "Shuts down when corrected in front of the group." },
        { title: "Physically ready", match: "strong", text: "Strong, quick and durable. Ready for your press." },
        { title: "Relationship first", match: "match", text: "Works hardest for coaches who know him." },
      ],
    },
    sa_summary: "Mostly the same story. Marcus sees himself as more vocal than his director does, and says he likes public feedback when his director says he doesn't.",
    traits: [
      ["Prefers to defend deep and keep it simple", "Keeps it simple; not comfortable stepping into midfield yet", "same_story"],
      ["Says he's fine being corrected in front of the team", "Goes quiet for the rest of the session when corrected publicly", "contradiction"],
      ["Sees himself as a vocal leader", "Leads by example; talks when he has to", "look_closer"],
      ["Fast, strong, rarely injured", "Best athlete on the team", "same_story"],
      ["Watches film when the coach sends it", "Watches what he's sent, doesn't ask for more", "same_story"],
      ["Owns his mistakes", "Owns them, but to the coach privately", "look_closer"],
      ["Needs to trust a coach before he goes all in", "Took most of a season to trust me; then all in", "same_story"],
      ["3.2 GPA, wants to study kinesiology", "Solid student", "same_story"],
    ],
    one: [
      ["look_closer", "Keeps it simple; prefers to defend deep.", "Not comfortable stepping in yet.", "Your center backs step into midfield; this is a coaching project."],
      ["gap", "Says public correction is fine.", "Shuts down when corrected publicly.", "Your on-the-spot style is the biggest risk here."],
      ["look_closer", "Sees himself as vocal.", "Leads by example.", "He may not run your line in year one."],
      ["strong", "Fast, strong, durable.", "Best athlete on the team.", "Ready for your press now."],
      ["match", "Watches what he's sent.", "Doesn't ask for more.", "Will do the work if Coach Ruiz assigns it."],
      ["match", "Owns mistakes.", "Privately, to the coach.", "Will own it, just not in front of the group at first."],
      ["look_closer", "Needs to trust a coach first.", "Took a season to trust me.", "Professional distance may slow that down."],
      ["match", "3.2 GPA.", "Solid student.", "Clears your academic standard."],
    ],
    coaches: {
      "Dana Whitfield": ["look_closer", ["Direct", "Demanding"], "Marcus may go quiet under Coach Whitfield's public corrections early on, even though he says he's fine with it.", "Pull him aside for the first few corrections. Go public once he trusts you."],
      "Marco Ruiz": ["strong", ["Film-first", "Patient"], "Coach Ruiz's private, next-morning style is exactly what Marcus responds to.", "Make Coach Ruiz his main point of contact in recruiting."],
      "Lee Okafor": ["match", ["Calm", "Mentor"], "He'll value Coach Okafor's mentoring, especially around his kinesiology plans.", "Talk about his degree plans early. It builds the trust he needs."],
    },
    questions: [
      ["How he takes public correction", "Correct him in front of the group at a camp session. Watch the next ten minutes.", "Tell me about a time a coach called you out in front of the team. What happened after?", "How does he respond when you correct him in front of the group?"],
      ["Comfort stepping into midfield", "Does he step in when the pass is on, or always play safe?", "When you see space in front of you, what do you do with the ball?", "Have you asked him to step into midfield? How did he handle it?"],
    ],
  },
  "e0000000-0000-4000-8000-000000000003": {
    director: false,
    short: {
      headline: "Theo wants a clear role and will own it. Two of your must-haves don't line up yet.",
      summary: "Theo describes himself as a role player who does the job asked. Without his club director's read, we can't check how well that holds. His GPA and club level are below your must-haves.",
      cards: [
        { title: "Owns a role", match: "match", text: "Wants a clear job and sticks to it." },
        { title: "Club level", match: "gap", text: "Regional club, below your listed levels." },
        { title: "Academics", match: "gap", text: "2.9 GPA, under your 3.0." },
        { title: "Director's read", match: "not_covered", text: "Not in yet. Self-awareness is pending." },
      ],
    },
    sa_summary: "His club director hasn't answered yet. Once they do, each trait shows whether their read matches Theo's.",
    traits: [
      ["Plays a disciplined, deep role", null, "not_covered"],
      ["Likes clear instructions before games", null, "not_covered"],
      ["Not a talker; leads by doing the job", null, "not_covered"],
      ["Strong; not the quickest", null, "not_covered"],
      ["Watches film before big games", null, "not_covered"],
      ["Takes responsibility; hard on himself", null, "not_covered"],
      ["Wants a coach who tells him his role plainly", null, "not_covered"],
      ["Says school is a work in progress", null, "not_covered"],
    ],
    one: [
      ["look_closer", "Disciplined, deep role.", null, "Your system asks center backs to step in."],
      ["match", "Wants clear instructions.", null, "Fits your clear standards."],
      ["gap", "Not a talker.", null, "Your center back runs the line."],
      ["look_closer", "Strong, not quick.", null, "Your high line will test him."],
      ["match", "Watches film before big games.", null, "Some film habit to build on."],
      ["match", "Hard on himself.", null, "Owns mistakes; watch that he moves on."],
      ["match", "Wants his role told plainly.", null, "Your direct style suits that."],
      ["gap", "School is a work in progress.", null, "Below your 3.0 standard."],
    ],
    coaches: {
      "Dana Whitfield": ["match", ["Direct", "Demanding"], "Theo likes being told his role plainly, which Coach Whitfield does.", "Spell out his role in one sentence. He'll stick to it."],
      "Marco Ruiz": ["match", ["Film-first", "Patient"], "Will do the film work if it's tied to his specific job.", "Keep clips focused on his role, not the whole back line."],
      "Lee Okafor": ["match", ["Calm", "Mentor"], "Could use Coach Okafor's help on academics.", "Start the academic conversation early and plainly."],
    },
    questions: [
      ["Whether he can run a line", "Does he talk at all when organizing is needed?", "When your back line is out of shape, what do you do?", "Get the club director's read first. It answers most of this."],
      ["Academic plan", "Ask for his transcript and what's changing this year.", "What's your plan for your grades this year?", "Is his GPA trending up?"],
    ],
  },
};

for (const [athlete, d] of Object.entries(READS)) {
  const res = await fetch(`${FN}/vekt-fit-read`, { method: "POST", headers: { "content-type": "application/json", "x-vekt-app-secret": process.env.VEKT_APP_SECRET || "dev-app-secret" }, body: JSON.stringify({ athlete_id: athlete, program_id: PROGRAM, force: true }) });
  const base = await res.json();
  if (!base.report) throw new Error(`no base report for ${athlete}: ${JSON.stringify(base)}`);
  const traits = TRAITS.map((t, i) => ({ trait: t, athlete_says: d.traits[i][0], director_says: d.traits[i][1], verdict: d.traits[i][2] }));
  const report = {
    ...base.report,
    short_answer: d.short,
    self_awareness: { ...level(traits, d.director), summary: d.sa_summary, traits },
    one_to_one: TRAITS.map((t, i) => ({ group: GROUP(t), trait: t, staff_said: STAFF_SAID[i], match: d.one[i][0], athlete_evidence: d.one[i][1], director_evidence: d.one[i][2], note: d.one[i][3] })),
    coaches: Object.entries(d.coaches).map(([name, [match, traits, response, tip]]) => ({ name, title: name === "Dana Whitfield" ? "Head coach" : "Assistant coach", traits, match, response, tip })),
    open_questions: d.questions.map(([title, watch_for, ask_athlete, ask_director]) => ({ title, watch_for, ask_athlete, ask_director })),
  };
  await admin.from("asset_matches").update({ report, fit_narrative: d.short.headline, model: "demo" }).eq("id", base.id);
  console.log(`demo read written: ${d.short.headline.split(" ")[0]} (${report.self_awareness.label})`);
}

// A Side-by-Side of the four center backs (Sam hasn't finished, so shows Pending).
const ids = ["20000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000002", "20000000-0000-4000-8000-000000000003", "20000000-0000-4000-8000-000000000004"];
const { data: [sbs] } = await admin.from("side_by_sides").insert({ program_id: PROGRAM, position: "Center back", recruit_ids: ids, requested_by: "c0000000-0000-4000-8000-000000000001" }).select("id");
await fetch(`${FN}/vekt-fit-read`, { method: "POST", headers: { "content-type": "application/json", "x-vekt-app-secret": process.env.VEKT_APP_SECRET || "dev-app-secret" }, body: JSON.stringify({ side_by_side_id: sbs.id }) });
const { data: [row] } = await admin.from("side_by_sides").select("report").eq("id", sbs.id);
const lines = {
  "Jordan Ellis": "Ready to run your back line now; matches your head coach's style.",
  "Marcus Hill": "Your best athlete of the four; needs private coaching to start.",
  "Theo Brandt": "A disciplined role player; two must-haves don't line up.",
  "Sam Ortiz": "Invited; waiting on a parent's approval.",
};
await admin.from("side_by_sides").update({
  report: {
    ...row.report,
    athletes: row.report.athletes.map((a) => ({ ...a, one_line: lines[a.name] ?? a.one_line })),
    who_first: [
      { need: "A center back who runs the line as a freshman", athletes: ["Jordan Ellis"], why: "He and his director tell the same story, and he already wants your head coach's style." },
      { need: "The best athlete for your press", athletes: ["Marcus Hill"], why: "Physically ready now. Plan on private corrections in year one." },
      { need: "A low-maintenance depth piece", athletes: ["Theo Brandt"], why: "Owns a clear role, but check GPA and club level before going further." },
    ],
    tradeoff: "Jordan is the safer fit with your current staff; Marcus has the higher physical ceiling but needs a different coaching approach from your head coach to get there. Theo is a depth option only if the academic gap closes. Sam's read isn't in yet.",
  },
}).eq("id", sbs.id);
console.log(`demo Side-by-Side: /side-by-side/${sbs.id}`);

// Local sign-ins for the demo accounts (password works only in the dev build).
for (const email of ["dana.whitfield", "marco.ruiz", "alex.mercer", "priya.nand"]) {
  await admin.auth.admin.createUser({ email: `${email}@northfield.example.edu`, password: "demo-password-1", email_confirm: true }).catch(() => null);
}
for (const email of ["jamie.porter", "riley.shaw"]) {
  await admin.auth.admin.createUser({ email: `${email}@lakeshorefc.example.com`, password: "demo-password-1", email_confirm: true }).catch(() => null);
}
console.log("demo sign-in: dana.whitfield@northfield.example.edu / demo-password-1");
console.log("club director sign-in: jamie.porter@lakeshorefc.example.com / demo-password-1");
