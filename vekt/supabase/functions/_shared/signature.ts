// Webhook authentication. Plain Web Crypto so it runs in Deno and Node.

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < Math.max(ab.length, bb.length); i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/**
 * Agent-service callbacks: `x-vekt-signature` = hex HMAC-SHA256 of
 * `${x-vekt-timestamp}.${rawBody}`, and the timestamp must be within
 * `toleranceSec` of now (default 5 minutes) to stop replays.
 */
export async function verifyAgentSignature(
  secret: string, rawBody: string, timestamp: string | null, signature: string | null,
  nowMs = Date.now(), toleranceSec = 300,
): Promise<boolean> {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > toleranceSec) return false;
  return timingSafeEqual(await hmacSha256Hex(secret, `${timestamp}.${rawBody}`), signature.toLowerCase());
}

/**
 * GoHighLevel marketplace webhooks are signed: `x-wh-signature` is a base64
 * RSA-SHA256 signature of the raw body, checkable with GHL's published public
 * key (PEM). Returns false on any parse/verify problem.
 */
export async function verifyGhlRsaSignature(publicKeyPem: string, rawBody: string, signatureB64: string | null): Promise<boolean> {
  if (!publicKeyPem || !signatureB64) return false;
  try {
    const der = base64ToBytes(publicKeyPem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, ''));
    const key = await crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64ToBytes(signatureB64), enc.encode(rawBody));
  } catch {
    return false;
  }
}

/**
 * A GHL webhook is accepted when it carries a valid RSA signature (marketplace
 * app webhooks) or the shared token we configured on a workflow webhook,
 * passed as `x-vekt-webhook-token` or `?token=`.
 */
export async function verifyGhlWebhook(opts: {
  rawBody: string; signature: string | null; tokenHeader: string | null; tokenQuery: string | null;
  publicKeyPem?: string; sharedToken?: string;
}): Promise<boolean> {
  if (opts.publicKeyPem && await verifyGhlRsaSignature(opts.publicKeyPem, opts.rawBody, opts.signature)) return true;
  const presented = opts.tokenHeader ?? opts.tokenQuery;
  return Boolean(opts.sharedToken && presented && timingSafeEqual(opts.sharedToken, presented));
}
