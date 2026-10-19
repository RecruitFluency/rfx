// Receives GoHighLevel webhooks (delivery status, email stats, inbound
// replies, STOP/DND) and records them idempotently. Configure in GHL with
// this function's URL plus `?token=<GHL_WEBHOOK_TOKEN>`, or as a marketplace
// app webhook verified by GHL's RSA signature.
import { adminClient, env, json } from '../_shared/admin.ts';
import { normalizeGhlWebhook } from '../_shared/events.ts';
import { verifyGhlWebhook } from '../_shared/signature.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const rawBody = await req.text();
  const url = new URL(req.url);

  const ok = await verifyGhlWebhook({
    rawBody,
    signature: req.headers.get('x-wh-signature'),
    tokenHeader: req.headers.get('x-vekt-webhook-token'),
    tokenQuery: url.searchParams.get('token'),
    publicKeyPem: env('GHL_WEBHOOK_PUBLIC_KEY'),
    sharedToken: env('GHL_WEBHOOK_TOKEN'),
  });
  if (!ok) return json({ error: 'Invalid signature' }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const ev = await normalizeGhlWebhook(payload, rawBody);
  if (!ev) return json({ ignored: true, type: payload.type ?? null });

  const db = adminClient();
  const { data: recorded, error } = await db.rpc('portal_record_message_event', {
    p_provider: 'ghl',
    p_provider_event_id: ev.providerEventId,
    p_event: ev.event,
    p_ghl_message_id: ev.ghlMessageId,
    p_channel: ev.channel,
    p_address: ev.address,
    p_detail: ev.detail,
    p_payload: payload,
    p_occurred_at: ev.occurredAt,
  });
  // A 500 makes GHL retry; the event id keeps the retry idempotent.
  if (error) return json({ error: error.message }, 500);

  // Replies that aren't opt-outs belong to the agent conversation.
  const forwardUrl = env('AGENT_INBOUND_URL');
  if (recorded && ev.inboundBody && forwardUrl) {
    await fetch(forwardUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vekt-forwarded-by': 'portal-ghl-webhook' },
      body: JSON.stringify({ channel: ev.channel, from: ev.address, body: ev.inboundBody, ghl: payload }),
    }).catch((err) => console.error('agent forward failed', err));
  }

  return json({ recorded, event: ev.event });
});
