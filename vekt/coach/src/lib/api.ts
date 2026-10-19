// Every dashboard call goes to the vekt-coach function with the coach's session.
import { functionsUrl, supabase } from "./supabase";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function api<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Sign in first.", 401);
  const res = await fetch(`${functionsUrl}/vekt-coach`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const out = await res.json().catch(() => ({ error: "The server didn't answer. Try again." }));
  if (!res.ok) throw new ApiError(out.error || "Something went wrong.", res.status);
  return out as T;
}
