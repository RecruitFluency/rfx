// GoHighLevel (LeadConnector) API v2 client: the portal's messaging engine.
//
// Endpoints and headers follow GHL's v2 API docs (contacts upsert, outbound
// conversation messages). Verify them against the current docs before going
// live: https://highlevel.stoplight.io/docs/integrations
//
// This module is plain TypeScript with no Deno globals so the unit tests can
// run it under Node.

export const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const CONTACTS_VERSION = '2021-07-28';
const CONVERSATIONS_VERSION = '2021-04-15';

export interface UpsertContactInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  tags?: string[];
}

export interface SendMessageInput {
  type: 'SMS' | 'Email';
  contactId: string;
  message: string;
  subject?: string;
  html?: string;
}

export interface GhlClient {
  readonly mode: 'live' | 'mock';
  upsertContact(input: UpsertContactInput): Promise<{ contactId: string }>;
  sendMessage(input: SendMessageInput): Promise<{ messageId: string }>;
  deleteContact(contactId: string): Promise<void>;
}

/** A GHL call failed. `retryable` is true for rate limits, timeouts and 5xx. */
export class GhlError extends Error {
  constructor(message: string, readonly status: number, readonly retryable: boolean) {
    super(message);
    this.name = 'GhlError';
  }
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface LiveGhlOptions {
  token: string;
  locationId: string;
  emailFrom?: string;
  baseUrl?: string;
  fetch?: FetchFn;
  timeoutMs?: number;
}

export class LiveGhlClient implements GhlClient {
  readonly mode = 'live' as const;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(private readonly opts: LiveGhlOptions) {
    if (!opts.token || !opts.locationId) throw new Error('GHL token and location id are required in live mode');
    this.baseUrl = opts.baseUrl ?? GHL_BASE_URL;
    this.fetchFn = opts.fetch ?? ((input, init) => fetch(input, init));
  }

  private async request<T>(method: string, path: string, version: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 15000);
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.opts.token}`,
          Version: version,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new GhlError(`GHL ${method} ${path} failed: ${(err as Error).message}`, 0, true);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      throw new GhlError(`GHL ${method} ${path} returned ${res.status}: ${text.slice(0, 300)}`, res.status, retryable);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  async upsertContact(input: UpsertContactInput): Promise<{ contactId: string }> {
    const data = await this.request<{ contact?: { id?: string } }>('POST', '/contacts/upsert', CONTACTS_VERSION, {
      locationId: this.opts.locationId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
      tags: input.tags,
      source: 'VEKT Coach Portal',
    });
    const contactId = data.contact?.id;
    if (!contactId) throw new GhlError('GHL upsert returned no contact id', 200, false);
    return { contactId };
  }

  async sendMessage(input: SendMessageInput): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = { type: input.type, contactId: input.contactId, message: input.message };
    if (input.type === 'Email') {
      body.subject = input.subject;
      body.html = input.html;
      if (this.opts.emailFrom) body.emailFrom = this.opts.emailFrom;
    }
    const data = await this.request<{ messageId?: string; emailMessageId?: string }>(
      'POST', '/conversations/messages', CONVERSATIONS_VERSION, body);
    const messageId = data.messageId ?? data.emailMessageId;
    if (!messageId) throw new GhlError('GHL send returned no message id', 200, false);
    return { messageId };
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.request('DELETE', `/contacts/${encodeURIComponent(contactId)}`, CONTACTS_VERSION);
  }
}

/**
 * No real sends. Returns stable fake ids and keeps a log of calls so local
 * development and tests can run the whole flow without a GHL account.
 * Numbers or emails listed in `failFor` fail with a non-retryable error.
 */
export class MockGhlClient implements GhlClient {
  readonly mode = 'mock' as const;
  readonly calls: { op: string; input: unknown }[] = [];
  private counter = 0;

  constructor(private readonly failFor: string[] = []) {}

  async upsertContact(input: UpsertContactInput): Promise<{ contactId: string }> {
    this.calls.push({ op: 'upsertContact', input });
    const key = input.phone ?? input.email ?? `anon-${++this.counter}`;
    return { contactId: `mock_contact_${key.replace(/[^a-zA-Z0-9]/g, '')}` };
  }

  async sendMessage(input: SendMessageInput): Promise<{ messageId: string }> {
    this.calls.push({ op: 'sendMessage', input });
    if (this.failFor.some((v) => input.contactId.includes(v.replace(/[^a-zA-Z0-9]/g, '')))) {
      throw new GhlError('Mock carrier rejected this recipient', 400, false);
    }
    return { messageId: `mock_msg_${Date.now().toString(36)}_${++this.counter}` };
  }

  async deleteContact(contactId: string): Promise<void> {
    this.calls.push({ op: 'deleteContact', input: contactId });
  }
}

export function createGhlClient(env: Record<string, string | undefined>, fetchFn?: FetchFn): GhlClient {
  if ((env.GHL_MODE ?? 'mock').toLowerCase() === 'live') {
    return new LiveGhlClient({
      token: env.GHL_PRIVATE_TOKEN ?? '',
      locationId: env.GHL_LOCATION_ID ?? '',
      emailFrom: env.GHL_EMAIL_FROM,
      fetch: fetchFn,
    });
  }
  return new MockGhlClient((env.GHL_MOCK_FAIL_FOR ?? '').split(',').map((s) => s.trim()).filter(Boolean));
}
