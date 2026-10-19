// Session, the signed-in coach, and the program they're working in.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api, ApiError } from "./lib/api";
import type { Me, Program } from "./lib/types";
import { clubApi, type ClubMe } from "./lib/clubApi";

interface Ctx {
  loading: boolean; session: Session | null; me: Me | null; meError: string | null;
  club: ClubMe | null; reloadClub: () => Promise<void>;
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
  const [club, setClub] = useState<ClubMe | null>(null);
  // Which user the account data was loaded for; until it matches, we're still loading.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // A sign-in is either a college coach (vekt-coach) or a club director (vekt-club).
  const reloadClub = useCallback(async () => {
    try { setClub(await clubApi<ClubMe>("me")); } catch { setClub(null); }
  }, []);
  const reload = useCallback(async () => {
    try { setMe(await api<Me>("me")); setMeError(null); }
    catch (e) {
      setMe(null); setMeError(e instanceof ApiError ? e.message : "Couldn't load your account.");
      if (e instanceof ApiError && e.status === 403) await reloadClub();
    }
  }, [reloadClub]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session === null) { setMe(null); setClub(null); setLoading(false); return; }
    setLoading(true);
    const uid = session.user.id;
    reload().finally(() => { setLoadedFor(uid); setLoading(false); });
  }, [session?.user.id, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const program = me?.programs.find((p) => p.id === programId) ?? me?.programs[0] ?? null;
  const setProgramId = (id: string) => { setProgram(id); try { localStorage.setItem(KEY, id); } catch { /* private mode */ } };
  const signOut = async () => { await supabase.auth.signOut(); setMe(null); setClub(null); };

  return <SessionContext.Provider value={{ loading: loading || (!!session && loadedFor !== session.user.id), session, me, meError, club, reloadClub, program, setProgramId, reload, signOut }}>{children}</SessionContext.Provider>;
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
