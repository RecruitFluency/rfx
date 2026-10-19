// Athlete and club director pages: no login, the private link's token is the key.
import { functionsUrl } from "./supabase";

export async function publicApi<T = any>(action: string, token: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${functionsUrl}/vekt-invites`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, token, ...body }),
  });
  const out = await res.json().catch(() => ({ error: "The server didn't answer. Try again." }));
  if (!res.ok) throw new Error(out.error || "Something went wrong.");
  return out as T;
}
