// vekt-ghl-webhook: delivery and opt-out events from GoHighLevel.
//
// Point GHL webhooks (OutboundMessage, InboundMessage, LCEmailStats, ContactDndUpdate)
// here. Accepted when signed by GHL (x-wh-signature, checked against
// GHL_WEBHOOK_PUBLIC_KEY) or carrying VEKT_GHL_WEBHOOK_TOKEN as x-vekt-webhook-token
// or ?token=.
//
// Each event is matched to the message we sent (by GHL message id) and logged in
// invite_events once (retries dedupe on provider_event_id). STOP, unsubscribes,
// spam complaints and hard bounces add the address to vekt_suppressions and cancel
// anything still queued for it. Reply text is never stored: these are often minors.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizeGhlWebhook } from "../_shared/events.ts";
import { verifyGhlWebhook } from "../_shared/signature.ts";
import { suppressionKey } from "../_shared/format.ts";

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

const digits = (v: string) => v.replace(/\D/g, "").slice(-10);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const raw = await req.text();
  const url = new URL(req.url);
  const ok = await verifyGhlWebhook({
    rawBody: raw, signature: req.headers.get("x-wh-signature"),
    tokenHeader: req.headers.get("x-vekt-webhook-token"), tokenQuery: url.searchParams.get("token"),
    publicKeyPem: Deno.env.get("GHL_WEBHOOK_PUBLIC_KEY") || undefined, sharedToken: Deno.env.get("VEKT_GHL_WEBHOOK_TOKEN") || undefined,
  });
  if (!ok) return json({ error: "Unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Bad JSON" }, 400); }
  const ev = await normalizeGhlWebhook(payload, raw);
  if (!ev) return json({ status: "ignored" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  try {
    // Which message (or, for opt-outs, which recipient) this is about.
    let sent: any = null;
    if (ev.ghlMessageId) {
      const { data } = await supabase.from("vekt_outbox").select("id, comparison_id, recruit_id, recipient_role, channel, to_address").eq("ghl_message_id", ev.ghlMessageId).limit(1);
      sent = data?.[0] ?? null;
    }
    let address = ev.address ?? sent?.to_address ?? null;
    const channel = ev.channel ?? sent?.channel ?? null;
    if (!sent && address && channel) {
      // Match on the last 10 digits for phones: GHL and our rows may format numbers differently.
      const { data } = await supabase.from("vekt_outbox").select("id, comparison_id, recruit_id, recipient_role, channel, to_address")
        .eq("channel", channel).order("created_at", { ascending: false }).limit(200);
      sent = (data || []).find((r: any) => channel === "sms" ? digits(r.to_address) === digits(address!) : r.to_address.toLowerCase() === address!.toLowerCase()) ?? null;
      if (sent) address = sent.to_address;
    }

    const { error: dup } = await supabase.from("invite_events").insert({
      comparison_id: sent?.comparison_id ?? null, recruit_id: sent?.recruit_id ?? null, recipient_role: sent?.recipient_role ?? null,
      channel, status: ev.event, detail: ev.event === "replied" ? "reply received" : (ev.detail ?? "").slice(0, 300),
      recipient: address, outbox_id: sent?.id ?? null, ghl_message_id: ev.ghlMessageId, provider_event_id: ev.providerEventId,
      occurred_at: ev.occurredAt ?? new Date().toISOString(),
    });
    if (dup) {
      if (dup.code === "23505") return json({ status: "duplicate" });
      throw new Error(dup.message);
    }

    if (ev.event === "failed" && sent) await supabase.from("vekt_outbox").update({ status: "failed", last_error: (ev.detail ?? "carrier failure").slice(0, 300) }).eq("id", sent.id);

    const stopReason = ev.event === "opted_out" ? (ev.detail === "Spam complaint" ? "complaint" : channel === "email" ? "unsubscribe" : "stop")
      : ev.event === "bounced" ? "bounce" : null;
    if (stopReason && address && channel) {
      await supabase.from("vekt_suppressions").upsert({ channel, value: suppressionKey(channel, address), reason: stopReason, source: "ghl" }, { onConflict: "channel,value" });
      await supabase.from("vekt_outbox").update({ status: "cancelled", last_error: `recipient ${stopReason}` }).eq("channel", channel).eq("to_address", address).eq("status", "pending");
      if (channel === "sms" && sent?.recruit_id) await supabase.from("comparison_recruits").update({ sms_opt_in: false }).eq("id", sent.recruit_id);
    }
    if (ev.event === "opted_in" && address && channel) {
      // START re-subscribes only after a STOP; bounces and complaints stay blocked.
      await supabase.from("vekt_suppressions").delete().eq("channel", channel).eq("value", suppressionKey(channel, address)).in("reason", ["stop", "unsubscribe"]);
    }
    console.log(`GHL_EVENT ${ev.event} channel=${channel} matched=${sent ? "yes" : "no"}`);
    return json({ status: "ok", event: ev.event, matched: !!sent });
  } catch (e) {
    console.error("GHL_WEBHOOK_ERROR:", (e as Error).message);
    return json({ error: "failed" }, 500);
  }
});
