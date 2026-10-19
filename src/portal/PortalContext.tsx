import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { db, isConfigured } from '../lib/supabase';
import * as api from './lib/api';
import type { Department, Program, Staff, StaffRole } from './lib/types';

interface PortalState {
  loading: boolean;
  session: Session | null;
  staff: Staff | null;
  superAdmin: boolean;
  department: Department | null;
  /** Programs this user can see (RLS-scoped). */
  programs: Program[];
  /** Programs this user can add prospects to and invite from. */
  editablePrograms: Program[];
  /** Program filter chosen in the top bar; null = all visible programs. */
  programId: string | null;
  setProgramId: (id: string | null) => void;
  /** Program ids in scope for lists and dashboards. */
  scopeProgramIds: string[];
  role: StaffRole | 'super_admin' | null;
  can: (action: 'invite' | 'department' | 'compliance' | 'settings') => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<PortalState | null>(null);

export function usePortal(): PortalState {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePortal must be used inside PortalProvider');
  return v;
}

const PROGRAM_KEY = 'vekt-portal-program';

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [department, setDepartment] = useState<Department | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [myProgramIds, setMyProgramIds] = useState<string[]>([]);
  const [programId, setProgramIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(PROGRAM_KEY); } catch { return null; }
  });

  const setProgramId = useCallback((id: string | null) => {
    setProgramIdState(id);
    try {
      if (id) localStorage.setItem(PROGRAM_KEY, id); else localStorage.removeItem(PROGRAM_KEY);
    } catch { /* storage unavailable */ }
  }, []);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setStaff(null); setSuperAdmin(false); setDepartment(null); setPrograms([]); setMyProgramIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [me, sa] = await Promise.all([api.claimStaff(), api.isSuperAdmin()]);
      setStaff(me);
      setSuperAdmin(sa);
      const [depts, progs, mine] = await Promise.all([
        api.listDepartments(), api.listPrograms(), me ? api.myStaffPrograms(me.id) : Promise.resolve([]),
      ]);
      setDepartment(me ? depts.find((d) => d.id === me.department_id) ?? null : depts[0] ?? null);
      setPrograms(progs);
      setMyProgramIds(mine);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }
    db().auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = db().auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') load(s);
      else setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const role: PortalState['role'] = superAdmin ? 'super_admin' : staff?.role ?? null;

  const editablePrograms = useMemo(() => {
    if (superAdmin) return programs;
    if (staff?.role === 'head_coach' || staff?.role === 'assistant_coach') return programs.filter((p) => myProgramIds.includes(p.id));
    return [];
  }, [programs, myProgramIds, staff, superAdmin]);

  const scopeProgramIds = useMemo(() => {
    if (programId && programs.some((p) => p.id === programId)) return [programId];
    return programs.map((p) => p.id);
  }, [programId, programs]);

  const can = useCallback((action: 'invite' | 'department' | 'compliance' | 'settings') => {
    if (superAdmin) return true;
    switch (action) {
      case 'invite': return editablePrograms.length > 0;
      case 'department': return staff?.role === 'dept_admin' || staff?.role === 'compliance';
      case 'compliance': return staff?.role === 'compliance';
      case 'settings': return staff?.role === 'head_coach' || staff?.role === 'assistant_coach';
    }
  }, [superAdmin, editablePrograms, staff]);

  const value: PortalState = {
    loading, session, staff, superAdmin, department, programs, editablePrograms,
    programId: scopeProgramIds.length === 1 && programs.length > 1 ? scopeProgramIds[0] : programId,
    setProgramId, scopeProgramIds, role, can,
    refresh: () => load(session),
    signOut: async () => { await db().auth.signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
