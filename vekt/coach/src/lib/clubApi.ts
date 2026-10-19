// Every club dashboard call goes to the vekt-club function with the director's session.
import { functionsUrl, supabase } from "./supabase";
import { ApiError } from "./api";

export async function clubApi<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Sign in first.", 401);
  const res = await fetch(`${functionsUrl}/vekt-club`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const out = await res.json().catch(() => ({ error: "The server didn't answer. Try again." }));
  if (!res.ok) throw new ApiError(out.error || "Something went wrong.", res.status);
  return out as T;
}

export interface ClubMe {
  account: { id: string; first_name: string; last_name: string; email: string; role: "director" | "coach" };
  club: { id: string; name: string; state: string | null; sports: string[] };
  plan: { free_families: number; families: number; free: boolean } | null;
}

export type StageKey = "not_on_vekt" | "profile" | "seen" | "invited" | "read" | "interested" | "committed";
export interface ClubAthlete {
  id: string; full_name: string; grad_year: number | null; position: string | null; team: string | null; sport: string | null;
  status: "active" | "committed" | "not_pursuing"; committed_program: string | null; committed_division: string | null; committed_at: string | null;
  invited_at: string | null; on_vekt: boolean; pending_parent: boolean; feed_on: boolean;
  stage: StageKey; stage_label: string; programs_engaged: number; views: number; saves: number; invites: number; interested: number;
  top_division: string | null; interested_programs: string[];
}
