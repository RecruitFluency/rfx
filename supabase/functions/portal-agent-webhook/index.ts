// Callbacks from the VEKT agent service (Pulse / Director Agent):
//   { "event_id": "...", "invitation_id": "...", "event": "started" | "completed" | "brief_ready",
//     "brief": { "plays", "takes_coaching", "locker_room", "against_staff", "summary" } }
// Signed with HMAC-SHA256 (see verifyAgentSignature). The brief is the only
// conversation-derived data that ever reaches coaches.
import { adminClient, env, json } from '../_shared/admin.ts';
import { verifyAgentSignature } from '../_shared/signature.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const rawBody = await req.text();
  const valid = await verifyAgentSignature(
    env('AGENT_WEBHOOK_SECRET') ?? '', rawBody,
    req.headers.get('x-vekt-timestamp'), req.headers.get('x-vekt-signature'));
  if (!valid) return json({ error: 'Invalid signature' }, 401);

  let body: { event_id?: string; invitation_id?: string; event?: string; brief?: Record<string, string> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body.event_id || !body.invitation_id || !body.event) {
    return json({ error: 'event_id, invitation_id and event are required' }, 400);
  }
  if (body.event === 'brief_ready' && !body.brief) return json({ error: 'brief is required for brief_ready' }, 400);

  const { data, error } = await adminClient().rpc('portal_record_agent_event', {
    p_event_id: body.event_id, p_invitation_id: body.invitation_id, p_event: body.event, p_brief: body.brief ?? null,
  });
  if (error) return json({ error: error.message }, 400);
  return json({ recorded: data });
});
