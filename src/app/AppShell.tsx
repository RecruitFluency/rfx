import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, UploadCloud, ShieldAlert, Users, GraduationCap,
  HeartPulse, Download, Settings, Sparkles, Menu, X,
} from 'lucide-react';
import { isConfigured } from '../lib/supabase';
import { pendingReviewCount } from '../lib/api';
import Assistant from './components/Assistant';

const NAV = [
  { to: '/app', label: 'Command Center', icon: LayoutDashboard, end: true },
  { to: '/app/sync', label: 'Monthly Sync', icon: UploadCloud },
  { to: '/app/review', label: 'Review Queue', icon: ShieldAlert },
  { to: '/app/coaches', label: 'Coaches', icon: Users },
  { to: '/app/programs', label: 'Programs', icon: GraduationCap },
  { to: '/app/health', label: 'Data Health', icon: HeartPulse },
  { to: '/app/export', label: 'Export / App Feed', icon: Download },
  { to: '/app/setup', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const [pending, setPending] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNav(false);
    if (!isConfigured) return;
    pendingReviewCount().then(setPending).catch(() => setPending(0));
  }, [location]);

  return (
    <div className="min-h-screen bg-[#121212] text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-black border-r border-[#2a2a2a] flex flex-col
                    transform transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-6 py-5 border-b border-[#2a2a2a] flex items-center gap-3">
          <img src="/rfx-logo.svg" alt="RFX" className="h-8 w-auto" />
          <div>
            <div className="font-bold tracking-tight leading-tight">RFX</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-widest">Coach Database</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#FF0000]/10 text-[#FF0000]' : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {label === 'Review Queue' && pending > 0 && (
                <span className="bg-[#FF0000] text-white text-xs font-bold rounded-full px-2 py-0.5">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-[#2a2a2a] text-xs text-gray-600">
          {isConfigured ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Database connected
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Database not connected
            </span>
          )}
        </div>
      </aside>
      {mobileNav && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileNav(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#2a2a2a] flex items-center justify-between px-4 lg:px-8 bg-[#121212]/95 sticky top-0 z-20">
          <button className="lg:hidden text-gray-400" onClick={() => setMobileNav(true)} aria-label="Open navigation">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={() => setAssistantOpen(true)}
            className="flex items-center gap-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#FF0000]" />
            Assistant
          </button>
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Assistant slide-out */}
      {assistantOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setAssistantOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[#161616] border-l border-[#2a2a2a] z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 text-[#FF0000]" /> RFX Assistant
              </div>
              <button onClick={() => setAssistantOpen(false)} className="text-gray-500 hover:text-white" aria-label="Close assistant">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Assistant onNavigate={() => setAssistantOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
