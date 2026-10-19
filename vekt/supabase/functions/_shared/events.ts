// Normalizes GoHighLevel webhook payloads into VEKT delivery events.
//
// GHL sends different shapes per webhook type. The fields read here follow
// GHL's webhook docs (InboundMessage, OutboundMessage, LCEmailStats,
// ContactDndUpdate); unknown shapes are ignored rather than guessed at.

export type DeliveryEvent =
  | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'replied' | 'opted_out' | 'opted_in';

export interface NormalizedEvent {
  providerEventId: string;
  event: DeliveryEvent;
  ghlMessageId: string | null;
  channel: 'sms' | 'email' | null;
  address: string | null;
  detail: string | null;
  occurredAt: string | null;
  /** Inbound text that isn't an opt-out; forwarded to the agent service. */
  inboundBody?: string;
}

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT']);
const START_WORDS = new Set(['START', 'UNSTOP']);

type Payload = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

function channelOf(p: Payload): 'sms' | 'email' | null {
  const t = (str(p.messageType) ?? str(p.channel) ?? '').toUpperCase();
  if (t.includes('SMS') || t === 'TYPE_SMS') return 'sms';
  if (t.includes('EMAIL')) return 'email';
  return null;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Maps one GHL webhook body to zero or one delivery events. */
export async function normalizeGhlWebhook(p: Payload, rawBody: string): Promise<NormalizedEvent | null> {
  const type = str(p.type) ?? '';
  // Prefer GHL's own delivery id; fall back to a hash of the exact body so
  // retried deliveries of the same webhook dedupe.
  const providerEventId = str(p.webhookId) ?? `${type}:${await sha256Hex(rawBody)}`;
  const occurredAt = str(p.dateAdded) ?? str(p.timestamp) ?? null;

  if (type === 'InboundMessage') {
    const channel = channelOf(p) ?? 'sms';
    const body = str(p.body) ?? '';
    const word = body.toUpperCase().replace(/[^A-Z]/g, '');
    const address = channel === 'email' ? str(p.from) ?? str(p.email) : str(p.phone) ?? str(p.from);
    const event: DeliveryEvent = STOP_WORDS.has(word) ? 'opted_out' : START_WORDS.has(word) ? 'opted_in' : 'replied';
    return {
      providerEventId, event, ghlMessageId: null, channel, address,
      detail: event === 'replied' ? null : body.slice(0, 40), occurredAt,
      inboundBody: event === 'replied' ? body : undefined,
    };
  }

  if (type === 'OutboundMessage') {
    const status = (str(p.status) ?? '').toLowerCase();
    const map: Record<string, DeliveryEvent> = {
      sent: 'sent', delivered: 'delivered', read: 'delivered',
      failed: 'failed', undelivered: 'failed', bounced: 'bounced',
    };
    const event = map[status];
    if (!event) return null;
    return {
      providerEventId: str(p.webhookId) ?? `${type}:${str(p.messageId)}:${status}`,
      event, ghlMessageId: str(p.messageId), channel: channelOf(p), address: null,
      detail: str(p.error) ?? str(p.errorMessage), occurredAt,
    };
  }

  if (type === 'LCEmailStats') {
    const ev = (str(p.event) ?? '').toLowerCase();
    const map: Record<string, DeliveryEvent> = {
      delivered: 'delivered', opened: 'opened', clicked: 'clicked', bounced: 'bounced',
      failed: 'failed', complained: 'opted_out', unsubscribed: 'opted_out',
    };
    const event = map[ev];
    if (!event) return null;
    const messageId = str(p.messageId) ?? str(p.emailMessageId) ?? str(p.id);
    return {
      providerEventId: str(p.webhookId) ?? `${type}:${messageId}:${ev}`,
      event, ghlMessageId: messageId, channel: 'email', address: str(p.email) ?? str(p.recipient),
      detail: ev === 'complained' ? 'Spam complaint' : str(p.reason), occurredAt,
    };
  }

  if (type === 'ContactDndUpdate') {
    const dnd = p.dnd === true || p.dnd === 'true';
    if (!dnd) return null;
    const phone = str(p.phone);
    return {
      providerEventId, event: 'opted_out', ghlMessageId: null,
      channel: phone ? 'sms' : 'email', address: phone ?? str(p.email), detail: 'DND enabled in GoHighLevel', occurredAt,
    };
  }

  return null;
}
