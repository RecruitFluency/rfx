// Service-role database access + small HTTP helpers for the portal functions.
// The functions only call Postgres RPCs, so they talk to PostgREST directly
// with fetch instead of pulling in supabase-js (no npm download at boot).
import { timingSafeEqual } from './signature.ts';

export function env(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

export function envRecord(): Record<string, string | undefined> {
  return Deno.env.toObject();
}

export interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface AdminDb {
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>>;
}

export function adminClient(): AdminDb {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return {
    async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
      try {
        const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        const text = await res.text();
        const body = text ? JSON.parse(text) : null;
        if (!res.ok) return { data: null, error: { message: body?.message ?? `${fn} failed with ${res.status}` } };
        return { data: body as T, error: null };
      } catch (err) {
        return { data: null, error: { message: `${fn}: ${(err as Error).message}` } };
      }
    },
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Internal endpoints accept the service-role key or the cron secret. */
export function isInternalCaller(req: Request): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const cron = req.headers.get('x-cron-secret') ?? '';
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const cronSecret = env('PORTAL_CRON_SECRET') ?? '';
  return (serviceKey !== '' && timingSafeEqual(bearer, serviceKey)) || (cronSecret !== '' && timingSafeEqual(cron, cronSecret));
}
