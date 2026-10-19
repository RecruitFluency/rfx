import { describe, expect, it } from 'vitest';
import { LiveGhlClient, MockGhlClient, GhlError, createGhlClient } from './ghl.ts';
import { normalizeGhlWebhook } from './events.ts';
import { hmacSha256Hex, verifyAgentSignature, verifyGhlWebhook, verifyGhlRsaSignature, timingSafeEqual } from './signature.ts';
import { splitName, textToHtml } from './format.ts';

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init ?? {} });
    const r = responses.shift() ?? { status: 500, body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
  return { fn, calls };
}

describe('LiveGhlClient', () => {
  it('upserts a contact with the v2 headers and location id', async () => {
    const f = fakeFetch([{ status: 200, body: { contact: { id: 'c_1' } } }]);
    const ghl = new LiveGhlClient({ token: 'tok', locationId: 'loc', fetch: f.fn });
    await expect(ghl.upsertContact({ firstName: 'Ava', phone: '+12025550101', tags: ['vekt'] }))
      .resolves.toEqual({ contactId: 'c_1' });
    const call = f.calls[0];
    expect(call.url).toBe('https://services.leadconnectorhq.com/contacts/upsert');
    expect((call.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect((call.init.headers as Record<string, string>).Version).toBe('2021-07-28');
    expect(JSON.parse(call.init.body as string)).toMatchObject({ locationId: 'loc', phone: '+12025550101', tags: ['vekt'] });
  });

  it('sends SMS and email through conversations/messages', async () => {
    const f = fakeFetch([{ status: 201, body: { messageId: 'm_1' } }, { status: 201, body: { messageId: 'm_2' } }]);
    const ghl = new LiveGhlClient({ token: 't', locationId: 'l', emailFrom: 'invites@getvekt.ai', fetch: f.fn });
    await ghl.sendMessage({ type: 'SMS', contactId: 'c', message: 'hi' });
    await ghl.sendMessage({ type: 'Email', contactId: 'c', message: 'hi', subject: 'S', html: '<p>hi</p>' });
    expect(f.calls[0].url).toBe('https://services.leadconnectorhq.com/conversations/messages');
    expect((f.calls[0].init.headers as Record<string, string>).Version).toBe('2021-04-15');
    expect(JSON.parse(f.calls[0].init.body as string)).toEqual({ type: 'SMS', contactId: 'c', message: 'hi' });
    expect(JSON.parse(f.calls[1].init.body as string)).toMatchObject({ type: 'Email', subject: 'S', emailFrom: 'invites@getvekt.ai' });
  });

  it('marks 429 and 5xx retryable, 4xx not', async () => {
    const ghl = (status: number) => new LiveGhlClient({ token: 't', locationId: 'l', fetch: fakeFetch([{ status, body: {} }]).fn });
    await expect(ghl(429).sendMessage({ type: 'SMS', contactId: 'c', message: 'x' })).rejects.toMatchObject({ retryable: true, status: 429 });
    await expect(ghl(503).sendMessage({ type: 'SMS', contactId: 'c', message: 'x' })).rejects.toMatchObject({ retryable: true });
    await expect(ghl(422).sendMessage({ type: 'SMS', contactId: 'c', message: 'x' })).rejects.toMatchObject({ retryable: false });
  });

  it('treats network errors as retryable', async () => {
    const ghl = new LiveGhlClient({ token: 't', locationId: 'l', fetch: async () => { throw new Error('ECONNRESET'); } });
    const err = await ghl.sendMessage({ type: 'SMS', contactId: 'c', message: 'x' }).catch((e) => e);
    expect(err).toBeInstanceOf(GhlError);
    expect(err.retryable).toBe(true);
  });

  it('refuses to start in live mode without credentials', () => {
    expect(() => createGhlClient({})).toThrow(/token and location/);
  });
});

describe('MockGhlClient', () => {
  it('returns fake ids and can simulate a failing recipient', async () => {
    const ghl = createGhlClient({ mock: true, mockFailFor: '+12025550199' }) as MockGhlClient;
    expect(ghl.mode).toBe('mock');
    const ok = await ghl.upsertContact({ phone: '+12025550101' });
    await expect(ghl.sendMessage({ type: 'SMS', contactId: ok.contactId, message: 'x' })).resolves.toHaveProperty('messageId');
    const bad = await ghl.upsertContact({ phone: '+12025550199' });
    await expect(ghl.sendMessage({ type: 'SMS', contactId: bad.contactId, message: 'x' })).rejects.toMatchObject({ retryable: false });
  });
});

describe('normalizeGhlWebhook', () => {
  const norm = (p: Record<string, unknown>) => normalizeGhlWebhook(p, JSON.stringify(p));

  it('maps inbound STOP to an opt-out for that phone', async () => {
    const ev = await norm({ type: 'InboundMessage', messageType: 'SMS', body: ' Stop ', phone: '+12025550101' });
    expect(ev).toMatchObject({ event: 'opted_out', channel: 'sms', address: '+12025550101' });
  });

  it('maps START to opt back in, and other replies to replied', async () => {
    expect((await norm({ type: 'InboundMessage', messageType: 'SMS', body: 'START', phone: '+1' }))?.event).toBe('opted_in');
    const reply = await norm({ type: 'InboundMessage', messageType: 'SMS', body: 'Sounds good!', phone: '+12025550101' });
    expect(reply).toMatchObject({ event: 'replied', inboundBody: 'Sounds good!' });
  });

  it('maps outbound delivery status by message id', async () => {
    expect(await norm({ type: 'OutboundMessage', messageId: 'm1', status: 'delivered' }))
      .toMatchObject({ event: 'delivered', ghlMessageId: 'm1', providerEventId: 'OutboundMessage:m1:delivered' });
    expect((await norm({ type: 'OutboundMessage', messageId: 'm1', status: 'undelivered' }))?.event).toBe('failed');
    expect(await norm({ type: 'OutboundMessage', messageId: 'm1', status: 'pending' })).toBeNull();
  });

  it('maps email stats, treating complaints and unsubscribes as opt-outs', async () => {
    expect((await norm({ type: 'LCEmailStats', event: 'opened', id: 'e1' }))?.event).toBe('opened');
    expect(await norm({ type: 'LCEmailStats', event: 'complained', id: 'e1', email: 'a@b.com' }))
      .toMatchObject({ event: 'opted_out', channel: 'email', address: 'a@b.com' });
  });

  it('maps DND on to an opt-out and ignores unknown types', async () => {
    expect((await norm({ type: 'ContactDndUpdate', dnd: true, phone: '+12025550101' }))?.event).toBe('opted_out');
    expect(await norm({ type: 'ContactDndUpdate', dnd: false, phone: '+12025550101' })).toBeNull();
    expect(await norm({ type: 'AppointmentCreate' })).toBeNull();
  });

  it('gives identical retries the same event id', async () => {
    const p = { type: 'InboundMessage', messageType: 'SMS', body: 'yes', phone: '+1', dateAdded: '2026-10-19T12:00:00Z' };
    expect((await norm(p))?.providerEventId).toBe((await norm({ ...p }))?.providerEventId);
  });
});

describe('signatures', () => {
  it('verifies agent HMAC signatures and rejects stale or tampered ones', async () => {
    const now = 1_800_000_000_000;
    const ts = String(now / 1000);
    const body = '{"event":"started"}';
    const sig = await hmacSha256Hex('secret', `${ts}.${body}`);
    expect(await verifyAgentSignature('secret', body, ts, sig, now)).toBe(true);
    expect(await verifyAgentSignature('secret', body + ' ', ts, sig, now)).toBe(false);
    expect(await verifyAgentSignature('secret', body, ts, sig, now + 10 * 60 * 1000)).toBe(false);
    expect(await verifyAgentSignature('', body, ts, sig, now)).toBe(false);
  });

  it('verifies GHL RSA signatures', async () => {
    const pair = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true, ['sign', 'verify']);
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
    const pem = `-----BEGIN PUBLIC KEY-----\n${btoa(String.fromCharCode(...spki))}\n-----END PUBLIC KEY-----`;
    const body = '{"type":"OutboundMessage"}';
    const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(body)));
    const sigB64 = btoa(String.fromCharCode(...sig));
    expect(await verifyGhlRsaSignature(pem, body, sigB64)).toBe(true);
    expect(await verifyGhlRsaSignature(pem, body + 'x', sigB64)).toBe(false);
    expect(await verifyGhlRsaSignature(pem, body, 'not-base64!!')).toBe(false);
  });

  it('accepts the shared webhook token from header or query, and nothing else', async () => {
    const base = { rawBody: '{}', signature: null, sharedToken: 'tok-123' };
    expect(await verifyGhlWebhook({ ...base, tokenHeader: 'tok-123', tokenQuery: null })).toBe(true);
    expect(await verifyGhlWebhook({ ...base, tokenHeader: null, tokenQuery: 'tok-123' })).toBe(true);
    expect(await verifyGhlWebhook({ ...base, tokenHeader: 'nope', tokenQuery: null })).toBe(false);
    expect(await verifyGhlWebhook({ ...base, sharedToken: '', tokenHeader: '', tokenQuery: null })).toBe(false);
  });

  it('compares strings in constant time', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('format', () => {
  it('turns text into escaped HTML with links', () => {
    const html = textToHtml('Hi <b>Ava</b>,\n\nStart: https://x.test/s?t=1');
    expect(html).toContain('&lt;b&gt;Ava&lt;/b&gt;');
    expect(html).toContain('<a href="https://x.test/s?t=1">');
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it('splits names for GHL', () => {
    expect(splitName('Mary Ann Smith')).toEqual({ firstName: 'Mary', lastName: 'Ann Smith' });
    expect(splitName('Cher')).toEqual({ firstName: 'Cher', lastName: '' });
  });
});
