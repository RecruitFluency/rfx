// Send worker. Call every minute (Supabase cron → POST this function with the
// cron secret). Each run: create due reminders, claim queued invitations,
// send each through GoHighLevel, and record the outcome. Failures retry with
// exponential backoff inside the database (portal_mark_failed).
import { adminClient, envRecord, env, isInternalCaller, json } from '../_shared/admin.ts';
import { createGhlClient, GhlError } from '../_shared/ghl.ts';
import { splitName, textToHtml } from '../_shared/format.ts';

interface Invitation {
  id: string;
  program_id: string;
  recipient_type: string;
  recipient_name: string;
  to_phone: string | null;
  to_email: string | null;
  channel: 'sms' | 'email';
  rendered_subject: string | null;
  rendered_body: string;
}

const CONCURRENCY = 4;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!isInternalCaller(req)) return json({ error: 'Unauthorized' }, 401);

  const db = adminClient();
  const ghl = createGhlClient(envRecord());
  const autoDeliver = ghl.mode === 'mock' && env('GHL_MOCK_AUTO_DELIVER') === 'true';

  const { data: reminders, error: remErr } = await db.rpc('portal_schedule_reminders');
  if (remErr) return json({ error: `reminders: ${remErr.message}` }, 500);

  const { data, error } = await db.rpc('portal_claim_due_invitations', { p_limit: 50 });
  if (error) return json({ error: `claim: ${error.message}` }, 500);
  const due = (data ?? []) as Invitation[];

  let sent = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  async function sendOne(inv: Invitation) {
    try {
      const { firstName, lastName } = splitName(inv.recipient_name);
      const { contactId } = await ghl.upsertContact({
        firstName, lastName,
        phone: inv.channel === 'sms' ? inv.to_phone : undefined,
        email: inv.channel === 'email' ? inv.to_email : undefined,
        tags: ['vekt-portal', `vekt-${inv.recipient_type}`],
      });
      const { messageId } = inv.channel === 'sms'
        ? await ghl.sendMessage({ type: 'SMS', contactId, message: inv.rendered_body })
        : await ghl.sendMessage({
            type: 'Email', contactId, message: inv.rendered_body,
            subject: inv.rendered_subject ?? 'You were invited to VEKT', html: textToHtml(inv.rendered_body),
          });
      const { error: markErr } = await db.rpc('portal_mark_sent', {
        p_invitation_id: inv.id, p_ghl_contact_id: contactId, p_ghl_message_id: messageId,
      });
      if (markErr) throw new Error(`mark_sent: ${markErr.message}`);
      sent++;
      if (autoDeliver) {
        // Local demo only: pretend the carrier confirmed delivery.
        await db.rpc('portal_record_message_event', {
          p_provider: 'ghl', p_provider_event_id: `mock-delivered:${messageId}`, p_event: 'delivered',
          p_ghl_message_id: messageId,
        });
      }
    } catch (err) {
      failed++;
      const message = (err as Error).message;
      const retryable = err instanceof GhlError ? err.retryable : true;
      errors.push({ id: inv.id, error: message });
      await db.rpc('portal_mark_failed', { p_invitation_id: inv.id, p_error: message, p_retryable: retryable });
    }
  }

  for (let i = 0; i < due.length; i += CONCURRENCY) {
    await Promise.all(due.slice(i, i + CONCURRENCY).map(sendOne));
  }

  return json({ mode: ghl.mode, reminders_created: reminders ?? 0, claimed: due.length, sent, failed, errors });
});
