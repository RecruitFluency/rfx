// Session, the signed-in coach, and the program they're working in.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api, ApiError } from "./lib/api";
import type { Me, Program } from "./lib/types";

interface Ctx {
  loading: boolean; session: Session | null; me: Me | null; meError: string | null;
  program: Program | null; setProgramId: (id: string) => void; reload: () => Promise<void>; signOut: () => Promise<void>;
}
const SessionContext = createContext<Ctx | null>(null);
const KEY = "vekt-coach-program";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [programId, setProgram] = useState<string | null>(read());

  const reload = useCallback(async () => {
    try { setMe(await api<Me>("me")); setMeError(null); }
    catch (e) { setMe(null); setMeError(e instanceof ApiError ? e.message : "Couldn't load your account."); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session === null) { setMe(null); setLoading(false); return; }
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [session?.user.id, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const program = me?.programs.find((p) => p.id === programId) ?? me?.programs[0] ?? null;
  const setProgramId = (id: string) => { setProgram(id); try { localStorage.setItem(KEY, id); } catch { /* private mode */ } };
  const signOut = async () => { await supabase.auth.signOut(); setMe(null); };

  return <SessionContext.Provider value={{ loading, session, me, meError, program, setProgramId, reload, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const c = useContext(SessionContext);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}

/** Load data for the page; re-runs when deps change. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); setError(null); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run]);
  return { data, error, loading, reload: run, setData };
}
