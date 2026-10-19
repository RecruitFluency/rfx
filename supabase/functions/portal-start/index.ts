// The start link in every invitation: /portal-start?t=<token>.
// Marks the invitation clicked, then hands the recipient to the agent
// service (AGENT_START_URL). Until that service is wired in, it shows a
// confirmation page so the flow can be tested end to end.
import { adminClient, env } from '../_shared/admin.ts';

const page = (title: string, body: string, status = 200) =>
  new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · VEKT</title>
<style>body{margin:0;background:#0A0A0A;color:#fff;font:17px/1.6 Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh}
main{max-width:520px;padding:32px 20px;text-align:center}h1{font:900 44px/0.95 Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:-0.01em;margin:0 0 20px}
p{color:#888;margin:0 0 12px}.mark{letter-spacing:.14em;font-weight:800;margin-bottom:40px}</style></head>
<body><main><div class="mark">VEKT</div><h1>${title}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? '';
  if (!/^[0-9a-f]{20,64}$/i.test(token)) return page('Link not valid', '<p>This invitation link is incomplete.</p>', 400);

  const { data, error } = await adminClient().rpc('portal_consume_start_token', { p_token: token });
  if (error) return page('Something went wrong', '<p>Please try the link again in a minute.</p>', 500);
  if (!data?.ok) {
    const msg = data?.reason === 'expired'
      ? 'This invitation has expired. Ask the coaching staff to send a new one.'
      : 'This invitation is no longer active.';
    return page('Link not active', `<p>${msg}</p>`, 410);
  }

  const startUrl = env('AGENT_START_URL');
  if (startUrl) {
    const next = new URL(startUrl);
    next.searchParams.set('invitation_id', data.invitation_id);
    next.searchParams.set('recipient_type', data.recipient_type);
    return Response.redirect(next.toString(), 302);
  }

  if (data.recipient_type === 'guardian') {
    return page('Parent / guardian consent',
      '<p>VEKT asks a parent or guardian to agree before a conversation with an athlete under 18 begins.</p><p>The consent step opens here once the agent service is connected.</p>');
  }
  if (data.recipient_type === 'club_contact') {
    return page('Thanks for your read', '<p>The Director Agent will text you shortly. Your answers stay confidential: the college staff only ever sees VEKT\'s overall read.</p>');
  }
  return page("You're in", '<p>Pulse, VEKT\'s athlete agent, will text you shortly. It\'s a short conversation about how you play and train.</p>');
});
