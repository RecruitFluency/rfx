// The club director's dashboard frame: same sign-in as the coach app, its own nav.
import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useSession } from "../session";
import { Spinner } from "../components/ui";

export default function ClubShell() {
  const { loading, session, club, signOut } = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!club) return <Navigate to="/" replace />;
  const nav = [
    { to: "/director", label: "Club health", end: true },
    { to: "/director/pipeline", label: "Player pipeline" },
    { to: "/director/engagement", label: "Coach engagement" },
    { to: "/director/funnel", label: "Recruiting funnel" },
    { to: "/director/commitments", label: "Commitments" },
    { to: "/director/research", label: "Program research" },
    { to: "/director/roster", label: "Roster & export" },
  ];
  return (
    <div className="min-h-screen flex">
      <aside className={`no-print fixed lg:sticky top-0 inset-y-0 left-0 z-40 w-64 h-screen bg-vekt-black border-r border-white/[0.08] flex flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-6 pt-8 pb-10 flex items-center justify-between">
          <img src="/lockup-white.svg" alt="VEKT" className="h-[22px] w-auto" />
          <button className="lg:hidden text-vekt-grey" onClick={() => setOpen(false)} aria-label="Close menu"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 mb-8">
          <div className="vekt-label mb-2">Club</div>
          <div className="text-white text-sm">{club.club.name}</div>
        </div>
        <nav className="flex-1 px-3 flex flex-col gap-0.5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `px-3 min-h-[40px] flex items-center rounded text-sm ${isActive ? "bg-white/[0.07] text-white" : "text-vekt-grey hover:text-white"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-6 border-t border-white/[0.08]">
          <div className="text-sm text-white">{club.account.first_name} {club.account.last_name}</div>
          <div className="text-xs text-vekt-grey mt-0.5">{club.account.role === "director" ? "Club director" : "Club coach"}</div>
          <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 text-xs text-vekt-grey hover:text-white"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0">
        <div className="no-print lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-vekt-black/95 border-b border-white/[0.08]">
          <img src="/lockup-white.svg" alt="VEKT" className="h-[18px] w-auto" />
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 text-white"><Menu className="w-5 h-5" /></button>
        </div>
        <main className="px-4 sm:px-8 lg:px-12 py-10 lg:py-14 max-w-[1240px]"><Outlet /></main>
      </div>
    </div>
  );
}
