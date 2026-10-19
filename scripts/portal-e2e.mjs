// End-to-end check of the Coach Portal flow against a local Supabase stack
// (`npx supabase start`, then `npx supabase db reset`). Run: npm run test:e2e
//
//   coach signs in → queues email invites (athlete + club director)
//   → portal-dispatch sends them (mock GHL) → GHL webhooks: delivered, STOP
//   → start link clicked → agent: started, brief_ready → coach reads brief
//   and can never read the raw transcript.
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const API = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CRON = process.env.PORTAL_CRON_SECRET ?? 'local-cron-secret';
const GHL_TOKEN = process.env.GHL_WEBHOOK_TOKEN ?? 'local-ghl-webhook-token';
const AGENT_SECRET = process.env.AGENT_WEBHOOK_SECRET ?? 'local-agent-secret';
const FN = `${API}/functions/v1`;

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures++;
};

const admin = createClient(API, SERVICE, { auth: { persistSession: false } });
const coach = createClient(API, ANON, { auth: { persistSession: false } });

// Prospect #19 from the seed: Men's Soccer, class of 2028 (contact window open), minor with guardian details.
const PROSPECT = '40000000-0000-4000-a000-000000000019';

const { error: loginErr } = await coach.auth.signInWithPassword({ email: 'coach.reyes@harborstate.edu', password: 'vekt-demo-2026' });
check(!loginErr, 'Head coach signs in');
await coach.rpc('portal_claim_staff');

// Link a club director so the director invite has someone to go to.
await admin.from('portal_prospect_club_contacts').upsert({ prospect_id: PROSPECT, club_contact_id: '50000000-0000-4000-a000-000000000001' });

const { data: queued, error: qErr } = await coach.rpc('portal_queue_invitations', {
  p_prospect_ids: [PROSPECT], p_channels: ['email'], p_include_athlete: true, p_include_club: true,
  p_personal_note: 'Loved your game at the showcase.',
});
check(!qErr, `Coach queues invitations${qErr ? `: ${qErr.message}` : ''}`);
check(queued?.queued === 3, `Athlete, guardian copy and club director are queued (got ${queued?.queued}, blocked ${queued?.blocked})`);

const dispatch = await fetch(`${FN}/portal-dispatch`, { method: 'POST', headers: { 'x-cron-secret': CRON } }).then((r) => r.json());
check(dispatch.sent >= 3, `Dispatcher sends through mock GHL (sent ${dispatch.sent}, mode ${dispatch.mode})`);

const { data: invs } = await admin.from('portal_invitations').select('*').eq('prospect_id', PROSPECT).order('created_at');
const athlete = invs.find((i) => i.recipient_type === 'athlete');
const director = invs.find((i) => i.recipient_type === 'club_contact' && i.status !== 'blocked');
check(athlete?.status === 'delivered', `Athlete invite delivered (status ${athlete?.status})`);
check(athlete?.rendered_body.includes('Loved your game at the showcase.'), 'Personal note is in the sent message');

// GHL webhook: wrong token is rejected; email open is recorded once.
const badHook = await fetch(`${FN}/portal-ghl-webhook?token=wrong`, { method: 'POST', body: '{}' });
check(badHook.status === 401, 'Webhook with a bad token is rejected');
const openEvt = { type: 'LCEmailStats', event: 'clicked', id: athlete.ghl_message_id, webhookId: `wh-${Date.now()}` };
const hook1 = await fetch(`${FN}/portal-ghl-webhook?token=${GHL_TOKEN}`, { method: 'POST', body: JSON.stringify(openEvt) }).then((r) => r.json());
const hook2 = await fetch(`${FN}/portal-ghl-webhook?token=${GHL_TOKEN}`, { method: 'POST', body: JSON.stringify(openEvt) }).then((r) => r.json());
check(hook1.recorded === true && hook2.recorded === false, 'Duplicate webhook delivery is ignored');

// Start link.
const start = await fetch(`${FN}/portal-start?t=${athlete.start_token}`, { redirect: 'manual' });
check(start.status === 200 && (await start.text()).includes("You're in"), 'Start link opens and confirms');

// Agent callbacks (HMAC-signed).
async function agent(body) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', AGENT_SECRET).update(`${ts}.${raw}`).digest('hex');
  return fetch(`${FN}/portal-agent-webhook`, {
    method: 'POST', body: raw, headers: { 'x-vekt-timestamp': ts, 'x-vekt-signature': sig },
  });
}
const unsigned = await fetch(`${FN}/portal-agent-webhook`, { method: 'POST', body: '{}' });
check(unsigned.status === 401, 'Unsigned agent callback is rejected');
check((await agent({ event_id: `a1-${Date.now()}`, invitation_id: athlete.id, event: 'started' })).ok, 'Agent reports athlete conversation started');
check((await agent({ event_id: `d1-${Date.now()}`, invitation_id: director.id, event: 'completed' })).ok, 'Agent reports director read complete');
const briefRes = await agent({
  event_id: `b1-${Date.now()}`, invitation_id: athlete.id, event: 'brief_ready',
  brief: { plays: 'Reads the game early.', takes_coaching: 'Responds to direct feedback.', locker_room: 'Steady.',
           against_staff: 'Good match for a demanding staff.', summary: 'Strong fit.' },
});
check(briefRes.ok, 'Agent delivers the brief');

const { data: read } = await coach.from('portal_reads').select('*').eq('prospect_id', PROSPECT).single();
check(read?.brief_status === 'ready' && read?.director_status === 'complete', 'Coach sees brief ready and director read complete');
const { data: briefs } = await coach.from('portal_briefs').select('summary').eq('prospect_id', PROSPECT);
check(briefs?.[0]?.summary === 'Strong fit.', 'Coach can read the synthesized brief');
const { data: transcripts } = await coach.from('portal_agent_transcripts').select('*');
check((transcripts ?? []).length === 0, 'Coach cannot read raw transcripts');

// STOP from the director's phone via GHL inbound webhook.
await fetch(`${FN}/portal-ghl-webhook?token=${GHL_TOKEN}`, {
  method: 'POST',
  body: JSON.stringify({ type: 'InboundMessage', messageType: 'SMS', body: 'STOP', phone: '+12015550190', webhookId: `stop-${Date.now()}` }),
});
const again = await coach.rpc('portal_queue_invitations', {
  p_prospect_ids: [PROSPECT], p_channels: ['sms'], p_include_athlete: false, p_include_club: true, p_force: true,
});
check(again.data?.results?.find((r) => r.to === '+12015550190')?.reason === 'Recipient has opted out', 'After STOP, that number can no longer be invited');

const { data: notes } = await coach.from('portal_notifications').select('title').eq('kind', 'brief_ready');
check((notes ?? []).length >= 1, 'Coach gets a brief-ready notification');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll end-to-end checks passed');
process.exit(failures ? 1 : 0);
