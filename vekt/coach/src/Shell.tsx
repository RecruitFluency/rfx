import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { configured } from "./lib/supabase";
import { useSession } from "./session";
import { Spinner } from "./components/ui";
import { programName, roleLabel } from "./lib/format";

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        <img src="/lockup-white.svg" alt="VEKT" className="h-7 w-auto mb-14" />
        {children}
      </div>
    </div>
  );
}

export default function Shell() {
  const { loading, session, me, meError, club, signOut } = useSession();
  const location = useLocation();
  if (!configured) return <Frame><p className="text-vekt-grey">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the dashboard.</p></Frame>;
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!me && club) return <Navigate to="/director" replace />;
  if (!me) {
    return (
      <Frame>
        <h1 className="vekt-display text-[44px] mb-5">No access yet</h1>
        <p className="text-vekt-grey mb-10">{meError || `${session.user.email} isn't set up for VEKT.`}</p>
        <button onClick={signOut} className="text-white underline underline-offset-4">Sign out</button>
      </Frame>
    );
  }
  return <Layout />;
}

function Layout() {
  const { me, program, setProgramId, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  if (!me) return null;
  const nav = [
    { to: "/", label: "Overview", end: true, show: true },
    { to: "/recruits", label: "Recruits", show: true },
    { to: "/roster", label: "Roster plan", show: true },
    { to: "/side-by-side", label: "Side-by-Side", show: true },
    { to: "/feed", label: "Film feed", show: true },
    { to: "/watch", label: "Watch list", show: true },
    { to: "/activity", label: "Invites & activity", show: true },
    { to: "/program", label: "Staff & must-haves", show: true },
    { to: "/department", label: "Department", show: me.can.department || me.account.role === "compliance" },
    { to: "/compliance", label: "Compliance log", show: me.can.compliance },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen flex">
      <aside className={`no-print fixed lg:sticky top-0 inset-y-0 left-0 z-40 w-64 h-screen bg-vekt-black border-r border-white/[0.08] flex flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-6 pt-8 pb-10 flex items-center justify-between">
          <img src="/lockup-white.svg" alt="VEKT" className="h-[22px] w-auto" />
          <button className="lg:hidden text-vekt-grey" onClick={() => setOpen(false)} aria-label="Close menu"><X className="w-5 h-5" /></button>
        </div>
        {me.programs.length > 0 && (
          <div className="px-6 mb-8">
            <div className="vekt-label mb-2">{me.department?.name ?? program?.institution}</div>
            {me.programs.length > 1 ? (
              <select value={program?.id} onChange={(e) => setProgramId(e.target.value)}
                className="w-full bg-vekt-panel border border-white/[0.16] rounded px-3 min-h-[40px] text-sm text-white">
                {me.programs.map((p) => <option key={p.id} value={p.id}>{programName(p)}</option>)}
              </select>
            ) : <div className="text-white text-sm">{programName(program)}</div>}
          </div>
        )}
        <nav className="flex-1 px-3 flex flex-col gap-0.5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `px-3 min-h-[40px] flex items-center rounded text-sm ${isActive ? "bg-white/[0.07] text-white" : "text-vekt-grey hover:text-white"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-6 border-t border-white/[0.08]">
          <div className="text-sm text-white">{me.account.first_name} {me.account.last_name}</div>
          <div className="text-xs text-vekt-grey mt-0.5">{me.account.title || roleLabel[me.account.role]}</div>
          <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 text-xs text-vekt-grey hover:text-white"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0">
        <div className="no-print lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-vekt-black/95 border-b border-white/[0.08]">
          <img src="/lockup-white.svg" alt="VEKT" className="h-[18px] w-auto" />
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 text-white"><Menu className="w-5 h-5" /></button>
        </div>
        <main className="px-4 sm:px-8 lg:px-12 py-10 lg:py-14 max-w-[1240px]">
          {me.programs.length ? <Outlet /> : <p className="text-vekt-grey">No programs are assigned to you yet. Ask your department admin.</p>}
        </main>
      </div>
    </div>
  );
}
