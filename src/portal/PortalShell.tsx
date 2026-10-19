import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { isConfigured } from '../lib/supabase';
import { PortalProvider, usePortal } from './PortalContext';
import { Spinner } from './components/ui';
import { programName, roleLabel } from './lib/format';
import * as api from './lib/api';
import type { Notification } from './lib/types';

export default function PortalShell() {
  return (
    <PortalProvider>
      <Gate />
    </PortalProvider>
  );
}

function Gate() {
  const { loading, session, staff, superAdmin, signOut } = usePortal();
  const location = useLocation();

  if (!isConfigured) {
    return (
      <Frame>
        <p className="text-vekt-grey">The portal isn't connected to a database yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
      </Frame>
    );
  }
  if (loading) return <div className="min-h-screen bg-vekt-black font-geist"><Spinner /></div>;
  if (!session) return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />;
  if (!staff && !superAdmin) {
    return (
      <Frame>
        <h1 className="vekt-display text-[40px] text-white mb-4">No access yet</h1>
        <p className="text-vekt-grey mb-8">
          {session.user.email} isn't on a VEKT staff list. Ask your athletic department to add you, then sign in again.
        </p>
        <button onClick={signOut} className="text-white underline">Sign out</button>
      </Frame>
    );
  }
  return <Layout />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-vekt-black font-geist flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <img src="/vekt/vekt-lockup-white.svg" alt="VEKT" className="h-[30px] w-auto mb-12" />
        {children}
      </div>
    </div>
  );
}

function Layout() {
  const { staff, superAdmin, department, programs, programId, setProgramId, can, signOut } = usePortal();
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileNav(false), [location.pathname]);

  const nav = [
    { to: '/portal', label: 'Dashboard', end: true, show: true },
    { to: '/portal/prospects', label: 'Prospects', show: true },
    { to: '/portal/invitations', label: 'Invitations', show: true },
    { to: '/portal/import', label: 'Import', show: can('invite') },
    { to: '/portal/department', label: 'Department', show: can('department') },
    { to: '/portal/compliance', label: 'Compliance', show: can('compliance') },
    { to: '/portal/settings', label: 'Program settings', show: can('settings') },
  ].filter((n) => n.show);

  const who = superAdmin && !staff ? 'VEKT admin' : `${staff?.first_name} ${staff?.last_name}`;
  const roleText = superAdmin && !staff ? 'Super admin' : staff ? roleLabel[staff.role] : '';

  return (
    <div className="min-h-screen bg-vekt-black text-white font-geist flex">
      <aside className={`fixed lg:sticky top-0 inset-y-0 left-0 z-40 w-64 h-screen bg-vekt-black border-r border-white/[0.08] flex flex-col
                         transform transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 pt-7 pb-8 flex items-center justify-between">
          <Link to="/portal" aria-label="VEKT Coach Portal home"><img src="/vekt/vekt-lockup-white.svg" alt="VEKT" className="h-[30px] w-auto" /></Link>
          <button className="lg:hidden p-2 text-vekt-grey" onClick={() => setMobileNav(false)} aria-label="Close menu"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 mb-6">
          <div className="vekt-label">Coach Portal</div>
          <div className="text-sm text-white mt-2 leading-snug">{department?.name ?? 'All departments'}</div>
          {department && <div className="text-xs text-vekt-grey">{department.division}</div>}
        </div>
        <nav className="flex-1 px-3 space-y-0.5" aria-label="Portal">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex items-center px-3 min-h-[44px] rounded text-[15px] transition-colors ${
                isActive ? 'text-white bg-white/[0.06]' : 'text-vekt-grey hover:text-white'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-white/[0.08]">
          <div className="text-sm text-white truncate">{who}</div>
          <div className="text-xs text-vekt-grey mb-3">{roleText}</div>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-xs text-vekt-grey hover:text-white min-h-[32px]">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>
      {mobileNav && <div className="fixed inset-0 bg-black/70 z-30 lg:hidden" onClick={() => setMobileNav(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-vekt-black/95 backdrop-blur border-b border-white/[0.08]">
          <div className="flex items-center gap-4 px-4 sm:px-8 h-16">
            <button className="lg:hidden p-2 -ml-2 text-white" onClick={() => setMobileNav(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            {programs.length > 1 && (
              <label className="flex items-center gap-3">
                <span className="vekt-label hidden sm:inline">Program</span>
                <select value={programId ?? ''} onChange={(e) => setProgramId(e.target.value || null)}
                  className="bg-vekt-black border border-white/[0.16] rounded px-3 h-10 text-sm text-white focus:outline-none focus:border-white/60">
                  <option value="">All programs</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{programName(p)}</option>)}
                </select>
              </label>
            )}
            {programs.length === 1 && <span className="text-sm text-white">{programName(programs[0])}</span>}
            <div className="flex-1" />
            <Notifications />
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-8 py-10 max-w-[1280px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const navigate = useNavigate();
  useEffect(() => { api.listNotifications().then(setItems).catch(() => setItems([])); }, []);
  const unread = items.filter((n) => !n.read_at);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open && unread.length) {
      api.markNotificationsRead(unread.map((n) => n.id)).catch(() => undefined);
      setItems((xs) => xs.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  };

  return (
    <div className="relative">
      <button onClick={toggle} aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ''}`}
        className="relative p-2 text-vekt-grey hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
        <Bell className="w-5 h-5" />
        {unread.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-vekt-panel border border-white/[0.1] rounded-lg shadow-2xl z-30">
          <div className="px-4 py-3 border-b border-white/[0.08] vekt-label">Notifications</div>
          {items.length === 0 && <p className="px-4 py-6 text-sm text-vekt-grey">Nothing yet.</p>}
          {items.map((n) => (
            <button key={n.id} onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
              className="block w-full text-left px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.04]">
              <div className="text-sm text-white">{n.title}</div>
              {n.body && <div className="text-xs text-vekt-grey mt-0.5">{n.body}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
